import argparse
import json
import os
import re
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from functools import lru_cache
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit, urlunsplit

import requests
from dotenv import load_dotenv


REGISTRATION_TABLES = ("event_registrations", "program_registrations")
SYNC_STATUS_PENDING = "pending"
SYNC_STATUS_SYNCED = "synced"
SYNC_STATUS_FAILED = "failed"
SYNC_STATUS_SKIPPED = "skipped"

EMAIL_TITLE_HINTS = ("email", "e-mail", "e mail", "gmail")
NAME_TITLE_HINTS = ("name", "full name", "first name", "last name", "pangalan")
CONTACT_TITLE_HINTS = ("contact", "contact number", "phone", "mobile", "cell", "cp number", "number")
MUNICIPALITY_TITLE_HINTS = ("municipality", "city", "town", "munisipyo")
BARANGAY_TITLE_HINTS = ("barangay", "brgy", "village")


@dataclass
class EntryMapping:
  email_entry_id: str | None
  name_entry_id: str | None
  contact_entry_id: str | None
  municipality_entry_id: str | None
  barangay_entry_id: str | None


@dataclass
class WorkerConfig:
  supabase_url: str
  supabase_service_role_key: str
  poll_seconds: int
  batch_size: int
  request_timeout: int


def get_config() -> WorkerConfig:
  worker_dir = Path(__file__).resolve().parent
  project_root = worker_dir.parent
  load_dotenv(project_root / ".env")
  load_dotenv(worker_dir / ".env")

  supabase_url = (
    os.getenv("SUPABASE_URL", "").strip()
    or os.getenv("VITE_SUPABASE_URL", "").strip()
  ).rstrip("/")
  service_key = (
    os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
    or os.getenv("SUPABASE_SERVICE_KEY", "").strip()
  )
  poll_seconds = int(os.getenv("SYNC_POLL_SECONDS", "5"))
  batch_size = int(os.getenv("SYNC_BATCH_SIZE", "30"))
  request_timeout = int(os.getenv("SYNC_REQUEST_TIMEOUT_SECONDS", "20"))

  if not supabase_url or not service_key:
    raise RuntimeError(
      "Missing Supabase environment variables. "
      "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    )

  return WorkerConfig(
    supabase_url=supabase_url,
    supabase_service_role_key=service_key,
    poll_seconds=max(1, poll_seconds),
    batch_size=max(1, min(200, batch_size)),
    request_timeout=max(5, request_timeout),
  )


class SupabaseRestClient:
  def __init__(self, config: WorkerConfig):
    self.base_url = f"{config.supabase_url}/rest/v1"
    self.timeout = config.request_timeout
    self.headers = {
      "apikey": config.supabase_service_role_key,
      "Authorization": f"Bearer {config.supabase_service_role_key}",
      "Content-Type": "application/json",
    }
    self._parent_cache: dict[str, dict[str, Any]] = {}

  def clear_parent_cache(self) -> None:
    self._parent_cache.clear()

  def list_pending_registrations(self, table_name: str, limit: int) -> list[dict[str, Any]]:
    parent_field = "event_id" if table_name == "event_registrations" else "program_id"
    response = requests.get(
      f"{self.base_url}/{table_name}",
      headers=self.headers,
      params={
        "select": (
          f"id,{parent_field},full_name,email,contact_number,municipality,barangay_id,barangays(name),"
          "source,registered_at,gform_sync_status"
        ),
        "gform_sync_status": f"eq.{SYNC_STATUS_PENDING}",
        "order": "registered_at.asc",
        "limit": str(limit),
      },
      timeout=self.timeout,
    )
    response.raise_for_status()
    return response.json()

  def get_parent_record(self, kind: str, record_id: str) -> dict[str, Any]:
    cache_key = f"{kind}:{record_id}"
    if cache_key in self._parent_cache:
      return self._parent_cache[cache_key]

    table_name = "events" if kind == "event" else "programs"
    response = requests.get(
      f"{self.base_url}/{table_name}",
      headers=self.headers,
      params={
        "select": (
          "id,title,external_attendance_enabled,registration_form_url,"
          "gform_response_url,gform_email_entry_id,gform_name_entry_id"
        ),
        "id": f"eq.{record_id}",
        "limit": "1",
      },
      timeout=self.timeout,
    )
    response.raise_for_status()
    rows = response.json()
    row = rows[0] if rows else {}
    self._parent_cache[cache_key] = row
    return row

  def update_parent_form_fields(
    self,
    kind: str,
    record_id: str,
    *,
    gform_response_url: str | None,
    gform_email_entry_id: str | None,
    gform_name_entry_id: str | None,
  ) -> None:
    table_name = "events" if kind == "event" else "programs"
    payload = {
      "gform_response_url": gform_response_url,
      "gform_email_entry_id": gform_email_entry_id,
      "gform_name_entry_id": gform_name_entry_id,
    }
    response = requests.patch(
      f"{self.base_url}/{table_name}",
      headers=self.headers,
      params={"id": f"eq.{record_id}"},
      json=payload,
      timeout=self.timeout,
    )
    response.raise_for_status()

    cache_key = f"{kind}:{record_id}"
    if cache_key in self._parent_cache:
      self._parent_cache[cache_key].update(payload)

  def mark_status(self, table_name: str, row_id: str, status: str, error: str | None = None) -> None:
    payload: dict[str, Any] = {
      "gform_sync_status": status,
      "gform_sync_error": error,
      "gform_synced_at": datetime.now(timezone.utc).isoformat() if status == SYNC_STATUS_SYNCED else None,
    }
    response = requests.patch(
      f"{self.base_url}/{table_name}",
      headers=self.headers,
      params={"id": f"eq.{row_id}"},
      json=payload,
      timeout=self.timeout,
    )
    response.raise_for_status()

  def mark_status_best_effort(self, table_name: str, row_id: str, status: str, error: str | None = None) -> None:
    try:
      self.mark_status(table_name, row_id, status, error)
    except Exception as mark_error:
      print(f"[WARN] failed to mark {table_name}:{row_id} as {status}: {mark_error}")


def normalize_entry_id(raw_entry_id: str) -> str:
  normalized = raw_entry_id.strip()
  if not normalized:
    raise RuntimeError("Missing Google Form entry id.")
  return normalized if normalized.startswith("entry.") else f"entry.{normalized}"


def normalize_entry_id_optional(raw_entry_id: Any) -> str | None:
  normalized = str(raw_entry_id or "").strip()
  if not normalized:
    return None
  return normalize_entry_id(normalized)


@lru_cache(maxsize=256)
def resolve_forms_gle_redirect(url: str) -> str:
  response = requests.get(url, timeout=20, allow_redirects=True)
  response.raise_for_status()
  return response.url


def normalize_gform_response_url(url: str) -> str:
  raw = (url or "").strip()
  if not raw:
    raise RuntimeError("Missing Google Form URL.")

  if "forms.gle/" in raw:
    raw = resolve_forms_gle_redirect(raw)

  parsed = urlsplit(raw)
  if parsed.hostname != "docs.google.com" or "/forms/" not in parsed.path:
    raise RuntimeError(f"Invalid Google Form URL: {raw}")

  path = parsed.path.rstrip("/")
  if path.endswith("/viewform"):
    path = path[: -len("/viewform")]
  elif path.endswith("/edit"):
    path = path[: -len("/edit")]
  elif path.endswith("/formResponse"):
    path = path[: -len("/formResponse")]

  path = f"{path}/formResponse"
  return urlunsplit((parsed.scheme, parsed.netloc, path, "", ""))


@lru_cache(maxsize=256)
def get_form_entry_catalog(response_url: str) -> list[tuple[str, str]]:
  view_url = normalize_gform_response_url(response_url).replace("/formResponse", "/viewform")
  response = requests.get(view_url, timeout=20)
  response.raise_for_status()

  match = re.search(r"FB_PUBLIC_LOAD_DATA_\s*=\s*(\[.*?\]);</script>", response.text, re.S)
  if not match:
    return []

  try:
    data = json.loads(match.group(1))
  except json.JSONDecodeError:
    return []

  questions: list[Any] = []
  if (
    isinstance(data, list)
    and len(data) > 1
    and isinstance(data[1], list)
    and len(data[1]) > 1
    and isinstance(data[1][1], list)
  ):
    questions = data[1][1]

  entries: dict[str, str] = {}
  for question in questions:
    if not isinstance(question, list):
      continue

    title_raw = question[1] if len(question) > 1 else None
    title = str(title_raw).strip() if title_raw else "Untitled question"
    field_sets = question[4] if len(question) > 4 else None
    if not isinstance(field_sets, list):
      continue

    for field in field_sets:
      if not isinstance(field, list) or not field:
        continue
      raw_id = field[0]
      if raw_id is None:
        continue
      entry_id = normalize_entry_id(str(raw_id))
      entries[entry_id] = title

  return list(entries.items())


def find_entry_by_title(
  entry_catalog: list[tuple[str, str]],
  title_hints: tuple[str, ...],
  used_entry_ids: set[str],
) -> str | None:
  for entry_id, title in entry_catalog:
    if entry_id in used_entry_ids:
      continue

    normalized_title = re.sub(r"\s+", " ", title.strip().lower())
    if any(hint in normalized_title for hint in title_hints):
      return entry_id
  return None


def resolve_entry_mapping(
  response_url: str,
  configured_email_entry_id: Any,
  configured_name_entry_id: Any,
) -> EntryMapping:
  entry_catalog = get_form_entry_catalog(response_url)

  resolved_email_entry_id = normalize_entry_id_optional(configured_email_entry_id)
  resolved_name_entry_id = normalize_entry_id_optional(configured_name_entry_id)
  resolved_contact_entry_id: str | None = None
  resolved_municipality_entry_id: str | None = None
  resolved_barangay_entry_id: str | None = None

  if not entry_catalog:
    return EntryMapping(
      email_entry_id=resolved_email_entry_id,
      name_entry_id=resolved_name_entry_id,
      contact_entry_id=None,
      municipality_entry_id=None,
      barangay_entry_id=None,
    )

  available_ids = {entry_id for entry_id, _ in entry_catalog}
  if resolved_email_entry_id and resolved_email_entry_id not in available_ids:
    resolved_email_entry_id = None
  if resolved_name_entry_id and resolved_name_entry_id not in available_ids:
    resolved_name_entry_id = None

  used = {entry_id for entry_id in (resolved_email_entry_id, resolved_name_entry_id) if entry_id}
  if not resolved_name_entry_id:
    resolved_name_entry_id = find_entry_by_title(entry_catalog, NAME_TITLE_HINTS, used)
    if resolved_name_entry_id:
      used.add(resolved_name_entry_id)

  if not resolved_email_entry_id:
    resolved_email_entry_id = find_entry_by_title(entry_catalog, EMAIL_TITLE_HINTS, used)
    if resolved_email_entry_id:
      used.add(resolved_email_entry_id)

  if not resolved_name_entry_id and len(entry_catalog) == 1:
    resolved_name_entry_id = entry_catalog[0][0]

  if (
    resolved_email_entry_id
    and resolved_name_entry_id
    and resolved_email_entry_id == resolved_name_entry_id
  ):
    alternative = find_entry_by_title(entry_catalog, EMAIL_TITLE_HINTS, {resolved_name_entry_id})
    resolved_email_entry_id = alternative if alternative != resolved_name_entry_id else None

  used = {entry_id for entry_id in (resolved_email_entry_id, resolved_name_entry_id) if entry_id}

  resolved_contact_entry_id = find_entry_by_title(entry_catalog, CONTACT_TITLE_HINTS, used)
  if resolved_contact_entry_id:
    used.add(resolved_contact_entry_id)

  resolved_municipality_entry_id = find_entry_by_title(entry_catalog, MUNICIPALITY_TITLE_HINTS, used)
  if resolved_municipality_entry_id:
    used.add(resolved_municipality_entry_id)

  resolved_barangay_entry_id = find_entry_by_title(entry_catalog, BARANGAY_TITLE_HINTS, used)

  return EntryMapping(
    email_entry_id=resolved_email_entry_id,
    name_entry_id=resolved_name_entry_id,
    contact_entry_id=resolved_contact_entry_id,
    municipality_entry_id=resolved_municipality_entry_id,
    barangay_entry_id=resolved_barangay_entry_id,
  )


def build_submit_payload(
  mapping: EntryMapping,
  *,
  email: str,
  name: str,
  contact_number: str,
  municipality: str,
  barangay: str,
) -> dict[str, str]:
  payload: dict[str, str] = {
    "emailAddress": email,
    "submit": "Submit",
  }
  if mapping.name_entry_id and name:
    payload[mapping.name_entry_id] = name
  if mapping.email_entry_id and email:
    payload[mapping.email_entry_id] = email
  if mapping.contact_entry_id and contact_number:
    payload[mapping.contact_entry_id] = contact_number
  if mapping.municipality_entry_id and municipality:
    payload[mapping.municipality_entry_id] = municipality
  if mapping.barangay_entry_id and barangay:
    payload[mapping.barangay_entry_id] = barangay
  return payload


def extract_related_name(value: Any) -> str:
  if isinstance(value, dict):
    return str(value.get("name") or "").strip()
  if isinstance(value, list) and value:
    first = value[0]
    if isinstance(first, dict):
      return str(first.get("name") or "").strip()
  return ""


def post_to_gform(response_url: str, payload_fields: dict[str, str], timeout: int) -> None:
  if not payload_fields:
    raise RuntimeError("No Google Form fields were mapped for submission.")

  response = requests.post(
    response_url,
    data=payload_fields,
    headers={
      "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      )
    },
    timeout=timeout,
    allow_redirects=False,
  )

  if response.status_code not in (200, 302, 303):
    snippet = response.text[:200]
    raise RuntimeError(
      f"GForm submit failed with HTTP {response.status_code}. "
      f"Response snippet: {snippet}"
    )


def is_transient_error(error: Exception) -> bool:
  if isinstance(error, (requests.exceptions.ConnectionError, requests.exceptions.Timeout)):
    return True

  if isinstance(error, requests.exceptions.HTTPError) and error.response is not None:
    return error.response.status_code in (408, 425, 429, 500, 502, 503, 504)

  return False


def process_registration_row(
  client: SupabaseRestClient,
  table_name: str,
  row: dict[str, Any],
) -> None:
  row_id = str(row.get("id") or "")
  if not row_id:
    return

  if str(row.get("source") or "portal_direct") != "portal_direct":
    client.mark_status_best_effort(table_name, row_id, SYNC_STATUS_SKIPPED, "Row source is not portal_direct.")
    return

  kind = "event" if table_name == "event_registrations" else "program"
  parent_id_field = "event_id" if kind == "event" else "program_id"
  parent_id = str(row.get(parent_id_field) or "")
  if not parent_id:
    client.mark_status_best_effort(table_name, row_id, SYNC_STATUS_FAILED, "Missing parent record ID.")
    return

  email = str(row.get("email") or "").strip().lower()
  full_name = str(row.get("full_name") or "").strip() or "Unknown"
  contact_number = str(row.get("contact_number") or "").strip()
  municipality = str(row.get("municipality") or "").strip()
  barangay = extract_related_name(row.get("barangays"))
  if not email:
    client.mark_status_best_effort(table_name, row_id, SYNC_STATUS_FAILED, "Missing email in registration row.")
    return

  parent = client.get_parent_record(kind, parent_id)
  if not parent:
    client.mark_status_best_effort(table_name, row_id, SYNC_STATUS_FAILED, f"{kind.title()} not found.")
    return

  if not bool(parent.get("external_attendance_enabled")):
    client.mark_status_best_effort(table_name, row_id, SYNC_STATUS_SKIPPED, "External attendance sync is disabled.")
    return

  configured_response_url = str(parent.get("gform_response_url") or "").strip()
  registration_form_url = str(parent.get("registration_form_url") or "").strip()
  source_form_url = registration_form_url or configured_response_url
  if not source_form_url:
    client.mark_status_best_effort(table_name, row_id, SYNC_STATUS_FAILED, "No Google Form URL configured.")
    return

  try:
    normalized_response_url = normalize_gform_response_url(source_form_url)
  except Exception as normalize_error:
    client.mark_status_best_effort(table_name, row_id, SYNC_STATUS_FAILED, str(normalize_error))
    return

  try:
    mapping = resolve_entry_mapping(
      normalized_response_url,
      parent.get("gform_email_entry_id"),
      parent.get("gform_name_entry_id"),
    )
  except Exception as resolve_error:
    client.mark_status_best_effort(table_name, row_id, SYNC_STATUS_FAILED, f"Entry detection failed: {resolve_error}")
    return

  try:
    if (
      (parent.get("gform_response_url") or "") != normalized_response_url
      or (parent.get("gform_email_entry_id") or None) != mapping.email_entry_id
      or (parent.get("gform_name_entry_id") or None) != mapping.name_entry_id
    ):
      client.update_parent_form_fields(
        kind,
        parent_id,
        gform_response_url=normalized_response_url,
        gform_email_entry_id=mapping.email_entry_id,
        gform_name_entry_id=mapping.name_entry_id,
      )
  except Exception as update_error:
    print(f"[WARN] unable to update cached form fields for {kind}:{parent_id}: {update_error}")

  payload = build_submit_payload(
    mapping,
    email=email,
    name=full_name,
    contact_number=contact_number,
    municipality=municipality,
    barangay=barangay,
  )

  max_attempts = 3
  for attempt in range(1, max_attempts + 1):
    try:
      post_to_gform(normalized_response_url, payload, timeout=client.timeout)
      client.mark_status(table_name, row_id, SYNC_STATUS_SYNCED, None)
      return
    except Exception as submit_error:
      transient = is_transient_error(submit_error)
      if transient and attempt < max_attempts:
        time.sleep(min(2 * attempt, 5))
        continue

      if transient:
        # keep row pending for automatic retry loop
        print(f"[WARN] transient sync error for {table_name}:{row_id} -> keeping pending ({submit_error})")
        return

      client.mark_status_best_effort(
        table_name,
        row_id,
        SYNC_STATUS_FAILED,
        str(submit_error)[:1000],
      )
      return


def process_pending_batch(client: SupabaseRestClient, limit: int) -> int:
  total = 0
  for table_name in REGISTRATION_TABLES:
    try:
      rows = client.list_pending_registrations(table_name, limit)
    except Exception as list_error:
      print(f"[ERROR] failed listing pending rows from {table_name}: {list_error}")
      continue

    if rows:
      print(f"[INFO] {table_name}: {len(rows)} pending rows")

    for row in rows:
      total += 1
      process_registration_row(client, table_name, row)
  return total


def parse_args() -> argparse.Namespace:
  parser = argparse.ArgumentParser(description="Sync pending portal registrations to Google Forms.")
  parser.add_argument("--once", action="store_true", help="Run only one polling cycle.")
  return parser.parse_args()


def main() -> None:
  args = parse_args()
  config = get_config()
  client = SupabaseRestClient(config)

  print(
    "[INFO] worker started "
    f"(poll={config.poll_seconds}s, batch={config.batch_size}, once={args.once})"
  )

  while True:
    try:
      client.clear_parent_cache()
      processed = process_pending_batch(client, config.batch_size)
      if processed == 0:
        print("[INFO] no pending rows")
    except Exception as worker_error:
      print(f"[ERROR] worker cycle failed: {worker_error}")

    if args.once:
      break
    time.sleep(config.poll_seconds)


if __name__ == "__main__":
  main()

import json
import os
import sys
from http.server import BaseHTTPRequestHandler
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
  sys.path.insert(0, str(ROOT_DIR))

from worker.gform_sync_worker import SupabaseRestClient, get_config, process_pending_batch  # noqa: E402


def write_json(response: BaseHTTPRequestHandler, status: int, payload: dict) -> None:
  body = json.dumps(payload).encode("utf-8")
  response.send_response(status)
  response.send_header("Content-Type", "application/json")
  response.send_header("Content-Length", str(len(body)))
  response.end_headers()
  response.wfile.write(body)


class handler(BaseHTTPRequestHandler):
  def do_POST(self) -> None:  # noqa: N802
    expected_token = os.getenv("SYNC_TRIGGER_TOKEN", "").strip()
    provided_token = self.headers.get("x-sync-trigger-token", "").strip()

    if not expected_token:
      write_json(
        self,
        500,
        {
          "ok": False,
          "error": "SYNC_TRIGGER_TOKEN is not configured on the server.",
        },
      )
      return

    if provided_token != expected_token:
      write_json(
        self,
        401,
        {
          "ok": False,
          "error": "Unauthorized sync trigger token.",
        },
      )
      return

    try:
      config = get_config()
      client = SupabaseRestClient(config)
      client.clear_parent_cache()
      processed = process_pending_batch(client, config.batch_size)
      write_json(
        self,
        200,
        {
          "ok": True,
          "processed": processed,
        },
      )
    except Exception as sync_error:
      write_json(
        self,
        500,
        {
          "ok": False,
          "error": str(sync_error),
        },
      )

  def do_GET(self) -> None:  # noqa: N802
    write_json(
      self,
      405,
      {
        "ok": False,
        "error": "Method not allowed. Use POST.",
      },
    )

  def do_OPTIONS(self) -> None:  # noqa: N802
    self.send_response(204)
    self.send_header("Allow", "POST, OPTIONS")
    self.end_headers()

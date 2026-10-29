import { createClient } from "@supabase/supabase-js";

// Staging-only bucket bootstrap. This script reads credentials exclusively
// from explicitly named environment variables; it never loads a repository
// .env file or prints credentials. It does not create or modify Storage objects.
const TARGET_PROJECT_REF = "zroudsvpswqsjlyttkjf";
const TARGET_PROJECT_URL = "https://zroudsvpswqsjlyttkjf.supabase.co";
const REQUIRED_BUCKETS = new Map([
  ["organization-documents", false],
  ["budget-request-files", false],
  ["liquidation-report-files", false],
  ["ypop-files", false],
  ["move-files", false],
  ["template-files", false],
  ["news-release-images", true],
  ["brand-logo", true],
  ["registration-seed-file", true],
  ["transparency-attachments", true],
]);

function requireStagingCredentials() {
  const suppliedUrl = process.env.YTRACE_STAGING_SUPABASE_URL;
  const suppliedRef = process.env.YTRACE_STAGING_PROJECT_REF;
  const serviceRoleKey = process.env.YTRACE_STAGING_SERVICE_ROLE_KEY;

  if (suppliedUrl !== TARGET_PROJECT_URL || suppliedRef !== TARGET_PROJECT_REF) {
    throw new Error(
      "Refusing to run: set the exact ytrace-staging URL and project reference in the YTRACE_STAGING_* variables.",
    );
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(suppliedUrl);
  } catch {
    throw new Error("Refusing to run: the staging URL is invalid.");
  }

  if (
    parsedUrl.protocol !== "https:" ||
    parsedUrl.hostname !== `${TARGET_PROJECT_REF}.supabase.co` ||
    parsedUrl.pathname !== "/" ||
    parsedUrl.search ||
    parsedUrl.hash ||
    !serviceRoleKey
  ) {
    throw new Error(
      "Refusing to run: expected the exact staging host and a staging service-role credential.",
    );
  }

  return { serviceRoleKey };
}

function assertBucketSettings(bucket, expectedPublic) {
  const mismatches = [];
  if (bucket.public !== expectedPublic) mismatches.push("public/private status");
  if (bucket.file_size_limit != null) mismatches.push("file size limit");
  if (bucket.allowed_mime_types != null) mismatches.push("MIME-type restriction");
  return mismatches;
}

async function listAllBuckets(storage) {
  const pageSize = 100;
  const buckets = [];

  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await storage.listBuckets({ limit: pageSize, offset });
    if (error || !Array.isArray(data)) {
      throw new Error("Could not read the staging bucket inventory from Supabase Storage.");
    }
    buckets.push(...data);
    if (data.length < pageSize) return buckets;
    if (offset >= 10_000) {
      throw new Error("Refusing to continue: the staging bucket inventory is unexpectedly large.");
    }
  }
}

async function countBucketObjects(storage, bucketId) {
  const { data, error } = await storage.from(bucketId).list("", { limit: 1 });
  if (error || !Array.isArray(data)) {
    throw new Error(`Could not verify the object count for bucket ${bucketId}.`);
  }
  // A one-item listing is sufficient to distinguish an empty bucket. The
  // bootstrap never downloads, uploads, removes, or lists object contents.
  return data.length;
}

async function main() {
  const { serviceRoleKey } = requireStagingCredentials();
  const supabase = createClient(TARGET_PROJECT_URL, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const storage = supabase.storage;

  // Inspect the complete existing inventory before making any changes.
  const initialBuckets = await listAllBuckets(storage);
  const initialIds = new Set(initialBuckets.map((bucket) => bucket.id));
  const unexpected = [...initialIds].filter((id) => !REQUIRED_BUCKETS.has(id));
  if (unexpected.length) {
    throw new Error(
      `Refusing to create buckets because staging contains unexpected bucket(s): ${unexpected.join(", ")}.`,
    );
  }

  const drifted = initialBuckets.flatMap((bucket) => {
    const mismatches = assertBucketSettings(bucket, REQUIRED_BUCKETS.get(bucket.id));
    return mismatches.length ? [`${bucket.id}: ${mismatches.join(", ")}`] : [];
  });
  if (drifted.length) {
    throw new Error(
      `Refusing to modify existing bucket settings: ${drifted.join("; ")}.`,
    );
  }

  const outcomes = new Map();
  for (const [bucketId, isPublic] of REQUIRED_BUCKETS) {
    if (initialIds.has(bucketId)) {
      outcomes.set(bucketId, "already existed; preserved");
      continue;
    }

    // Omit allowedMimeTypes and fileSizeLimit so Supabase applies the same
    // unrestricted defaults as the verified production bucket configuration.
    const { error } = await storage.createBucket(bucketId, { public: isPublic });
    if (error) {
      outcomes.set(bucketId, "creation failed");
      console.table([...REQUIRED_BUCKETS].map(([id, expectedPublic]) => ({
        bucket: id,
        expected: expectedPublic ? "public" : "private",
        outcome: outcomes.get(id) ?? "not attempted",
      })));
      throw new Error(`Supabase Storage could not create bucket ${bucketId}.`);
    }
    outcomes.set(bucketId, "created");
  }

  const finalBuckets = await listAllBuckets(storage);
  const finalById = new Map(finalBuckets.map((bucket) => [bucket.id, bucket]));
  const finalUnexpected = [...finalById.keys()].filter((id) => !REQUIRED_BUCKETS.has(id));
  if (finalUnexpected.length || finalById.size !== REQUIRED_BUCKETS.size) {
    throw new Error("Final verification failed: staging does not contain exactly the 10 expected buckets.");
  }

  const verification = [];
  for (const [bucketId, expectedPublic] of REQUIRED_BUCKETS) {
    const bucket = finalById.get(bucketId);
    const mismatches = assertBucketSettings(bucket, expectedPublic);
    const objectCount = await countBucketObjects(storage, bucketId);
    verification.push({
      bucket: bucketId,
      visibility: bucket.public ? "public" : "private",
      outcome: outcomes.get(bucketId),
      objectsSeen: objectCount,
      verification: mismatches.length ? `FAILED: ${mismatches.join(", ")}` : "settings match",
    });
  }

  console.table(verification);
  const settingsFailed = verification.some((row) => row.verification !== "settings match");
  const objectsFound = verification.some((row) => row.objectsSeen !== 0);
  if (settingsFailed || objectsFound) {
    throw new Error(
      "Final verification failed. No existing buckets or Storage objects were modified or removed.",
    );
  }

  console.log("Verified 10 staging buckets (6 private, 4 public), with no Storage objects.");
}

main().catch((error) => {
  // Only our fixed, sanitized messages are emitted; SDK responses and secrets
  // are intentionally not printed.
  console.error(error instanceof Error ? error.message : "Staging bucket setup failed.");
  process.exitCode = 1;
});

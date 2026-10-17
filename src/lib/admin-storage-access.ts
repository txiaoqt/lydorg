import { readAdminSession } from "./admin-auth";
import { supabase } from "./supabase";

// The gateway never falls back to anonymous signing or direct asset writes.
// Caller cache handles identity transitions and rejects stale signing results.
export async function requestAdminStorageAccess(action: "sign" | "upload" | "delete", bucket: string, path = "", resourceId?: string, fileName?: string) {
  const session = readAdminSession();
  if (!supabase || !session) throw new Error("Please sign in with your administrator account.");
  const token = session.sessionToken;
  const { data, error } = await supabase.functions.invoke("admin-storage-access", {
    body: { action, bucket, path, resourceId: resourceId ?? null, fileName: fileName ?? null, sessionToken: token },
  });
  if (readAdminSession()?.sessionToken !== token) throw new Error("Administrator account changed. Please try again.");
  if (error || data?.error || !data) throw new Error("Storage access could not be authorized. Please try again.");
  return data as { signedUrl?: string; bucket?: string; path?: string; token?: string; removed?: boolean };
}

export async function uploadAdminStorageAsset(bucket: "template-files" | "news-release-images", file: File, resourceId?: string) {
  const sessionToken = readAdminSession()?.sessionToken;
  const grant = await requestAdminStorageAccess("upload", bucket, "", resourceId, file.name);
  if (!grant.path || !grant.token || grant.bucket !== bucket || readAdminSession()?.sessionToken !== sessionToken) {
    throw new Error("The authorized upload could not be started.");
  }
  const { error } = await supabase!.storage.from(bucket).uploadToSignedUrl(grant.path, grant.token, file, {
    upsert: false, contentType: file.type || "application/octet-stream",
  });
  if (readAdminSession()?.sessionToken !== sessionToken) throw new Error("Administrator account changed. Please try again.");
  if (error) throw new Error("The file upload failed. Please try again.");
  return grant.path;
}

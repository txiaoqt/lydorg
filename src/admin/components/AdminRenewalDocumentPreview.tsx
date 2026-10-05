import { useEffect, useState } from "react";
import { Megaphone } from "lucide-react";
import type { SubmissionFile } from "@/lib/lydo-connect-data";
import { resolveSupabaseFileUrl } from "@/lib/lydo-connect-supabase";

type PreviewFile = Pick<SubmissionFile, "id" | "fileUrl" | "fileName" | "fileType">;

/** Keep the selected renewal document when possible; otherwise choose the first row in queue order. */
export const preserveOrSelectFirstRenewalReviewFile = (
  currentId: string | null,
  orderedFiles: readonly Pick<PreviewFile, "id">[],
): string | null => {
  if (currentId && orderedFiles.some((file) => file.id === currentId)) return currentId;
  return orderedFiles[0]?.id ?? null;
};

const withHiddenPdfToolbar = (url: string) => (url.includes("#") ? url : `${url}#toolbar=0`);

export const AdminRenewalDocumentPreview = ({
  file,
  title,
}: {
  file: PreviewFile | null;
  title: string;
}) => {
  const [resolvedPreview, setResolvedPreview] = useState<{ fileId: string; sourceUrl: string; url: string } | null>(null);

  useEffect(() => {
    let active = true;
    const sourceUrl = file?.fileUrl?.trim() ?? "";
    if (!file || !sourceUrl) {
      setResolvedPreview(null);
      return () => {
        active = false;
      };
    }

    void resolveSupabaseFileUrl(sourceUrl)
      .then((url) => {
        if (active) setResolvedPreview({ fileId: file.id, sourceUrl, url: url ?? "" });
      })
      .catch(() => {
        if (active) setResolvedPreview({ fileId: file.id, sourceUrl, url: "" });
      });

    return () => {
      active = false;
    };
  }, [file?.id, file?.fileUrl]);

  const previewUrl =
    file && resolvedPreview?.fileId === file.id && resolvedPreview.sourceUrl === file.fileUrl
      ? resolvedPreview.url
      : "";

  if (file && previewUrl) {
    return file.fileType.startsWith("image/") ? (
      <img src={previewUrl} alt={title} className="h-full w-full object-contain" />
    ) : (
      <iframe src={withHiddenPdfToolbar(previewUrl)} title={title} className="h-full min-h-[500px] w-full border-0" />
    );
  }

  return (
    <div
      className="flex h-full min-h-[500px] w-full items-center justify-center"
      style={{ background: "linear-gradient(180deg, #0E2F66 0%, #1A5CA8 100%)" }}
    >
      <Megaphone className="h-16 w-16 text-white" strokeWidth={1.5} />
    </div>
  );
};

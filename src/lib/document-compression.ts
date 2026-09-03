import JSZip from "jszip";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import pdfWorkerUrl from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";
import { jsPDF } from "jspdf";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const TARGET_BYTES = 3 * 1024 * 1024;

const PDF_LADDER = [
  { scale: 1.5, quality: 0.6 },
  { scale: 1.1, quality: 0.45 },
  { scale: 0.8, quality: 0.3 },
];

const IMAGE_LADDER = [
  { scale: 1, quality: 0.6 },
  { scale: 0.75, quality: 0.45 },
  { scale: 0.5, quality: 0.3 },
];

export type DownloadableFile = { url: string; name: string };

export type CompressBundleResult = {
  finalSizeBytes: number;
  hitTarget: boolean;
};

export const saveBlob = (blob: Blob, name: string) => {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
};

export const downloadFileDirect = async (url: string, filename: string): Promise<void> => {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Unable to download this file.");
  const blob = await response.blob();
  saveBlob(blob, filename);
};

const isPdfFile = (name: string) => /\.pdf$/i.test(name);
const isImageFile = (name: string) => /\.(png|jpe?g|gif|webp)$/i.test(name);

async function recompressPdfBlob(blob: Blob, scale: number, quality: number): Promise<Blob> {
  const buffer = new Uint8Array(await blob.arrayBuffer());
  const pdfDocument = await pdfjsLib.getDocument({ data: buffer }).promise;
  let doc: jsPDF | null = null;

  for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
    const page = await pdfDocument.getPage(pageNumber);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas context is unavailable in this browser.");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    await page.render({ canvas, canvasContext: context, viewport }).promise;
    const dataUrl = canvas.toDataURL("image/jpeg", quality);
    const orientation = canvas.width > canvas.height ? "landscape" : "portrait";

    if (!doc) {
      doc = new jsPDF({ orientation, unit: "px", format: [canvas.width, canvas.height] });
    } else {
      doc.addPage([canvas.width, canvas.height], orientation);
    }
    doc.addImage(dataUrl, "JPEG", 0, 0, canvas.width, canvas.height);
  }

  if (!doc) throw new Error("This PDF has no pages to compress.");
  return doc.output("blob");
}

async function recompressImageBlob(blob: Blob, scale: number, quality: number): Promise<Blob> {
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas context is unavailable in this browser.");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error("Unable to re-encode this image."))),
      "image/jpeg",
      quality,
    );
  });
}

const buildZip = async (entries: { name: string; blob: Blob }[]): Promise<Blob> => {
  const zip = new JSZip();
  entries.forEach((entry) => zip.file(entry.name, entry.blob));
  return zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 9 } });
};

/**
 * Downloads every file as a single .zip, staying under TARGET_BYTES when possible.
 * Tries a plain zip first, then re-encodes oversized PDFs/images at progressively
 * lower quality/resolution until the bundle fits or the ladder is exhausted — in
 * which case the smallest bundle actually achieved is downloaded, and
 * `hitTarget: false` tells the caller to say so honestly rather than claim success.
 */
export async function compressAndDownloadBundle(
  files: DownloadableFile[],
  zipName: string,
  onProgress?: (message: string) => void,
): Promise<CompressBundleResult> {
  if (!files.length) throw new Error("There are no documents to download.");

  onProgress?.("Downloading documents…");
  const fetched = await Promise.all(
    files.map(async (file) => {
      const response = await fetch(file.url);
      if (!response.ok) throw new Error(`Unable to download ${file.name}.`);
      return { name: file.name, blob: await response.blob() };
    }),
  );

  onProgress?.("Compressing…");
  let zipBlob = await buildZip(fetched);
  if (zipBlob.size <= TARGET_BYTES) {
    saveBlob(zipBlob, zipName);
    return { finalSizeBytes: zipBlob.size, hitTarget: true };
  }

  for (let step = 0; step < PDF_LADDER.length; step += 1) {
    onProgress?.(`Compressing documents (pass ${step + 1} of ${PDF_LADDER.length})…`);
    const recompressed = await Promise.all(
      fetched.map(async (entry) => {
        try {
          if (isPdfFile(entry.name)) {
            const blob = await recompressPdfBlob(entry.blob, PDF_LADDER[step].scale, PDF_LADDER[step].quality);
            return { name: entry.name, blob };
          }
          if (isImageFile(entry.name)) {
            const blob = await recompressImageBlob(entry.blob, IMAGE_LADDER[step].scale, IMAGE_LADDER[step].quality);
            return { name: entry.name, blob };
          }
        } catch (error) {
          console.error(`Unable to recompress ${entry.name}:`, error);
        }
        return entry;
      }),
    );

    zipBlob = await buildZip(recompressed);
    if (zipBlob.size <= TARGET_BYTES) {
      saveBlob(zipBlob, zipName);
      return { finalSizeBytes: zipBlob.size, hitTarget: true };
    }
  }

  saveBlob(zipBlob, zipName);
  return { finalSizeBytes: zipBlob.size, hitTarget: false };
}

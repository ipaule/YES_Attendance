// Client-side photo pipeline: HEIC convert -> resize/center-crop -> JPEG compress -> upload.
// All stages run in the browser; server only sees a <= ~200KB JPEG blob.

const MAX_DIM = 500;
const JPEG_QUALITY = 0.8;
const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;

function isHeic(file: File): boolean {
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  return (
    type === "image/heic" ||
    type === "image/heif" ||
    name.endsWith(".heic") ||
    name.endsWith(".heif")
  );
}

async function heicToJpeg(file: File): Promise<File> {
  const heic2any = (await import("heic2any")).default;
  const out = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
  const blob = Array.isArray(out) ? out[0] : (out as Blob);
  return new File([blob], file.name.replace(/\.(heic|heif)$/i, ".jpg"), {
    type: "image/jpeg",
  });
}

interface DecodedImage {
  width: number;
  height: number;
  drawCropped: (
    ctx: CanvasRenderingContext2D,
    sx: number,
    sy: number,
    side: number,
    size: number,
  ) => void;
}

async function decodeViaImg(src: Blob): Promise<DecodedImage> {
  const url = URL.createObjectURL(src);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("img element failed to load"));
      el.src = url;
    });
    return {
      width: img.naturalWidth,
      height: img.naturalHeight,
      drawCropped: (ctx, sx, sy, side, size) =>
        ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size),
    };
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

async function decodeImage(src: Blob): Promise<DecodedImage> {
  // createImageBitmap is more reliable than <img> on iOS for HEIC and unusual
  // blob types, and avoids the URL.createObjectURL path that some WebKit
  // versions reject. Fall through to <img> if the bitmap path can't decode.
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(src);
      return {
        width: bitmap.width,
        height: bitmap.height,
        drawCropped: (ctx, sx, sy, side, size) => {
          ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, size, size);
          bitmap.close();
        },
      };
    } catch {
      // fall through
    }
  }
  return decodeViaImg(src);
}

async function resizeAndCompress(src: Blob): Promise<Blob> {
  const decoded = await decodeImage(src);
  const side = Math.min(decoded.width, decoded.height);
  const sx = (decoded.width - side) / 2;
  const sy = (decoded.height - side) / 2;
  const size = Math.min(MAX_DIM, side);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas 컨텍스트를 생성할 수 없습니다.");
  decoded.drawCropped(ctx, sx, sy, side, size);
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("canvas.toBlob returned null"))),
      "image/jpeg",
      JPEG_QUALITY,
    );
  });
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

export async function uploadPhoto(memberId: string, file: File): Promise<string> {
  // Diagnostic suffix appended when something throws so the red error message
  // surfaced to the user identifies the file and the failing stage.
  const fileTag = `${file.type || "no-type"}/${file.size}b`;

  let blob: Blob;
  try {
    blob = await resizeAndCompress(file);
  } catch (nativeErr) {
    if (!isHeic(file)) {
      throw new Error(`[decode ${fileTag}] ${errMsg(nativeErr)}`);
    }
    try {
      const converted = await heicToJpeg(file);
      blob = await resizeAndCompress(converted);
    } catch (heicErr) {
      throw new Error(
        `[heic ${fileTag}] ${errMsg(heicErr)} | native: ${errMsg(nativeErr)}`,
      );
    }
  }
  if (blob.size > MAX_UPLOAD_BYTES) {
    throw new Error("압축 후에도 2MB를 초과합니다.");
  }
  let res: Response;
  try {
    res = await fetch(`/api/upload-photo?memberId=${encodeURIComponent(memberId)}`, {
      method: "POST",
      headers: { "Content-Type": "image/jpeg" },
      body: blob,
    });
  } catch (fetchErr) {
    throw new Error(`[fetch] ${errMsg(fetchErr)}`);
  }
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "업로드 실패");
  return json.url as string;
}

export const PHOTO_ACCEPT = "image/*";

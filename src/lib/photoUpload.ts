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

async function convertHeicIfNeeded(file: File): Promise<File | Blob> {
  if (!isHeic(file)) return file;
  const heic2any = (await import("heic2any")).default;
  const out = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
  const blob = Array.isArray(out) ? out[0] : (out as Blob);
  return new File([blob], file.name.replace(/\.(heic|heif)$/i, ".jpg"), {
    type: "image/jpeg",
  });
}

async function loadImage(src: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(src);
  try {
    return await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("이미지를 불러올 수 없습니다."));
      img.src = url;
    });
  } finally {
    // Revoke after onload fires; callers keep the HTMLImageElement reference.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

async function resizeAndCompress(src: Blob): Promise<Blob> {
  const img = await loadImage(src);
  const side = Math.min(img.naturalWidth, img.naturalHeight);
  const sx = (img.naturalWidth - side) / 2;
  const sy = (img.naturalHeight - side) / 2;
  const size = Math.min(MAX_DIM, side);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas 컨텍스트를 생성할 수 없습니다.");
  ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("인코딩 실패"))),
      "image/jpeg",
      JPEG_QUALITY,
    );
  });
}

export async function uploadPhoto(memberId: string, file: File): Promise<string> {
  const converted = await convertHeicIfNeeded(file);
  const blob = await resizeAndCompress(converted);
  if (blob.size > MAX_UPLOAD_BYTES) {
    throw new Error("압축 후에도 2MB를 초과합니다.");
  }
  const res = await fetch(`/api/upload-photo?memberId=${encodeURIComponent(memberId)}`, {
    method: "POST",
    headers: { "Content-Type": "image/jpeg" },
    body: blob,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "업로드 실패");
  return json.url as string;
}

export const PHOTO_ACCEPT = "image/png,image/jpeg,image/heic,image/heif,.heic,.heif";

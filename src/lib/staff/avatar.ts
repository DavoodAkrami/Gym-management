export function staffFullName(firstName: string, lastName: string) {
  return `${firstName.trim()} ${lastName.trim()}`.trim();
}

export function staffInitials(firstName: string, lastName: string) {
  const first = firstName.trim().charAt(0).toUpperCase();
  const second = lastName.trim().charAt(0).toUpperCase();
  if (first && second) {
    return `${first}${second}`;
  }
  return first || second || "?";
}

const MAX_AVATAR_BYTES = 120_000;
const MAX_DATA_URL_LENGTH = 100_000;

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not load image."));
    };
    img.src = url;
  });
}

function canvasToDataUrl(canvas: HTMLCanvasElement, quality: number) {
  return canvas.toDataURL("image/jpeg", quality);
}

/** Resize/compress image for DB storage (no Supabase Storage required). */
export async function readAvatarFile(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file (JPEG, PNG, or WebP).");
  }

  if (typeof document === "undefined") {
    throw new Error("Image upload is only available in the browser.");
  }

  const img = await loadImage(file);
  const maxSide = 320;
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not process image.");
  }
  ctx.drawImage(img, 0, 0, width, height);

  let quality = 0.88;
  let dataUrl = canvasToDataUrl(canvas, quality);

  while (dataUrl.length > MAX_DATA_URL_LENGTH && quality > 0.45) {
    quality -= 0.1;
    dataUrl = canvasToDataUrl(canvas, quality);
  }

  if (dataUrl.length > MAX_DATA_URL_LENGTH) {
    throw new Error("Image is still too large after compression. Try a smaller photo.");
  }

  const approxBytes = Math.ceil((dataUrl.length * 3) / 4);
  if (approxBytes > MAX_AVATAR_BYTES) {
    throw new Error("Image must be smaller than 120KB after compression.");
  }

  return dataUrl;
}

/** Omit huge data URLs from API payload if compression failed silently */
export function sanitizeAvatarForDb(url: string | undefined | null) {
  const trimmed = url?.trim() ?? "";
  if (!trimmed) {
    return null;
  }
  if (trimmed.length > MAX_DATA_URL_LENGTH) {
    return null;
  }
  return trimmed;
}

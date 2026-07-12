import { AppError } from "@/shared/errors/app-error";

const MAX_BYTES = 5 * 1024 * 1024;

const MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

export function detectAssetFileMime(buffer: Buffer): string | null {
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return "image/jpeg";
  }

  if (
    buffer.length >= 4 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return "image/png";
  }

  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }

  if (
    buffer.length >= 4 &&
    buffer.toString("ascii", 0, 4) === "%PDF"
  ) {
    return "application/pdf";
  }

  return null;
}

export function validateAssetUpload(file: File, buffer: Buffer) {
  if (file.size > MAX_BYTES) {
    throw new AppError("ASSET_009");
  }

  const mime = detectAssetFileMime(buffer);
  if (!mime || !(mime in MIME_EXTENSIONS)) {
    throw new AppError("ASSET_008");
  }

  return { mime, extension: MIME_EXTENSIONS[mime] };
}

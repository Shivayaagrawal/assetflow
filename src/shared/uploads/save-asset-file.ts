import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { validateAssetUpload } from "@/shared/uploads/validate-asset-file";

export async function saveAssetUpload(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());
  const { extension } = validateAssetUpload(file, buffer);

  const filename = `${randomUUID()}.${extension}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads", "assets");
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, filename), buffer);

  return `/uploads/assets/${filename}`;
}

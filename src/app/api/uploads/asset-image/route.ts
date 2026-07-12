import { NextResponse } from "next/server";
import { AssetPolicy } from "@/modules/asset/policies/asset.policy";
import { requireSessionUserStrict } from "@/shared/auth/session";
import { toActionError, ValidationError } from "@/shared/errors/app-error";
import { saveAssetUpload } from "@/shared/uploads/save-asset-file";

export async function POST(request: Request) {
  try {
    const user = await requireSessionUserStrict();
    AssetPolicy.assertCanRegister(user);

    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File) || file.size === 0) {
      throw new ValidationError("A file is required.");
    }

    const url = await saveAssetUpload(file);
    return NextResponse.json({ success: true, data: { url } });
  } catch (error) {
    const mapped = toActionError(error);
    return NextResponse.json(
      { success: false, error: { code: mapped.code, message: mapped.message } },
      { status: mapped.httpStatus }
    );
  }
}

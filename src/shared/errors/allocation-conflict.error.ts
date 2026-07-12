import { ConflictError } from "@/shared/errors/app-error";

export class AllocationConflictError extends ConflictError {
  readonly allocationId: string;
  readonly holderName: string;
  readonly assetId: string;

  constructor(input: {
    allocationId: string;
    holderName: string;
    assetId: string;
  }) {
    super("ASSET_004", `Already allocated to ${input.holderName}.`);
    this.allocationId = input.allocationId;
    this.holderName = input.holderName;
    this.assetId = input.assetId;
  }
}

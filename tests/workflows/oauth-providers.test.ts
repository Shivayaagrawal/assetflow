import { describe, expect, it } from "vitest";
import {
  enabledOAuthProviders,
  getConfiguredSocialProviders,
} from "@/lib/oauth-providers";

describe("oauth providers", () => {
  it("returns no providers when credentials are unset", () => {
    expect(getConfiguredSocialProviders()).toEqual({});
    expect(enabledOAuthProviders()).toEqual([]);
  });
});

import { describe, expect, it } from "vitest";
import { publicQueueRoutePaths } from "./routerPaths";

describe("public queue routes", () => {
  it("registers the profile-scoped queue URL without a bot slug", () => {
    expect(publicQueueRoutePaths).toContain("/queue");
  });
});

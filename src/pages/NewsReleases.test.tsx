import { describe, expect, it } from "vitest";
import { NEWS_RELEASES_SEARCH_PLACEHOLDER, orderNewsReleaseCategories } from "./NewsReleases";

describe("News Releases public controls", () => {
  it("orders the program filters YORP, YPOP, then MOVE before other categories", () => {
    expect(orderNewsReleaseCategories(["MOVE", "OTHER", "YPOP", "YORP", "ALPHA"])).toEqual([
      "YORP",
      "YPOP",
      "MOVE",
      "ALPHA",
      "OTHER",
    ]);
  });

  it("uses the approved title, summary, and keyword search prompt", () => {
    expect(NEWS_RELEASES_SEARCH_PLACEHOLDER).toBe("Search by title, summary, or keyword…");
  });
});

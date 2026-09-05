import { describe, it, expect } from "vitest";
import {
  YPOP_CITY_LED_CATEGORY_TAG_STYLES,
  YPOP_CITY_LED_CATEGORY_LABELS,
} from "./lydo-connect-data";

describe("YPOP Category Tag Colors - Exact Values", () => {
  it("has exact colors for Mandatory category", () => {
    expect(YPOP_CITY_LED_CATEGORY_TAG_STYLES.mandatory).toEqual({
      text: "#8D69E3",
      background: "#F9F5FF",
      border: "#EEE1FE",
      className: "text-[#8D69E3] bg-[#F9F5FF] border-[#EEE1FE]",
    });
    expect(YPOP_CITY_LED_CATEGORY_LABELS.mandatory).toBe("Mandatory");
  });

  it("has exact colors for Invitational category", () => {
    expect(YPOP_CITY_LED_CATEGORY_TAG_STYLES.invitational).toEqual({
      text: "#EA3FB8",
      background: "#FCF1FD",
      border: "#FAE1FA",
      className: "text-[#EA3FB8] bg-[#FCF1FD] border-[#FAE1FA]",
    });
    expect(YPOP_CITY_LED_CATEGORY_LABELS.invitational).toBe("Invitational");
  });

  it("has exact colors for Partnership category", () => {
    expect(YPOP_CITY_LED_CATEGORY_TAG_STYLES.partnership).toEqual({
      text: "#10A79B",
      background: "#F0FDFA",
      border: "#CEF6F0",
      className: "text-[#10A79B] bg-[#F0FDFA] border-[#CEF6F0]",
    });
    expect(YPOP_CITY_LED_CATEGORY_LABELS.partnership).toBe("Partnership");
  });
});

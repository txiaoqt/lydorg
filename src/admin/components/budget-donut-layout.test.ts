import { describe, expect, it } from "vitest";
import {
  getDonutLabelLayout,
  getDonutMidAngles,
  wrapDonutLabel,
} from "./budget-donut-layout";

const canonicalNames = [
  "Governance",
  "Education",
  "Health",
  "Peace Building And Security",
  "Active Citizenship",
  "Agriculture",
  "Environment",
  "Global Mobility",
  "Social Inclusion And Equity",
  "Economic Empowerment",
];

const cases = [
  [10],
  [60, 40],
  [36.2, 29.8, 10.6, 10.6, 4.3, 3.2, 2.8, 2.5],
  [1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [99.91, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01],
];

// Actual FY datasets
const fy2024Data = [
  { name: "Governance", value: 880000 },
  { name: "Education", value: 368000 },
  { name: "Health", value: 208000 },
  { name: "Active Citizenship", value: 160000 },
];

const fy2025Data = [
  { name: "Governance", value: 864000 },
  { name: "Education", value: 720000 },
  { name: "Health", value: 264000 },
  { name: "Peace Building And Security", value: 264000 },
  { name: "Active Citizenship", value: 96000 },
  { name: "Environment", value: 96000 },
  { name: "Social Inclusion And Equity", value: 96000 },
];

const fy2026Data = [
  { name: "Governance", value: 200000 },
  { name: "Active Citizenship", value: 51700 },
  { name: "Peace Building And Security", value: 51700 },
  { name: "Education", value: 24100 },
  { name: "Environment", value: 20700 },
];

describe("Budget donut label layout", () => {
  it("keeps 1–10 category labels separate and inside the chart", () => {
    for (const values of cases) {
      const slices = values.map((value, index) => ({ name: canonicalNames[index], value }));
      const layout = getDonutLabelLayout(slices, 480);
      expect(layout.compact).toBe(false);
      expect(layout.positions.size).toBe(slices.length);
      expect(getDonutMidAngles(slices)).toHaveLength(slices.length);

      for (const side of ["left", "right"] as const) {
        const positions = [...layout.positions.values()]
          .filter((position) => position.side === side)
          .sort((a, b) => a.top - b.top);
        positions.forEach((position, index) => {
          expect(position.top).toBeGreaterThanOrEqual(18);
          expect(position.top + position.height).toBeLessThanOrEqual(layout.chartHeight - 18);
          if (index > 0) {
            expect(position.top - (positions[index - 1].top + positions[index - 1].height)).toBeGreaterThanOrEqual(8);
          }
        });
      }
    }
  });

  it("wraps full canonical names without abbreviation or ellipsis", () => {
    for (const name of canonicalNames) {
      expect(wrapDonutLabel(name).join(" ")).toBe(name);
    }
    expect(wrapDonutLabel("Peace Building And Security").length).toBeGreaterThan(1);
    expect(wrapDonutLabel("Social Inclusion And Equity").length).toBeGreaterThan(1);
  });

  it("switches to a complete compact key below 440px", () => {
    const slices = canonicalNames.map((name, index) => ({ name, value: index + 1 }));
    expect(getDonutLabelLayout(slices, 320).compact).toBe(true);
    expect(getDonutLabelLayout(slices, 320).positions.size).toBe(0);
    expect(getDonutLabelLayout(slices, 440).positions.size).toBe(10);
  });

  it("produces clean two-stage leader lines with perfectly horizontal terminal segments", () => {
    for (const data of [fy2024Data, fy2025Data, fy2026Data]) {
      const layout = getDonutLabelLayout(data, 520);
      for (const pos of layout.positions.values()) {
        const line = pos.leaderLine;
        expect(line).toBeDefined();

        // Stage 2 is perfectly horizontal: elbowY === horizontalEndY
        expect(line.elbowY).toBe(line.horizontalEndY);
        expect(line.horizontalEndY).toBe(pos.connectorY);

        // Terminal segment length is at least 15px
        const horizontalSpan = Math.abs(line.horizontalEndX - line.elbowX);
        expect(horizontalSpan).toBeGreaterThanOrEqual(15);

        // Correct side orientation
        if (pos.side === "right") {
          expect(line.horizontalEndX).toBeGreaterThan(line.elbowX);
          expect(pos.textX).toBe(line.horizontalEndX + 6);
        } else {
          expect(line.horizontalEndX).toBeLessThan(line.elbowX);
          expect(pos.textX).toBe(line.horizontalEndX - 6);
        }

        // SVG path has format M startX startY L elbowX elbowY L laneX connectorY
        expect(line.pathD).toMatch(/^M \d+ \d+ L \d+ \d+ L \d+ \d+$/);
      }
    }
  });

  it("guarantees no crossing lines by strictly preserving topological order on both sides", () => {
    for (const data of [fy2024Data, fy2025Data, fy2026Data]) {
      const layout = getDonutLabelLayout(data, 520);
      for (const side of ["left", "right"] as const) {
        const sidePositions = [...layout.positions.values()]
          .filter((p) => p.side === side)
          .sort((a, b) => a.leaderLine.startY - b.leaderLine.startY);

        // Ascending startY on the donut MUST imply ascending connectorY on the label lane
        for (let i = 1; i < sidePositions.length; i++) {
          expect(sidePositions[i].connectorY).toBeGreaterThan(sidePositions[i - 1].connectorY);
        }
      }
    }
  });

  it("balances FY 2025 distribution to prevent left-side congestion", () => {
    const layout = getDonutLabelLayout(fy2025Data, 520);
    const leftCount = [...layout.positions.values()].filter((p) => p.side === "left").length;
    const rightCount = [...layout.positions.values()].filter((p) => p.side === "right").length;

    // With 7 categories, neither side should have > 5 categories
    expect(leftCount).toBe(5);
    expect(rightCount).toBe(2);

    // Education (spans across bottom) is placed on the right
    const edu = layout.positions.get("Education");
    expect(edu).toBeDefined();
    expect(edu?.side).toBe("right");

    const gov = layout.positions.get("Governance");
    expect(gov).toBeDefined();
    expect(gov?.side).toBe("right");
  });

  it("handles small <1% and large 90%+ categories without collision or truncation", () => {
    const skewedData = [
      { name: "Governance", value: 950000 },
      { name: "Education", value: 1000 },
      { name: "Health", value: 1000 },
      { name: "Peace Building And Security", value: 1000 },
    ];
    const layout = getDonutLabelLayout(skewedData, 520);
    expect(layout.positions.size).toBe(4);

    for (const side of ["left", "right"] as const) {
      const positions = [...layout.positions.values()]
        .filter((p) => p.side === side)
        .sort((a, b) => a.top - b.top);
      for (let i = 1; i < positions.length; i++) {
        expect(positions[i].top - (positions[i - 1].top + positions[i - 1].height)).toBeGreaterThanOrEqual(8);
      }
    }
  });
});

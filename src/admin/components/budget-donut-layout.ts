export type DonutSlice = { name: string; value: number };

export type DonutLeaderLine = {
  startX: number;
  startY: number;
  elbowX: number;
  elbowY: number;
  horizontalEndX: number;
  horizontalEndY: number;
  pathD: string;
};

export type DonutLabelPosition = {
  name: string;
  side: "left" | "right";
  top: number;
  height: number;
  lines: string[];
  connectorY: number;
  textX: number;
  leaderLine: DonutLeaderLine;
};

export type DonutLabelLayout = {
  chartHeight: number;
  radius: number;
  innerRadius: number;
  cx: number;
  cy: number;
  compact: boolean;
  positions: Map<string, DonutLabelPosition>;
};

const LABEL_LINE_HEIGHT = 14;
const PERCENT_LINE_HEIGHT = 15;
const LABEL_INTERNAL_GAP = 3;
const LABEL_GAP = 10;
const EDGE_PADDING = 20;

/**
 * Wraps canonical category names cleanly without abbreviations or ellipses.
 * Preserves the exact words and spelling.
 */
export function wrapDonutLabel(label: string, maxLineLength = 17): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of label.split(/\s+/).filter(Boolean)) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && candidate.length > maxLineLength) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * Mirror Recharts' full-circle Pie angle allocation (clockwise from 90° to -270°),
 * including padding between slices.
 */
export function getDonutSliceAngles(slices: DonutSlice[]) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  if (total <= 0) return [];
  const padding = slices.length > 1 ? Math.min(1.5, 8 / slices.length) : 0;
  const availableAngle = 360 - slices.length * padding;
  let nextAngle = 90;
  return slices.map((slice) => {
    const sweep = (slice.value / total) * availableAngle;
    const startAngle = nextAngle;
    const endAngle = nextAngle - sweep;
    const midAngle = nextAngle - sweep / 2;
    nextAngle -= sweep + padding;
    return { startAngle, endAngle, midAngle, sweep };
  });
}

/** Mirror Recharts' mid-angles for compatibility with existing tests. */
export function getDonutMidAngles(slices: DonutSlice[]): number[] {
  return getDonutSliceAngles(slices).map((s) => s.midAngle);
}

/**
 * Advanced label and leader-line layout engine:
 * 1. Analyzes slice angles & measures label heights.
 * 2. Balances left/right side distribution to prevent congestion.
 * 3. Enforces strict topological sorting to guarantee zero crossing lines.
 * 4. Resolves collisions using iterative relaxation within chart boundaries.
 * 5. Constructs clean two-stage leader lines (segment -> elbow -> horizontal connector).
 */
export function getDonutLabelLayout(slices: DonutSlice[], width: number): DonutLabelLayout {
  const compact = width < 440;
  const radius = compact
    ? Math.min(84, Math.max(64, width * 0.25))
    : Math.min(100, Math.max(76, width * 0.195));
  const innerRadius = radius * 0.62;
  const cx = Math.round(width / 2);

  if (compact || slices.length === 0) {
    return {
      chartHeight: 240,
      radius,
      innerRadius,
      cx,
      cy: 120,
      compact,
      positions: new Map(),
    };
  }

  const sliceAngles = getDonutSliceAngles(slices);

  // Measure label heights and determine natural side & anchor
  const items = slices.map((slice, i) => {
    const { startAngle, endAngle, midAngle } = sliceAngles[i];
    const naturalRadians = (-midAngle * Math.PI) / 180;
    const lines = wrapDonutLabel(slice.name);
    const height = lines.length * LABEL_LINE_HEIGHT + LABEL_INTERNAL_GAP + PERCENT_LINE_HEIGHT;
    const naturalCos = Math.cos(naturalRadians);
    const naturalSide: "left" | "right" = naturalCos >= 0 ? "right" : "left";

    return {
      name: slice.name,
      value: slice.value,
      lines,
      height,
      startAngle,
      endAngle,
      midAngle,
      naturalRadians,
      naturalSide,
      assignedSide: naturalSide,
      anchorAngle: midAngle,
      anchorRadians: naturalRadians,
    };
  });

  // Rebalancing: Prevent lopsided distribution (e.g. 6 on left vs 1 on right in FY 2025)
  // Check if segments crossing/near vertical meridian (top 90° or bottom -90°) can be shifted
  const leftInitial = items.filter((it) => it.assignedSide === "left");
  const rightInitial = items.filter((it) => it.assignedSide === "right");

  if (leftInitial.length - rightInitial.length >= 3) {
    // Left side is congested. Look for a bottom or top bridging segment on the left that can move right
    for (const item of leftInitial) {
      if (item.startAngle >= -90 && item.endAngle <= -90) {
        // Spans right hemisphere into left hemisphere across the bottom
        item.assignedSide = "right";
        const rightPortionMid = (item.startAngle + -90) / 2;
        item.anchorAngle = rightPortionMid;
        item.anchorRadians = (-rightPortionMid * Math.PI) / 180;
        break;
      }
    }
  } else if (rightInitial.length - leftInitial.length >= 3) {
    // Right side is congested. Check for bridging segment across top (90°) or bottom (-90°)
    for (const item of rightInitial) {
      if (item.startAngle >= 90 && item.endAngle <= 90) {
        item.assignedSide = "left";
        const leftPortionMid = (90 + item.endAngle) / 2;
        item.anchorAngle = leftPortionMid;
        item.anchorRadians = (-leftPortionMid * Math.PI) / 180;
        break;
      }
    }
  }

  // Calculate dynamic chart height based on the taller column
  const groupsBySide = {
    left: items.filter((it) => it.assignedSide === "left"),
    right: items.filter((it) => it.assignedSide === "right"),
  };

  const getSideHeight = (group: typeof items) =>
    group.reduce((acc, it) => acc + it.height, 0) + Math.max(0, group.length - 1) * LABEL_GAP;

  const maxGroupHeight = Math.max(
    getSideHeight(groupsBySide.left),
    getSideHeight(groupsBySide.right)
  );

  const chartHeight = Math.ceil(
    Math.max(296, radius * 2 + 76, maxGroupHeight + EDGE_PADDING * 2)
  );
  const cy = Math.round(chartHeight / 2);

  // Calculate anchor positions on the donut outer arc
  items.forEach((item) => {
    item.anchorRadians = (-item.anchorAngle * Math.PI) / 180;
  });

  // Calculate label lane X positions
  // Left side: right-aligned, text ends at textX = labelLaneX - 6
  // Right side: left-aligned, text begins at textX = labelLaneX + 6
  const labelLaneOffset = Math.min(65, Math.max(38, width / 2 - radius - 100));
  const rightLabelLaneX = Math.round(cx + radius + labelLaneOffset);
  const leftLabelLaneX = Math.round(cx - radius - labelLaneOffset);

  const positions = new Map<string, DonutLabelPosition>();

  for (const side of ["left", "right"] as const) {
    const group = groupsBySide[side];
    if (group.length === 0) continue;

    // Calculate natural start positions on the donut outer arc
    const groupWithCoords = group.map((item) => {
      const startX = cx + Math.cos(item.anchorRadians) * radius;
      const startY = cy + Math.sin(item.anchorRadians) * radius;
      const desiredTop = startY - item.height / 2;
      return {
        ...item,
        startX,
        startY,
        desiredTop,
      };
    });

    // Topological sorting: Strictly sort by startY from top to bottom
    // This mathematically GUARANTEES leader lines never cross
    groupWithCoords.sort((a, b) => a.startY - b.startY);

    // Collision resolution with boundary constraints
    const maxBottom = chartHeight - EDGE_PADDING;
    const tops = groupWithCoords.map((item) =>
      Math.max(EDGE_PADDING, Math.min(maxBottom - item.height, item.desiredTop))
    );

    // Forward pass: Push down overlapping labels
    for (let i = 1; i < groupWithCoords.length; i++) {
      const minTop = tops[i - 1] + groupWithCoords[i - 1].height + LABEL_GAP;
      if (tops[i] < minTop) {
        tops[i] = minTop;
      }
    }

    // Backward pass: Pull up if bottom label exceeds boundary
    if (tops[groupWithCoords.length - 1] + groupWithCoords[groupWithCoords.length - 1].height > maxBottom) {
      tops[groupWithCoords.length - 1] = maxBottom - groupWithCoords[groupWithCoords.length - 1].height;
      for (let i = groupWithCoords.length - 2; i >= 0; i--) {
        const maxTop = tops[i + 1] - groupWithCoords[i].height - LABEL_GAP;
        if (tops[i] > maxTop) {
          tops[i] = maxTop;
        }
      }
    }

    // Edge check: If top pushed above padding, shift group down
    if (tops[0] < EDGE_PADDING) {
      const shift = EDGE_PADDING - tops[0];
      for (let i = 0; i < groupWithCoords.length; i++) {
        tops[i] += shift;
      }
    }

    // Relaxation toward natural desired positions
    for (let iter = 0; iter < 12; iter++) {
      for (let i = 0; i < groupWithCoords.length; i++) {
        const desired = groupWithCoords[i].desiredTop;
        const current = tops[i];
        const newTop = current + (desired - current) * 0.35;
        const minTop = i === 0 ? EDGE_PADDING : tops[i - 1] + groupWithCoords[i - 1].height + LABEL_GAP;
        const maxTop = i === groupWithCoords.length - 1
          ? maxBottom - groupWithCoords[i].height
          : tops[i + 1] - groupWithCoords[i].height - LABEL_GAP;
        if (minTop <= maxTop) {
          tops[i] = Math.max(minTop, Math.min(maxTop, newTop));
        }
      }
    }

    // Build final leader lines and positions
    const laneX = side === "right" ? rightLabelLaneX : leftLabelLaneX;
    const textX = side === "right" ? laneX + 6 : laneX - 6;

    groupWithCoords.forEach((item, index) => {
      const top = Math.round(tops[index]);
      // The horizontal connector aligns with the first line of the category name
      const connectorY = Math.round(top + 8.5);

      // Elbow calculation
      let elbowX: number;
      if (side === "right") {
        const minElbowX = Math.max(cx + radius + 12, item.startX + 8);
        const maxElbowX = laneX - 16;
        const yDiff = Math.abs(connectorY - item.startY);
        elbowX = Math.round(Math.min(maxElbowX, Math.max(minElbowX, item.startX + 12 + yDiff * 0.12)));
      } else {
        const maxElbowX = Math.min(cx - radius - 12, item.startX - 8);
        const minElbowX = laneX + 16;
        const yDiff = Math.abs(connectorY - item.startY);
        elbowX = Math.round(Math.max(minElbowX, Math.min(maxElbowX, item.startX - 12 - yDiff * 0.12)));
      }

      // Two-stage leader line:
      // Stage 1: from donut arc (startX, startY) to elbow (elbowX, connectorY)
      // Stage 2: from elbow (elbowX, connectorY) to label lane (laneX, connectorY)
      const pathD = `M ${Math.round(item.startX)} ${Math.round(item.startY)} L ${elbowX} ${connectorY} L ${laneX} ${connectorY}`;

      positions.set(item.name, {
        name: item.name,
        side,
        top,
        height: item.height,
        lines: item.lines,
        connectorY,
        textX,
        leaderLine: {
          startX: Math.round(item.startX),
          startY: Math.round(item.startY),
          elbowX,
          elbowY: connectorY,
          horizontalEndX: laneX,
          horizontalEndY: connectorY,
          pathD,
        },
      });
    });
  }

  return {
    chartHeight,
    radius,
    innerRadius,
    cx,
    cy,
    compact,
    positions,
  };
}

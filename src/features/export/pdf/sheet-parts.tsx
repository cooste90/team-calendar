// What both attendance sheets share (spec §10, mockup "PrintSheet"): the page, its header
// and footer, and how one cell is drawn. Everything must read in greyscale: codes are bold
// on a light tint, boxes have a dark border, and days off are hatched.
import "server-only";
import { Path, StyleSheet, Svg, Text, View } from "@react-pdf/renderer";
import type { SheetCell, SheetHalf } from "@/domain/attendance-sheet";
import { leaveTypes } from "@/domain/leave-types";

const INK = "#17171f";
const MUTED = "#4a4a58"; // the lightest grey used for text (darker than #767676)
export const RULE = "#a8a8b6";

// A4 portrait in points, and how it's shared out. The header and footer have fixed
// heights, so the room left for the table is known exactly when splitting it into pages.
const A4 = { width: 595.28, height: 841.89 };
const PAGE_PADDING = 28;
const HEADER_HEIGHT = 64; // the header (58) and the gap under it (6)
const FOOTER_HEIGHT = 40;
const PAGE_NUMBER_WIDTH = 70;
export const CONTENT_WIDTH = A4.width - PAGE_PADDING * 2;
export const BODY_HEIGHT = A4.height - PAGE_PADDING * 2 - HEADER_HEIGHT - FOOTER_HEIGHT;

// Light tints from the mockup, one per leave code.
const TINTS: Record<string, string> = {
  AL: "#e3eeff",
  FL: "#dcf4e7",
  SK: "#ffe5de",
  SL: "#eee8ff",
  PL: "#ffe4f0",
  WBD: "#fbf3cc",
  OT: "#efeeea",
  WFH: "#dcf4f5",
  PH: "#ffecd6",
};

export const styles = StyleSheet.create({
  // A 9pt name has to fit its 11pt row. With Geist's own, taller line react-pdf would
  // leave the text out, so the page uses a tighter line, and the header (which has room)
  // sets a normal one. (Set on a View instead of the Page, react-pdf ignores it.)
  page: { padding: PAGE_PADDING, fontFamily: "Geist", fontSize: 9, lineHeight: 1.1, color: INK },
  header: {
    height: HEADER_HEIGHT - 6,
    marginBottom: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    borderBottomWidth: 1.5,
    borderBottomColor: INK,
    paddingBottom: 6,
  },
  wordmark: { fontSize: 9, fontWeight: 700, lineHeight: 1.4 },
  title: { fontSize: 13, fontWeight: 600, lineHeight: 1.4 },
  subtitle: { fontSize: 9.5, color: MUTED, lineHeight: 1.4 },
  printed: { fontSize: 8.5, color: MUTED, textAlign: "right", lineHeight: 1.4 },
  teamRow: {
    backgroundColor: "#e6e6ee",
    fontWeight: 600,
    paddingLeft: 4,
    justifyContent: "center",
    borderBottomWidth: 1,
    borderBottomColor: RULE,
  },
  footer: {
    position: "absolute",
    bottom: PAGE_PADDING,
    left: PAGE_PADDING,
    right: PAGE_PADDING,
    height: FOOTER_HEIGHT,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    fontSize: 8,
    color: MUTED,
  },
  legend: { flexDirection: "row", flexWrap: "wrap", width: CONTENT_WIDTH - PAGE_NUMBER_WIDTH },
  legendItem: { flexDirection: "row", alignItems: "center", marginRight: 9, marginBottom: 2 },
  box: { width: 9, height: 9, borderWidth: 1.2, borderColor: INK, borderRadius: 1.5 },
});

type HeaderProps = { title: string; subtitle?: string; printedAt: string; printedBy: string };

// "Attendance check · West Operations", what it covers, and who printed it when.
export function SheetHeader({ title, subtitle, printedAt, printedBy }: HeaderProps) {
  return (
    <View style={styles.header}>
      <View>
        <Text style={styles.wordmark}>WestCal</Text>
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      <View>
        <Text style={styles.printed}>Printed {printedAt}</Text>
        <Text style={styles.printed}>by {printedBy}</Text>
      </View>
    </View>
  );
}

// The legend of every mark and code, and "Page 1 of 2".
export function SheetFooter({ page, pages }: { page: number; pages: number }) {
  return (
    <View style={styles.footer}>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.box, { marginRight: 3 }]} />
          <Text>expected in: tick when present</Text>
        </View>
        <View style={styles.legendItem}>
          <Hatch width={12} height={9} />
          <Text style={{ marginLeft: 3 }}>not a working day</Text>
        </View>
        {Object.values(leaveTypes).map((type) => (
          <View key={type.code} style={styles.legendItem}>
            <Text style={{ fontWeight: 700, color: INK, marginRight: 2 }}>{type.code}</Text>
            <Text>{type.label}</Text>
          </View>
        ))}
      </View>
      <Text>
        Page {page} of {pages}
      </Text>
    </View>
  );
}

// Diagonal lines for a day off, drawn as one path. Strokes stay at 1pt so they print.
function Hatch({ width, height }: { width: number; height: number }) {
  let path = "";
  for (let x = -height; x < width; x += 4.5) {
    path += `M ${x} ${height} L ${x + height} 0 `;
  }
  return (
    <Svg width={width} height={height}>
      <Path d={path} stroke="#b4b4be" strokeWidth={1} />
    </Svg>
  );
}

function Half({ half, width, height }: { half: SheetHalf; width: number; height: number }) {
  if (half.kind === "off") return <Hatch width={width} height={height} />;
  const center = { width, height, alignItems: "center", justifyContent: "center" } as const;
  if (half.kind === "box") {
    return (
      <View style={center}>
        <View style={styles.box} />
      </View>
    );
  }
  // Half-day cells are narrow, so their codes are a size smaller.
  return (
    <View style={[center, { backgroundColor: TINTS[half.code] ?? "#efeeea" }]}>
      <Text style={{ fontWeight: 700, fontSize: width < 40 ? 7 : 8 }}>{half.code}</Text>
    </View>
  );
}

// One person's day. A split day has its morning on the left and its afternoon on the
// right, with a dashed line between them.
export function Cell({ cell, width, height }: { cell: SheetCell; width: number; height: number }) {
  if (cell.kind !== "split") return <Half half={cell} width={width} height={height} />;
  const halfWidth = width / 2;
  return (
    <View style={{ flexDirection: "row" }}>
      <Half half={cell.am} width={halfWidth} height={height} />
      <View style={{ borderLeftWidth: 1, borderLeftColor: RULE, borderLeftStyle: "dashed" }}>
        <Half half={cell.pm} width={halfWidth - 1} height={height} />
      </View>
    </View>
  );
}

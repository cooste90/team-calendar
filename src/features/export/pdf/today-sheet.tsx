// Today's attendance sheet (spec §10): people grouped by team, each with one status cell.
// When one column would run off the page, the people flow into two columns, so a BU of
// about 100 still fits on one page.
import "server-only";
import { Document, Page, Text, View } from "@react-pdf/renderer";
import { paginate, type SheetRow } from "@/domain/attendance-sheet";
import { formatLong } from "@/domain/format";
import type { AttendanceSheet } from "@/server/queries/attendance-sheet";
import {
  BODY_HEIGHT,
  Cell,
  CONTENT_WIDTH,
  RULE,
  SheetFooter,
  SheetHeader,
  styles,
} from "./sheet-parts";

const TODAY_ROW_HEIGHTS = { team: 14, person: 13 };
const CELL_WIDTH = 56;
const GAP = 16;

export function TodaySheet({ sheet }: { sheet: AttendanceSheet }) {
  const columns = paginate(sheet.rows, BODY_HEIGHT, TODAY_ROW_HEIGHTS);
  if (columns.length === 0) columns.push([]); // nobody in a team yet: still one page
  // One column across the page when everyone fits; otherwise two side by side per page.
  const twoColumns = columns.length > 1;
  const columnWidth = twoColumns ? (CONTENT_WIDTH - GAP) / 2 : CONTENT_WIDTH;
  const pages: SheetRow[][][] = [];
  for (let index = 0; index < columns.length; index += twoColumns ? 2 : 1) {
    pages.push(columns.slice(index, index + (twoColumns ? 2 : 1)));
  }
  const title = `Attendance check · ${sheet.businessUnitName} · ${formatLong(sheet.days[0])}`;

  return (
    <Document title={title} author="WestCal">
      {pages.map((pageColumns, index) => (
        <Page key={`page-${index + 1}`} size="A4" style={styles.page}>
          <SheetHeader title={title} printedAt={sheet.printedAt} printedBy={sheet.printedBy} />
          <View style={{ flexDirection: "row", gap: GAP }}>
            {pageColumns.map((rows, column) => (
              <View key={`column-${column + 1}`} style={{ width: columnWidth }}>
                {rows.map((row) => (
                  <TodayRow key={`${row.kind}-${row.name}`} row={row} />
                ))}
              </View>
            ))}
          </View>
          <SheetFooter page={index + 1} pages={pages.length} />
        </Page>
      ))}
    </Document>
  );
}

function TodayRow({ row }: { row: SheetRow }) {
  if (row.kind === "team") {
    return (
      <View style={[styles.teamRow, { height: TODAY_ROW_HEIGHTS.team }]}>
        <Text>
          {row.name} ({row.size})
        </Text>
      </View>
    );
  }
  const height = TODAY_ROW_HEIGHTS.person;
  return (
    <View style={{ flexDirection: "row", height, borderBottomWidth: 1, borderBottomColor: RULE }}>
      <Text style={{ flex: 1, paddingLeft: 4, paddingTop: 1.5 }}>{row.name}</Text>
      <View style={{ width: CELL_WIDTH, borderLeftWidth: 1, borderLeftColor: RULE }}>
        <Cell cell={row.cells[0]} width={CELL_WIDTH - 1} height={height - 1} />
      </View>
    </View>
  );
}

// The week's attendance sheet (spec §10, mockup "PrintSheet"): A4 portrait, a Name column
// and Sunday to Saturday, with team headers. It fits one page, flowing to a second (with
// the table header again) when there are more people. Today isn't highlighted.
import "server-only";
import { Document, Page, Text, View } from "@react-pdf/renderer";
import { paginate, type SheetRow } from "@/domain/attendance-sheet";
import { formatDayHeader, formatLongRangeWithYear } from "@/domain/format";
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

const NAME_WIDTH = 150;
const DAY_WIDTH = (CONTENT_WIDTH - NAME_WIDTH) / 7;
const HEADER_ROW_HEIGHT = 16;
const WEEK_ROW_HEIGHTS = { team: 12.5, person: 11.25 };

export function WeekSheet({ sheet }: { sheet: AttendanceSheet }) {
  const pages = paginate(sheet.rows, BODY_HEIGHT - HEADER_ROW_HEIGHT, WEEK_ROW_HEIGHTS);
  if (pages.length === 0) pages.push([]); // nobody in a team yet: still one page
  const title = `Attendance check · ${sheet.businessUnitName}`;

  return (
    <Document title={title} author="WestCal">
      {pages.map((rows, index) => (
        <Page key={`page-${index + 1}`} size="A4" style={styles.page}>
          <SheetHeader
            title={title}
            subtitle={`Week of ${formatLongRangeWithYear(sheet.days[0], sheet.days[6])}`}
            printedAt={sheet.printedAt}
            printedBy={sheet.printedBy}
          />
          <View style={{ borderTopWidth: 1, borderLeftWidth: 1, borderColor: RULE }}>
            <DayHeaders days={sheet.days} />
            {rows.map((row) => (
              <TableRow key={`${row.kind}-${row.name}`} row={row} days={sheet.days} />
            ))}
          </View>
          <SheetFooter page={index + 1} pages={pages.length} />
        </Page>
      ))}
    </Document>
  );
}

const cellBorder = { borderRightWidth: 1, borderBottomWidth: 1, borderColor: RULE } as const;

function DayHeaders({ days }: { days: string[] }) {
  const header = {
    ...cellBorder,
    height: HEADER_ROW_HEIGHT,
    justifyContent: "center",
    backgroundColor: "#f2f2f6",
    fontWeight: 600,
  } as const;
  return (
    <View style={{ flexDirection: "row" }}>
      <View style={[header, { width: NAME_WIDTH, paddingLeft: 4 }]}>
        <Text>Name</Text>
      </View>
      {days.map((day) => (
        <View key={day} style={[header, { width: DAY_WIDTH, alignItems: "center" }]}>
          <Text>{formatDayHeader(day)}</Text>
        </View>
      ))}
    </View>
  );
}

function TableRow({ row, days }: { row: SheetRow; days: string[] }) {
  if (row.kind === "team") {
    const height = WEEK_ROW_HEIGHTS.team;
    return (
      <View style={[styles.teamRow, { height, borderRightWidth: 1, borderRightColor: RULE }]}>
        <Text>
          {row.name} ({row.size})
        </Text>
      </View>
    );
  }
  const height = WEEK_ROW_HEIGHTS.person;
  return (
    <View style={{ flexDirection: "row" }}>
      <View
        style={[
          cellBorder,
          { width: NAME_WIDTH, height, paddingLeft: 4, justifyContent: "center" },
        ]}
      >
        <Text>{row.name}</Text>
      </View>
      {row.cells.map((cell, index) => (
        <View key={days[index]} style={[cellBorder, { width: DAY_WIDTH, height }]}>
          <Cell cell={cell} width={DAY_WIDTH - 1} height={height - 1} />
        </View>
      ))}
    </View>
  );
}

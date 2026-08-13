export type Row = Record<string, string | number | null>;
export type Cell = string | number | null;
export type Table = Cell[][];

// concat(date,'') makes iso8601-like
export const queries = {
  missingLastDay:
    'select concat(DATE_SUB(NOW(), INTERVAL 24 HOUR),"") as since, round(avg(watt),0) as watt, count(*) as samples, 86400-count(*) as missing from watt where stamp>DATE_SUB(NOW(), INTERVAL 24 HOUR)',
  missingWeekByDay:
    'select concat(substring(stamp,1,11),"00:00:00") as day, round(avg(watt),0) as watt, count(*) as samples,86400-count(*) as missing from watt where stamp>DATE_SUB(NOW(), INTERVAL 32 DAY) group by day having missing>-1',
  missingDayByHour:
    'select concat(substring(stamp,1,14),"00:00") as hour, round(avg(watt),0) as watt, count(*) as samples,3600-count(*) as missing from watt where stamp>DATE_SUB(NOW(), INTERVAL 24 HOUR) group by hour having missing>-1',
};

export function asTable(data: Row[]): Table {
  const table: Table = [];
  if (data.length) {
    const headers = Object.keys(data[0]!);
    table.push(headers);
    for (const row of data) {
      const tableRow: Cell[] = headers.map((col) => row[col] ?? null);
      table.push(tableRow);
    }
  }
  return table;
}

// all first column are dates - skip header
export function iso8601ify(data: Table): Table {
  return data.map((row, i) => {
    if (i === 0) {
      // skip header
      return row;
    }
    return row.map((col, j) => {
      // iso-ify first column: MySQL's "YYYY-MM-DD HH:MM:SS" -> ISO 8601
      if (j === 0) return (col as string).replace(" ", "T") + "Z";
      return col;
    });
  });
}

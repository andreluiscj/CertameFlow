import * as XLSX from 'xlsx';

export type ExportRow = Record<string, string | number | null>;

export function downloadXlsx(rows: ExportRow[], headers: string[], filename: string) {
  const ws = XLSX.utils.json_to_sheet(rows, { header: headers });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Dados');
  XLSX.writeFile(wb, filename);
}

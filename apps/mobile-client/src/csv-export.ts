export function formatCsv(rows: readonly (readonly string[])[]) {
  const quote = (value: string) =>
    '"' + value.replace(/^[=+@\-\t\r]/, "'$&").replaceAll('"', '""') + '"';
  return rows.map((row) => row.map(quote).join(",")).join("\r\n");
}
export function downloadCsv(csv: string, filename: string) {
  const url = URL.createObjectURL(
    new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

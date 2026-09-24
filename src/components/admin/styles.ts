export const UNDERLINE_TABS_LIST =
  "bg-transparent border-b w-full justify-start rounded-none h-auto p-0 gap-1 overflow-x-auto";

export const UNDERLINE_TABS_TRIGGER =
  "data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-primary border-b-2 border-transparent rounded-none gap-2 px-4 py-2.5";

export const UPPERCASE_HEAD = "text-xs font-semibold uppercase text-muted-foreground";

export function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

import { Button, DropdownMenu, MenuItem } from "@org/ui";
import {
  MoreHorizontal,
  FileJson,
  FileText,
  FileSpreadsheet,
  FilePenLine,
  Printer,
} from "lucide-react";
export type ScrutineerExportKind = "json" | "log" | "xlsx" | "docx" | "print";
export function ScrutineerExportMenu({
  available,
  finished,
  busy,
  onExport,
}: {
  available: boolean;
  finished: boolean;
  busy: boolean;
  onExport: (kind: ScrutineerExportKind) => void;
}) {
  return (
    <DropdownMenu
      label="Xuất file kiểm phiếu"
      showLabel={false}
      trigger={
        <Button
          variant="outline"
          size="icon"
          disabled={!available || busy}
          aria-label="Xuất file kiểm phiếu"
          className="min-h-12 min-w-12 shrink-0 rounded-xl border-[#e4e2da] bg-white text-[#215e3d] shadow-none"
        >
          <MoreHorizontal size={23} />
        </Button>
      }
    >
      <MenuItem disabled={busy} onSelect={() => onExport("json")}>
        <FileJson size={17} />
        Xuất file JSON
      </MenuItem>
      <MenuItem disabled={busy} onSelect={() => onExport("log")}>
        <FileText size={17} />
        Xuất file log
      </MenuItem>
      <MenuItem
        disabled={busy || !finished}
        title={!finished ? "Có thể xuất sau khi bầu cử kết thúc" : undefined}
        onSelect={() => onExport("xlsx")}
      >
        <FileSpreadsheet size={17} />
        Xuất kết quả
      </MenuItem>
      <MenuItem
        disabled={busy || !finished}
        title={!finished ? "Có thể xuất sau khi bầu cử kết thúc" : undefined}
        onSelect={() => onExport("docx")}
      >
        <FilePenLine size={17} />
        Xuất biên bản
      </MenuItem>
      <MenuItem
        disabled={busy || !finished}
        title={!finished ? "Có thể in sau khi bầu cử kết thúc" : undefined}
        onSelect={() => onExport("print")}
      >
        <Printer size={17} />
        In biên bản
      </MenuItem>
    </DropdownMenu>
  );
}

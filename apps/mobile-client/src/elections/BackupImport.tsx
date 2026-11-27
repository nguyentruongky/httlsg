import { useCallback, useState } from "react";
import { apiRequest, useAuth } from "@org/core";
import { Button, Input, useToast } from "@org/ui";

const post = (path: string, data: unknown = {}) =>
  apiRequest<any>(path, { method: "POST", body: JSON.stringify(data) });

const box =
  "rounded-xl border border-[#e6e4dd] bg-white p-4 space-y-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)]";

const primaryBtn =
  "bg-[#215e3d] text-white hover:bg-[#19492f] border-[#215e3d]";

const outlineBtn =
  "border-[#e6e4dd] bg-white text-[#1c1b18] hover:bg-[#f2f0e8]";

type Run = (fn: () => Promise<unknown>) => Promise<void>;

interface BackupImportProps {
  election: number;
  run: Run;
}

export function BackupImport({ election, run }: BackupImportProps) {
  const { toast } = useToast();
  const [backup, setBackup] = useState<any>();
  const [preview, setPreview] = useState<any>();

  const handlePreview = useCallback(async () => {
    if (!backup) return;
    try {
      const result = await apiRequest<any>(
        `/api/elections/${election}/backup`,
        {
          method: "POST",
          body: JSON.stringify({ backup, dryRun: true }),
        },
      );
      setPreview(result);
    } catch (e) {
      toast({ title: errorMessage(e) });
    }
  }, [backup, election, run, toast]);

  const handleRestore = useCallback(async () => {
    if (!backup || !preview) return;
    try {
      const result = await apiRequest<any>(
        `/api/elections/${election}/backup`,
        {
          method: "POST",
          body: JSON.stringify({
            backup,
            dryRun: false,
            expectedHash: preview.hash,
          }),
        },
      );
      setPreview({ ...result, chainErrors: [] });
      toast({ title: "Đã khôi phục phiếu thiếu" });
    } catch (e) {
      toast({ title: errorMessage(e) });
    }
  }, [backup, preview, election, run, toast]);

  const errorMessage = (e: unknown) =>
    e instanceof Error ? e.message : "Không thể xử lý yêu cầu.";

  return (
    <details className={box}>
      <summary className="cursor-pointer text-sm font-medium">
        Đối chiếu bản sao JSON
      </summary>
      <input
        type="file"
        accept=".json"
        className="text-sm"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          if (file.size > 10000000) throw new Error("Tệp tối đa 10 MB.");
          setBackup(JSON.parse(await file.text()));
          setPreview(undefined);
        }}
      />
      <Button className={primaryBtn} disabled={!backup} onClick={handlePreview}>
        Xem trước đối chiếu
      </Button>
      {preview && (
        <>
          <pre className="max-h-64 overflow-auto rounded-lg bg-[#f8f7f3] p-3 text-xs">
            {JSON.stringify(preview, null, 2)}
          </pre>
          <p className="text-xs text-[#6b6963]">
            Chỉ bổ sung phiếu thiếu vào cuộc bầu cử đang mở. Phiếu của bầu cử đã
            kết thúc và xung đột được giữ để đối chiếu.
          </p>
          <Button
            className={primaryBtn}
            disabled={preview.chainErrors?.length > 0}
            onClick={handleRestore}
          >
            Xác nhận khôi phục phiếu thiếu
          </Button>
        </>
      )}
    </details>
  );
}

const errorMessage = (e: unknown) =>
  e instanceof Error ? e.message : "Không thể xử lý yêu cầu.";

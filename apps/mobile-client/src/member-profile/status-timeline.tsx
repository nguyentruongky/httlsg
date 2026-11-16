import { CALENDAR_ZONE, type DirectoryMember } from "@org/core";
import { Card } from "@org/ui";
import { MemberStatusTag } from "../member-status-tag";

const timeFormat = new Intl.DateTimeFormat("vi-VN", {
  timeZone: CALENDAR_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function StatusTimeline({ history }: { history: DirectoryMember["statusHistory"] }) {
  return (
    <Card className="p-5">
      <h2 className="font-semibold">Lịch sử tình trạng</h2>
      {history.length ? (
        <ol aria-label="Lịch sử thay đổi tình trạng" className="mt-4 ml-1 border-l pl-5">
          {history.map((entry, index) => (
            <li key={`${entry.time}-${index}`} className="relative pb-5 last:pb-0">
              <span aria-hidden="true" className="absolute -left-[1.6rem] top-1.5 size-2.5 rounded-full border-2 border-background bg-primary" />
              <MemberStatusTag status={entry.status} />
              <time dateTime={entry.time} className="mt-1.5 block text-xs text-muted-foreground">
                {timeFormat.format(new Date(entry.time))}
              </time>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">Chưa có thay đổi tình trạng được ghi nhận.</p>
      )}
    </Card>
  );
}

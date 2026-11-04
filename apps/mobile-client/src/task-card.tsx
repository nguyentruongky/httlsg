import { Check, Clock, MapPin, ArrowRight, LoaderCircle } from "lucide-react";
import { ClientError } from "./locale";
import { type Task, useCompleteTask } from "@org/core";
import { Button, Card, cn } from "@org/ui";
export function TaskCard({ task }: { task: Task }) {
  const mutation = useCompleteTask(task.organizationId);
  const completed = task.status === "completed";
  const checkIn = task.kind === "check_in";
  return (
    <Card className={cn("p-5", completed && "bg-muted/40")}>
      <div className="mb-4 flex items-start gap-3">
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl",
            completed
              ? "bg-primary/10 text-primary"
              : checkIn
                ? "bg-accent text-primary"
                : "bg-muted text-muted-foreground",
          )}
        >
          {completed ? (
            <Check size={20} />
          ) : checkIn ? (
            <MapPin size={20} />
          ) : (
            <Clock size={20} />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {checkIn ? "Điểm danh hằng ngày" : "Công việc của bạn"}
            </span>
            <time
              dateTime={task.dueAt}
              className="text-xs text-muted-foreground"
            >
              {new Date(task.dueAt).toLocaleTimeString("vi-VN", {
                hour: "numeric",
                minute: "2-digit",
              })}
            </time>
          </div>
          <h3 className="text-sm font-semibold leading-snug">{task.title}</h3>
        </div>
      </div>
      <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
        {task.description}
      </p>
      <Button
        size="touch"
        variant={completed ? "outline" : checkIn ? "default" : "outline"}
        className="w-full"
        disabled={completed || mutation.isPending}
        onClick={() => mutation.mutate({ id: task.id, version: task.version })}
        aria-label={`${completed ? "Đã hoàn thành" : checkIn ? "Điểm danh" : "Hoàn thành"}: ${task.title}`}
      >
        <span aria-live="polite">
          {mutation.isPending
            ? "Đang lưu…"
            : completed
              ? "Đã hoàn thành"
              : checkIn
                ? "Tôi có mặt · Điểm danh"
                : "Đánh dấu hoàn thành"}
        </span>
        {mutation.isPending ? (
          <LoaderCircle size={16} className="animate-spin" />
        ) : completed ? (
          <Check size={16} />
        ) : (
          <ArrowRight size={16} />
        )}
      </Button>
      {mutation.isError && (
        <div className="mt-3">
          <ClientError error={mutation.error} />
        </div>
      )}
      {completed && task.completedAt && (
        <p className="mt-3 text-center text-xs text-muted-foreground">
          Hoàn thành lúc{" "}
          {new Date(task.completedAt).toLocaleTimeString("vi-VN", {
            hour: "numeric",
            minute: "2-digit",
          })}
        </p>
      )}
    </Card>
  );
}

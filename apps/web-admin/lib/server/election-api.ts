import { z } from "zod";
import { withActor } from "./session";
import {
  assertOrigin,
  body,
  failure,
  json,
  HttpError,
  attachmentDisposition,
} from "./http";
import { electionDispatch, getRound } from "./elections";
import { electionReport } from "./election-reports";
import { reconcileElectionBackup } from "./election-backup";
export async function electionApi(request: Request, path: string[]) {
  try {
    const route = path.join("/");
    const getRoute =
      /^(elections(?:\/\d+(?:\/(?:audit|candidates|scrutineers|public-session|public-otps))?)?|rounds\/assigned|rounds\/\d+\/(?:candidates|tickets|results(?:\/export)?|my-report|team-report))$/.test(
        route,
      );
    const postRoute =
      /^(elections(?:\/\d+\/(?:candidates(?:\/import)?|scrutineers|public-session|public-otps|counted-ballots|rounds|archive|backup))?|rounds\/\d+\/(?:tickets|heartbeat|configure|start|stop|reopen|prepare-next)|tickets\/\d+\/void|tickets\/online\/[0-9a-fA-F-]+\/void)$/.test(
        route,
      );
    if (
      (request.method === "GET" && !getRoute) ||
      (request.method === "POST" && !postRoute)
    )
      throw new HttpError(405, "Phương thức không hỗ trợ cho chức năng này.");
    const write = request.method === "POST";
    if (!["GET", "POST"].includes(request.method))
      throw new HttpError(405, "Phương thức không hỗ trợ.");
    if (write) {
      assertOrigin(request);
      if (request.headers.get("X-Church-CSRF") !== "1")
        throw new HttpError(403, "Thiếu xác thực CSRF.");
    }
    const input = write
      ? await body(request, 15000000)
      : Object.fromEntries(new URL(request.url).searchParams);
    const value = await withActor(
      request,
      async (db, actor) => {
        const [resource, rawId, action, operation] = path;
        if (
          resource === "tickets" &&
          rawId === "online" &&
          operation === "void" &&
          write
        ) {
          const { voidOnlineTicket } = await import("./election-online-void");
          return voidOnlineTicket(db, actor, action, input, request);
        }
        if (resource === "elections" && action === "backup" && write)
          return reconcileElectionBackup(
            db,
            actor,
            Number(rawId),
            input,
            request,
          );
        if (resource === "rounds" && action === "team-report" && !write) {
          const format = z.enum(["xlsx", "docx", "html"]).parse(input.format);
          const round = await getRound(
            db,
            actor,
            z.coerce.number().int().positive().parse(rawId),
            false,
            false,
          );
          const { electionTeamExportData } =
            await import("./election-team-export-data");
          const data = await electionTeamExportData(db, actor, round);
          const bytes =
            format === "html"
              ? Buffer.from(
                  (await import("./election-team-print")).electionTeamPrint(
                    data,
                  ),
                  "utf8",
                )
              : format === "xlsx"
                ? await (
                    await import("./election-team-excel")
                  ).electionTeamExcel(data)
                : await (
                    await import("./election-team-word")
                  ).electionTeamWord(data);
          const { electionLog } = await import("./elections");
          await electionLog(
            db,
            actor,
            round.election_id,
            round.id,
            "team_document_exported",
            { teamId: data.teamId, format, tickets: data.stats.received },
            request,
          );
          return {
            bytes,
            format,
            filename: `E${data.electionId}_T${data.teamId}_${format === "xlsx" ? "ket-qua" : "bien-ban"}.${format}`,
          };
        }
        if (
          resource === "rounds" &&
          (action === "my-report" ||
            (action === "results" && operation === "export"))
        ) {
          const round = await getRound(
            db,
            actor,
            z.coerce.number().int().positive().parse(rawId),
            action !== "my-report",
            false,
          );
          const format =
            action === "my-report" ? "pdf" : String(input.format ?? "pdf");
          if (
            action === "results" &&
            format === "xlsx" &&
            round.status !== "closed"
          )
            throw new HttpError(
              409,
              "Chỉ có thể xuất Excel sau khi kết thúc cuộc bầu cử.",
            );
          return {
            bytes: await electionReport(
              db,
              actor,
              round,
              format,
              action === "my-report",
              request,
            ),
            format,
            filename: `E${round.election_id}_${action === "my-report" ? "my-report" : "results"}.${format}`,
          };
        }
        const url = new URL(request.url);
        if (url.searchParams.has("dryRun"))
          input.dryRun = url.searchParams.get("dryRun") !== "false";
        return electionDispatch(
          db,
          actor,
          path,
          request.method,
          input,
          request,
        );
      },
      false,
    );
    if (value?.bytes)
      return new Response(new Uint8Array(value.bytes), {
        headers: {
          "Content-Type":
            value.format === "pdf"
              ? "application/pdf"
              : value.format === "html"
                ? "text/html; charset=utf-8"
                : value.format === "docx"
                  ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": attachmentDisposition(value.filename),
          "Cache-Control": "private, no-store",
        },
      });
    return json(value);
  } catch (error) {
    return failure(error);
  }
}

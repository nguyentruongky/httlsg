import { z } from "zod";
import { transaction } from "../db";
import { assertOrigin, body, failure, HttpError, json } from "../http";
import { rateLimit } from "../limits";
import {
  publicBrowserCredential,
  publicCredentialHash,
  publicVoterCookie,
  publicVoterCookieOptions,
} from "./credentials";
import { publicElectionAction } from "./actions";
import { attemptPublicElectionJoin } from "./join-security";
import { publicElectionConnection } from "./connection";
export async function publicElectionApi(request: Request, path: string[]) {
  const browser = publicBrowserCredential(request);
  let issueCookie = false;
  try {
    const [id, action = ""] = path;
    const device =
      request.method === "GET" && id === "device" && path.length === 1;
    const valid =
      device ||
      (request.method === "POST" && id === "join" && path.length === 1) ||
      (z.uuid().safeParse(id).success &&
        path.length <= 2 &&
        ((request.method === "GET" && !action) ||
          (request.method === "POST" &&
            ["location", "votes", "connection"].includes(action))));
    if (!valid) throw new HttpError(404, "Không tìm thấy chức năng.");
    if (request.method === "POST") {
      assertOrigin(request);
      if (
        request.headers.get("X-Church-CSRF") !== "1" ||
        request.headers.get("sec-fetch-site") === "cross-site"
      )
        throw new HttpError(403, "Nguồn yêu cầu không hợp lệ.");
      const ip = (request.headers.get("x-forwarded-for") ?? "local")
        .split(",")[0]
        .trim();
      if (action === "connection") {
        await rateLimit(
          `public-election-connection:${publicCredentialHash("voter", browser)}`,
          60,
        );
        await rateLimit(`public-election-connection-ip:${ip}`, 3000);
      } else if (id === "join") {
        issueCookie = true;
        await rateLimit(
          `public-election-join:${publicCredentialHash("voter", browser)}`,
          20,
        );
        await rateLimit(`public-election-join-ip:${ip}`, 1200);
      } else
        await rateLimit(
          `public-election-write:${id}:${publicCredentialHash("voter", browser)}`,
          60,
        );
    }
    if (device) {
      if (
        request.headers.get("X-Church-CSRF") !== "1" ||
        request.headers.get("sec-fetch-site") === "cross-site"
      )
        throw new HttpError(403, "Nguồn yêu cầu không hợp lệ.");
      const response = json({ ready: true });
      response.cookies.set(
        publicVoterCookie(),
        browser,
        publicVoterCookieOptions,
      );
      return response;
    }
    const input = request.method === "POST" ? await body(request, 16384) : {};
    const value = await transaction(async (db) =>
      action === "connection"
        ? publicElectionConnection(db, browser, id, input)
        : id === "join"
          ? attemptPublicElectionJoin(db, browser, input)
          : publicElectionAction(
              db,
              browser,
              id,
              action,
              request.method,
              input,
            ),
    );
    // Expected join failures are returned, so security state commits before HTTP errors.
    if (value instanceof HttpError) throw value;
    const response = json(value);
    if (issueCookie)
      response.cookies.set(
        publicVoterCookie(),
        browser,
        publicVoterCookieOptions,
      );
    return response;
  } catch (error) {
    const response = failure(
      (error as { code?: string })?.code === "23505"
        ? new HttpError(
            409,
            "Yêu cầu đã được sử dụng. Vui lòng tải lại trạng thái phiếu.",
            "DUPLICATE_REQUEST",
          )
        : error,
    );
    if (issueCookie)
      response.cookies.set(
        publicVoterCookie(),
        browser,
        publicVoterCookieOptions,
      );
    return response;
  }
}

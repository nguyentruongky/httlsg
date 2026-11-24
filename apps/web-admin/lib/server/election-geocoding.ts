import { z } from "zod";
import type { AuthUser } from "@org/core";
import type { DB } from "./db";
import { requireElection } from "./elections";
import { HttpError } from "./http";
import { rateLimit } from "./limits";

const Search = z.union([
  z.object({ q: z.string().trim().min(3).max(200) }).strict(),
  z
    .object({
      lat: z.coerce.number().finite().min(-90).max(90),
      lng: z.coerce.number().finite().min(-180).max(180),
    })
    .strict(),
]);
const ResponseSchema = z.object({
  features: z.array(
    z.object({
      geometry: z.object({
        coordinates: z.tuple([
          z.number().min(-180).max(180),
          z.number().min(-90).max(90),
        ]),
      }),
      properties: z.record(z.string(), z.unknown()),
    }),
  ),
});
type Place = {
  lat: number;
  lng: number;
  name: string;
  detail: string;
  address: string;
};
const cache = new Map<string, { until: number; places: Place[] }>();
const pending = new Map<string, Promise<Place[]>>();
export async function electionGeocoding(
  _db: DB,
  actor: AuthUser,
  input: unknown,
) {
  requireElection(actor, true);
  const query = Search.parse(input);
  await rateLimit(`election-geocoding:${actor.id}`, 120);
  const key = JSON.stringify(query);
  const cached = cache.get(key);
  if (cached && cached.until > Date.now()) return { items: cached.places };
  const ongoing = pending.get(key);
  if (ongoing) return { items: await ongoing };
  const load = async () => {
    try {
      const url = new URL(
        "q" in query ? "api/" : "reverse",
        (process.env.PHOTON_URL ?? "https://photon.komoot.io/").replace(
          /\/?$/,
          "/",
        ),
      );
      url.searchParams.set("limit", "5");
      if ("q" in query) {
        url.searchParams.set("q", query.q);
        url.searchParams.set("countrycode", "VN");
        url.searchParams.set("lat", "10.7769");
        url.searchParams.set("lon", "106.7009");
      } else {
        url.searchParams.set("lat", String(query.lat));
        url.searchParams.set("lon", String(query.lng));
      }
      const response = await fetch(url, {
        signal: AbortSignal.timeout(8000),
        headers: {
          "User-Agent": "ChurchManagementElectionVenue/1.0",
          "Accept-Language": "vi,en;q=0.8",
        },
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Geocoder unavailable");
      const data = ResponseSchema.parse(await response.json());
      const places = data.features
        .filter(
          (f) => String(f.properties.countrycode ?? "").toLowerCase() === "vn",
        )
        .slice(0, 5)
        .map((feature) => {
          const p = feature.properties;
          const text = (key: string) =>
            typeof p[key] === "string" ? String(p[key]).slice(0, 300) : "";
          const name =
            text("name") ||
            [text("housenumber"), text("street")].filter(Boolean).join(" ") ||
            text("city") ||
            "Địa điểm";
          const detail = [
            ...new Set(
              [
                text("street"),
                text("district"),
                text("city"),
                text("state"),
              ].filter((value) => value && value !== name),
            ),
          ].join(", ");
          return {
            lat: feature.geometry.coordinates[1],
            lng: feature.geometry.coordinates[0],
            name,
            detail,
            address: [name, detail].filter(Boolean).join(", "),
          };
        });
      if (cache.size >= 100) cache.delete(cache.keys().next().value!);
      cache.set(key, { until: Date.now() + 300000, places });
      return places;
    } catch {
      throw new HttpError(
        502,
        "Không thể tìm địa chỉ lúc này. Vui lòng thử lại hoặc nhập tọa độ thủ công.",
      );
    }
  };
  const work = load();
  pending.set(key, work);
  try {
    return { items: await work };
  } finally {
    pending.delete(key);
  }
}

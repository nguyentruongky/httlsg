import {
  apiRequest,
  PersonnelMissionsInput,
  type PersonnelMissionsData,
  type PersonnelMissionValue,
} from "@org/core";
import type { AssignedData, PersonnelQueryParams } from "./types";

export function getPersonnel(
  params: PersonnelQueryParams,
  page?: number,
  signal?: AbortSignal,
) {
  return apiRequest<AssignedData>(
    "/api/admin/roles/assigned?" +
      new URLSearchParams(
        page === undefined ? params : { ...params, page: String(page) },
      ),
    { signal },
  );
}
export function getPersonnelMissions(memberId: string, signal?: AbortSignal) {
  return apiRequest<PersonnelMissionsData>(
    `/api/admin/personnel/${memberId}/missions`,
    { signal },
  );
}
export function savePersonnelMissions(
  memberId: string,
  revision: string,
  missions: {
    kind: PersonnelMissionValue["kind"] | "";
    departmentId: string | null;
  }[],
) {
  return apiRequest(`/api/admin/personnel/${memberId}/missions`, {
    method: "PUT",
    body: JSON.stringify(PersonnelMissionsInput.parse({ revision, missions })),
  });
}

import type { DirectoryMember, MemberDetailInput } from "@org/core";

export function valuesFor(m: DirectoryMember): MemberDetailInput {
  return {
    name: m.user.name,
    email: m.user.email ?? "",
    phone: m.phone ?? "",
    dateOfBirth: m.dateOfBirth ?? "",
    address: m.address ?? "",
    occupation: m.occupation ?? "",
    bio: m.bio,
    departmentIds: m.departments.map((d) => d.id),
    departmentRoles: Object.fromEntries(
      m.departments.map((d) => [
        d.id,
        d.position === "Chưa cập nhật" ? "" : d.position,
      ]),
    ),
    area: m.area ?? "",
    location: m.location ?? "",
    position: m.position,
    familyName: m.family?.name ?? "",
    churchStatus: m.churchStatus ?? "",
    chuyenHoiDen: m.chuyenHoiDen ?? "",
    previousChurchStatus: m.previousChurchStatus ?? "",
    familyMembers:
      m.family?.members.map(({ id, relationship }) => ({ id, relationship })) ??
      [],
    faithDate: m.faithDate ?? "",
    baptismDate: m.baptismDate ?? "",
    lastVisitDate: m.lastVisitDate ?? "",
    preferredName: m.preferredName,
    gender: m.gender,
    householdRole: m.householdRole,
  };
}

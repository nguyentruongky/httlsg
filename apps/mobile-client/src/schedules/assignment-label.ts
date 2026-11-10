export function assignmentResponsibilityLabel(value: string) {
  const normalized = value.replace(/[.\s]/g, "").toLocaleLowerCase("vi");
  if (normalized === "hdtp") return "Hướng dẫn chương trình";
  if (normalized === "hdhát") return "Hướng dẫn ngợi khen thờ phượng";
  return value;
}

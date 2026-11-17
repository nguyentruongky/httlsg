export function formatVisitDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

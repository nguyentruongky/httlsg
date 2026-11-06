import { ChevronLeft } from "lucide-react";

export function ProfileBackButton() {
  return (
    <a
      href="#/profile"
      aria-label="Quay lại hồ sơ cá nhân"
      className="-ml-2 inline-flex min-h-11 items-center gap-0.5 pr-3 text-base font-medium text-primary focus-visible:rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <ChevronLeft size={28} strokeWidth={2} aria-hidden="true" />
      Cá nhân
    </a>
  );
}

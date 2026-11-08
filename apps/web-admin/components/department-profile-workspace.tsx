"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useWorkspace } from "@org/core";
import { MemberDetail } from "../../mobile-client/src/member-detail";
import { DepartmentMembers } from "./department-members";
export function DepartmentProfileWorkspace({
  department,
}: {
  department: { id: string; name: string };
}) {
  const router = useRouter(),
    pathname = usePathname(),
    params = useSearchParams();
  const memberId = params.get("member");
  const [retainedMember, setRetainedMember] = useState(memberId);
  const [exiting, setExiting] = useState(false);
  const retained = useRef(memberId);
  const profileId = memberId ?? retainedMember;
  useLayoutEffect(() => {
    if (memberId) {
      retained.current = memberId;
      setRetainedMember(memberId);
      setExiting(false);
      return;
    }
    if (!retained.current) return;
    const animate =
      window.matchMedia?.("(max-width: 1023px)").matches &&
      !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (!animate) {
      retained.current = null;
      setRetainedMember(null);
      setExiting(false);
      return;
    }
    setExiting(true);
    const timer = setTimeout(() => {
      retained.current = null;
      setRetainedMember(null);
      setExiting(false);
    }, 280);
    return () => clearTimeout(timer);
  }, [memberId]);
  useLayoutEffect(() => {
    if (!profileId) return;
    document.documentElement.classList.add("department-profile-open");
    document.body.classList.add("department-profile-open");
    return () => {
      document.documentElement.classList.remove("department-profile-open");
      document.body.classList.remove("department-profile-open");
    };
  }, [Boolean(profileId)]);

  const pushed = useRef(false),
    scroll = useRef(0),
    back = useRef<HTMLButtonElement>(null);
  const hadProfile = useRef(Boolean(memberId));
  const opener = useRef<HTMLElement | null>(null);
  const org = useWorkspace((state) => state.organizationId);
  function href(id: string) {
    const next = new URLSearchParams(params.toString());
    next.set("member", id);
    return pathname + "?" + next.toString();
  }
  function open(id: string) {
    if (!memberId) {
      pushed.current = true;
      opener.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      scroll.current = window.scrollY;
      router.push(href(id), { scroll: false });
    } else router.replace(href(id), { scroll: false });
  }
  function close() {
    if (exiting) return;
    const next = new URLSearchParams(params.toString());
    next.delete("member");
    if (pushed.current) {
      pushed.current = false;
      router.back();
    } else
      router.replace(pathname + (next.size ? "?" + next.toString() : ""), {
        scroll: false,
      });
  }
  useEffect(() => {
    let frame: number | undefined;
    if (memberId) back.current?.focus({ preventScroll: true });
    else if (hadProfile.current) {
      pushed.current = false;
      frame = requestAnimationFrame(() => {
        window.scrollTo({ top: scroll.current, behavior: "instant" });
        if (opener.current?.isConnected)
          opener.current.focus({ preventScroll: true });
      });
    }
    hadProfile.current = Boolean(memberId);
    return () => {
      if (frame !== undefined) cancelAnimationFrame(frame);
    };
  }, [memberId]);
  return (
    <div
      className={
        profileId
          ? "department-profile-workspace grid min-w-0 max-w-full gap-5 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]"
          : "department-profile-workspace min-w-0 max-w-full"
      }
    >
      <div
        className={
          (memberId ? "hidden lg:block " : "") +
          "min-w-0 max-w-full overflow-x-clip overscroll-x-none"
        }
      >
        <DepartmentMembers
          key={department.id}
          department={department}
          embedded
          onOpenProfile={open}
          profileHref={href}
        />
      </div>
      {profileId && (
        <aside
          key={profileId}
          data-exiting={exiting ? "true" : undefined}
          inert={exiting}
          aria-hidden={exiting ? true : undefined}
          aria-label="Hồ sơ thành viên Ban ngành"
          className="department-profile-push fixed inset-0 z-40 min-w-0 max-w-full overflow-x-hidden overflow-y-auto overscroll-contain overscroll-x-none bg-background px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] lg:sticky lg:inset-auto lg:top-24 lg:self-start lg:z-auto lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto lg:overflow-x-clip lg:rounded-xl lg:border lg:p-4"
        >
          <header className="sticky top-0 z-10 mb-4 flex items-center gap-3 bg-background/95 py-2 backdrop-blur-md">
            <button
              type="button"
              ref={back}
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={"Về danh sách " + department.name}
              onClick={close}
              disabled={exiting}
            >
              <ArrowLeft className="size-5" aria-hidden="true" />
            </button>
            <p className="min-w-0 break-words font-semibold">
              {department.name}
            </p>
          </header>
          <MemberDetail
            org={org}
            memberId={profileId}
            returnHref={pathname}
            onBack={close}
            hideBackButton
            onOpenMember={open}
            memberHref={href}
          />
        </aside>
      )}
    </div>
  );
}

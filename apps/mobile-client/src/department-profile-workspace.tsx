"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useWorkspace } from "@org/core";
import { MemberDetail } from "./member-detail";
import { DepartmentMembers } from "./department-members";
import {
  usePathname,
  useClientSearch,
  navigateClient,
  goBackClient,
  isNativeHistoryNavigation,
} from "./client-router";
export function DepartmentProfileWorkspace({
  department,
}: {
  department: { id: string; name: string };
}) {
  const pathname = usePathname();
  const search = useClientSearch();
  const params = new URLSearchParams(search);
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
      !isNativeHistoryNavigation() &&
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
      navigateClient(href(id));
    } else navigateClient(href(id), true);
  }
  function close() {
    if (exiting) return;
    const next = new URLSearchParams(params.toString());
    next.delete("member");
    if (pushed.current) {
      pushed.current = false;
      goBackClient();
    } else
      navigateClient(pathname + (next.size ? "?" + next.toString() : ""), true);
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
      data-profile-open={Boolean(memberId)}
      data-native-history={isNativeHistoryNavigation()}
      className={
        profileId
          ? "department-profile-workspace grid min-w-0 max-w-full gap-5 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]"
          : "department-profile-workspace min-w-0 max-w-full"
      }
    >
      <div className="department-profile-list min-w-0 max-w-full overflow-x-clip overscroll-x-none">
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
          data-exiting={exiting}
          className="department-profile-push fixed inset-0 md:top-20 z-40 min-w-0 max-w-full overflow-x-hidden overflow-y-auto overscroll-contain overscroll-x-none bg-background px-3 pt-3 sm:px-5 sm:pt-5 pb-[max(1rem,env(safe-area-inset-bottom))] lg:sticky lg:inset-auto lg:top-24 lg:self-start lg:z-auto lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto lg:overflow-x-clip lg:rounded-xl lg:border lg:p-4"
        >
          <div className="mb-4 flex h-11 min-h-11 items-center gap-3 bg-background">
            <button
              ref={back}
              type="button"
              aria-label="Quay lại"
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-primary"
              onClick={close}
            >
              <ArrowLeft className="size-5" aria-hidden="true" />
            </button>
          </div>
          <MemberDetail
            key={`${org}-${profileId}-profile`}
            org={org}
            memberId={profileId}
            team={false}
            returnHref={href(department.id)}
            onBack={close}
            hideBackButton
          />
        </aside>
      )}
    </div>
  );
}

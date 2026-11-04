import { useEffect, useRef, useSyncExternalStore } from "react";
import { Users, UserRound } from "lucide-react";
import { useWorkspace } from "@org/core";
import { Button, cn } from "@org/ui";
import { MemberDirectory } from "./member-directory";
import { MemberDetail } from "./member-detail";
function subscribe(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}
function useRoute() {
  return useSyncExternalStore(
    subscribe,
    () => window.location.hash || "#/members",
    () => "#/members",
  );
}
const tabs = [
  { id: "members", label: "Danh sách", icon: Users },
  { id: "profile", label: "Cá nhân", icon: UserRound },
] as const;
export function App() {
  const { organizationId, setTab } = useWorkspace();
  const route = useRoute();
  const profile = route === "#/profile";
  const memberId = route.startsWith("#/members/")
    ? route.slice("#/members/".length)
    : undefined;
  const directory = route === "#/members" || route === "#/" || route === "#";
  const valid = directory || profile || Boolean(memberId);
  const scroll = useRef(0);
  const previous = useRef(route);
  useEffect(() => {
    setTab(profile ? "profile" : "members");
    if (previous.current !== route) {
      window.scrollTo({
        top: directory ? scroll.current : 0,
        behavior: "instant",
      });
      previous.current = route;
    }
  }, [route, directory, profile, setTab]);
  function rememberScroll() {
    if (directory) scroll.current = window.scrollY;
  }
  return (
    <div className="min-h-dvh bg-muted/50">
      <div className="relative mx-auto min-h-dvh max-w-md border-x bg-background shadow-sm">
        <main
          id="mobile-content"
          className="px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-[calc(7rem_+_env(safe-area-inset-bottom))]"
        >
          <div key={organizationId} hidden={!directory}>
            <MemberDirectory
              org={organizationId}
              active={directory}
              onOpen={rememberScroll}
            />
          </div>
          {memberId && (
            <div key={`${organizationId}-${memberId}`} className="page-enter">
              <MemberDetail org={organizationId} memberId={memberId} />
            </div>
          )}
          {profile && (
            <div key={`profile-${organizationId}`} className="page-enter">
              <MemberDetail org={organizationId} profile />
            </div>
          )}
          {!valid && (
            <div className="space-y-4 py-10 text-center">
              <h1 className="text-xl font-semibold">Không tìm thấy trang</h1>
              <Button asChild variant="outline">
                <a href="#/members">Về danh sách</a>
              </Button>
            </div>
          )}
        </main>
        {!memberId && (
          <nav
            aria-label="Điều hướng thành viên"
            className="fixed bottom-0 left-1/2 z-40 flex w-full max-w-md -translate-x-1/2 items-start border-x border-t border-border/40 bg-background/80 px-5 pb-[max(.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-md"
          >
            {tabs.map(({ id, label, icon: Icon }) => {
              const active = id === "profile" ? profile : !profile;
              return (
                <a
                  key={id}
                  href={`#/${id}`}
                  onClick={rememberScroll}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex min-h-14 flex-1 flex-col items-center justify-center gap-1 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  <Icon
                    size={23}
                    strokeWidth={active ? 2.2 : 1.6}
                    fill={active ? "currentColor" : "none"}
                    fillOpacity={0.1}
                  />
                  <span className="text-xs font-medium">{label}</span>
                  {active && (
                    <span className="absolute bottom-0 h-0.5 w-4 rounded-full bg-primary" />
                  )}
                </a>
              );
            })}
          </nav>
        )}
      </div>
    </div>
  );
}

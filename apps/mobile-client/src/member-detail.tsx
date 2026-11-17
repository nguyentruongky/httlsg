import { canEditMemberDetails, isUserOnly } from "@org/core";
import { Button } from "@org/ui";
import { PwaInstallSettings } from "./pwa-settings";
import { DirectoryLoading } from "./member-directory";
import { ClientError } from "./locale";
import { MemberInformation } from "./member-profile/member-information";
import { ProfileSettings } from "./member-profile/profile-settings";
import { useMemberDetail } from "./member-profile/use-member-detail";
import { goBackClient } from "./client-router";

export function MemberDetail({
  org,
  memberId,
  profile = false,
  team = false,
  returnHref,
  onBack,
  hideBackButton = false,
  onOpenMember,
  memberHref,
}: {
  org: string;
  memberId?: string;
  profile?: boolean;
  team?: boolean | "board";
  returnHref?: string;
  onBack?: () => void;
  hideBackButton?: boolean;
  onOpenMember?: (id: string) => void;
  memberHref?: (id: string) => string;
}) {
  const { query, actor, user, persist, refresh } = useMemberDetail({
    org,
    memberId,
    profile,
    team,
  });
  const profileOnly = Boolean(user && isUserOnly(user));
  const previousProfile = window.history.state?.memberPreviousProfileHref;
  const mobileProfileBack =
    !profile &&
    !returnHref &&
    !onBack &&
    window.matchMedia("(max-width: 1023px)").matches &&
    typeof previousProfile === "string" &&
    /^\/client\/(?:profile|(?:members|(?:leader|board)\/members)\/[^/]+)$/.test(
      previousProfile,
    )
      ? previousProfile
      : undefined;
  const handleBack = onBack ?? (mobileProfileBack ? goBackClient : undefined);
  const origin = window.history.state?.memberReturnHref;
  const dashboardReturn =
    typeof origin === "string" &&
    [
      "/dashboard/members",
      "/dashboard/admin/roles/members",
      "/client/personnel",
    ].includes(origin)
      ? origin
      : undefined;
  const back =
    returnHref ??
    mobileProfileBack ??
    dashboardReturn ??
    (profileOnly
      ? "/client/profile"
      : team
        ? "/client/" + (team === "board" ? "board" : "leader") + "/members"
        : "/client/members");
  if (query.isPending) return <DirectoryLoading />;
  if (query.isError && !query.data)
    return (
      <div className="space-y-4">
        <ClientError error={query.error} />
        <Button variant="outline" onClick={() => query.refetch()}>
          Thử lại
        </Button>
        <Button asChild variant="ghost">
          <a
            href={back}
            onClick={(event) => {
              if (handleBack) {
                event.preventDefault();
                handleBack();
              }
            }}
          >
            Về danh sách
          </a>
        </Button>
      </div>
    );
  if (!query.data) return <DirectoryLoading />;
  return (
    <section aria-label={profile ? "Hồ sơ cá nhân" : "Chi tiết thành viên"}>
      {profile && <PwaInstallSettings />}
      <MemberInformation
        key={`${org}-${query.data.id}-${team}`}
        org={org}
        member={query.data}
        profile={profile}
        backHref={back}
        onBack={handleBack}
        hideBackButton={hideBackButton}
        onOpenMember={onOpenMember}
        memberHref={memberHref}
        editable={
          query.data.canEdit ?? canEditMemberDetails(actor.data, query.data)
        }
        onUpdated={refresh}
        onPersist={persist}
      />
      {profile && <ProfileSettings />}
    </section>
  );
}

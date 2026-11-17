import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, isApiMode, type DirectoryMember } from "@org/core";
export function useMemberHistory(
  org: string,
  member: DirectoryMember,
  allowed: boolean,
) {
  const [target, setTarget] = useState<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!target) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [target]);
  const query = useQuery({
    queryKey: ["organizations", org, "member-history", member.id],
    queryFn: ({ signal }) =>
      apiRequest<
        Pick<DirectoryMember, "notes" | "visitHistory" | "lastVisitDate">
      >(`/api/members/${member.id}/history`, { signal }),
    enabled:
      isApiMode() && member.historyLoaded === false && allowed && visible,
  });
  return {
    setTarget,
    loading: member.historyLoaded === false && !query.data,
    error: query.error,
    retry: query.refetch,
    notes: query.data?.notes ?? member.notes,
    visitHistory: query.data?.visitHistory ?? member.visitHistory,
  };
}

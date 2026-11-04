import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { demo, type Snapshot } from "./demo";
export const workspaceKey = (org: string) =>
  ["organizations", org, "workspace"] as const;
export function useOrganization(org: string) {
  return useQuery({
    queryKey: workspaceKey(org),
    queryFn: () => demo.get(org),
    staleTime: 30_000,
    refetchInterval: 15_000,
  });
}
export function useCompleteTask(org: string) {
  const client = useQueryClient();
  const key = workspaceKey(org);
  return useMutation({
    mutationFn: ({ id, version }: { id: string; version: number }) =>
      demo.complete(org, id, version),
    onMutate: async ({ id }) => {
      await client.cancelQueries({ queryKey: key });
      const previous = client.getQueryData<Snapshot>(key);
      client.setQueryData<Snapshot>(key, (s) =>
        s
          ? {
              ...s,
              tasks: s.tasks.map((t) =>
                t.id === id
                  ? {
                      ...t,
                      status: "completed",
                      completedAt: new Date().toISOString(),
                    }
                  : t,
              ),
            }
          : s,
      );
      return { previousTask: previous?.tasks.find((t) => t.id === id) };
    },
    onError: (_error, input, context) => {
      if (context?.previousTask)
        client.setQueryData<Snapshot>(key, (s) =>
          s
            ? {
                ...s,
                tasks: s.tasks.map((t) =>
                  t.id === input.id ? context.previousTask! : t,
                ),
              }
            : s,
        );
    },
    onSettled: () => client.invalidateQueries({ queryKey: key }),
  });
}

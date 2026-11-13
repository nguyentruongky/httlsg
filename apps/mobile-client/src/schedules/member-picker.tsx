"use client";
import { AutoLoadMore } from "../auto-load-more";
import { useEffect, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { apiRequest } from "@org/core";
import { Avatar, Button, Input, ErrorMessage } from "@org/ui";
import { X } from "lucide-react";
export type SchedulePerson = { id: string; name: string; identifier?: string };
export function ScheduleMemberPicker({
  categoryId,
  onPick,
  selected = [],
  admin = false,
}: {
  categoryId: string;
  onPick: (person: SchedulePerson) => void;
  selected?: string[];
  admin?: boolean;
}) {
  const [search, setSearch] = useState(""),
    [term, setTerm] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setTerm(search.trim()), 250);
    return () => clearTimeout(timer);
  }, [search]);
  const query = useInfiniteQuery({
    queryKey: ["schedule-member-search", categoryId, term, admin],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      apiRequest<{ items: SchedulePerson[]; nextPage: number | null }>(
        admin
          ? "/api/admin/members/search?" +
              new URLSearchParams({ q: term, page: String(pageParam) })
          : "/api/schedule-members?" +
              new URLSearchParams({
                categoryId,
                q: term,
                page: String(pageParam),
              }),
      ),
    getNextPageParam: (page) => page.nextPage ?? undefined,
    enabled: term.length >= 2,
  });
  return (
    <div className="space-y-2">
      <div className="relative">
        <Input
          aria-label="Tìm thành viên để phân công"
          autoComplete="off"
          placeholder="Tìm theo tên, số điện thoại hoặc email"
          className="min-h-11 w-full pr-11"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        {search && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0 size-11"
            aria-label="Xóa tìm thành viên"
            onClick={() => {
              setSearch("");
              setTerm("");
            }}
          >
            <X size={17} />
          </Button>
        )}
      </div>
      {term.length >= 2 &&
        (query.isPending ? (
          <p role="status">Đang tìm…</p>
        ) : query.error ? (
          <ErrorMessage error={query.error} />
        ) : (
          <div className="divide-y rounded-lg border px-3">
            {query.data?.pages
              .flatMap((page) => page.items)
              .map((person) => (
                <button
                  type="button"
                  key={person.id}
                  disabled={selected.includes(person.id)}
                  className="flex min-h-14 w-full items-center gap-3 py-3 text-left disabled:opacity-50"
                  onClick={() => {
                    onPick(person);
                    setSearch("");
                    setTerm("");
                  }}
                >
                  <Avatar name={person.name} className="size-10 shrink-0" />
                  <span className="min-w-0 break-words">
                    <span className="block font-medium">{person.name}</span>
                    {person.identifier && (
                      <span className="block text-sm text-muted-foreground">
                        {person.identifier}
                      </span>
                    )}
                  </span>
                  <span className="ml-auto shrink-0 text-sm text-primary">
                    {selected.includes(person.id) ? "Đã chọn" : "Chọn"}
                  </span>
                </button>
              ))}
            {!query.data?.pages[0].items.length && (
              <p className="py-3 text-sm text-muted-foreground">
                Không tìm thấy thành viên.
              </p>
            )}
            <AutoLoadMore query={query} />
          </div>
        ))}
    </div>
  );
}

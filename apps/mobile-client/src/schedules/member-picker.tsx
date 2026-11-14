"use client";
import { PersonCard } from "../person-card";
import { FilterChips } from "../filter-chips";
import { useDebouncedSearch } from "../use-debounced-search";

import { AutoLoadMore } from "../auto-load-more";
import { useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { apiRequest } from "@org/core";
import { Button, Input, ErrorMessage } from "@org/ui";
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
  const [search, setSearch] = useState("");
  const term = useDebouncedSearch(search);
  const query = useInfiniteQuery({
    queryKey: ["schedule-member-search", categoryId, term, admin],
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
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
        { signal },
      ),
    getNextPageParam: (page) => page.nextPage ?? undefined,
    enabled: term.length >= 2 && term === search.trim(),
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
            }}
          >
            <X size={17} />
          </Button>
        )}
      </div>
      <FilterChips
        chips={
          search.trim()
            ? [
                {
                  key: "search",
                  label: search.trim(),
                  onRemove: () => setSearch(""),
                },
              ]
            : []
        }
      />
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
                <div key={person.id} className="py-2">
                  <PersonCard
                    name={person.name}
                    departments={person.identifier}
                    disabled={selected.includes(person.id)}
                    onOpen={() => {
                      onPick(person);
                      setSearch("");
                    }}
                    className="w-full border-0 bg-transparent p-0"
                    actions={
                      <span className="text-sm text-primary">
                        {selected.includes(person.id) ? "Đã chọn" : "Chọn"}
                      </span>
                    }
                  />
                </div>
              ))}
            {!query.data?.pages[0].items.length && (
              <p className="py-3 text-sm text-muted-foreground">
                Không tìm thấy thành viên.
              </p>
            )}
            <AutoLoadMore query={query} enabled={term === search.trim()} />
          </div>
        ))}
    </div>
  );
}

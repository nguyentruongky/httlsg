"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InviteSchema, demo, workspaceKey, type Invite } from "@org/core";
import { Button, Dialog, Input, Select, ErrorMessage } from "@org/ui";
import { Plus } from "lucide-react";
export function InviteDialog({ org }: { org: string }) {
  const [open, setOpen] = useState(false);
  const client = useQueryClient();
  const form = useForm<Invite>({
    resolver: zodResolver(InviteSchema),
    defaultValues: { name: "", email: "", role: "member" },
  });
  const mutation = useMutation({
    mutationFn: (input: Invite) => demo.invite(org, input),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: workspaceKey(org) });
      setOpen(false);
      form.reset();
    },
  });
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) mutation.reset();
      }}
      title="Invite a member"
      description="Add someone to your community. Demo mode records the invitation locally."
      trigger={
        <Button>
          <Plus size={16} />
          Invite member
        </Button>
      }
    >
      <form
        onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
        className="space-y-4"
      >
        {(["name", "email"] as const).map((field) => (
          <div key={field}>
            <label
              htmlFor={`invite-${field}`}
              className="mb-1.5 block text-sm font-medium capitalize"
            >
              {field}
            </label>
            <Input
              id={`invite-${field}`}
              type={field === "email" ? "email" : "text"}
              autoComplete={field}
              {...form.register(field)}
              aria-invalid={!!form.formState.errors[field]}
              aria-describedby={`error-${field}`}
            />
            <p id={`error-${field}`} className="mt-1 text-xs text-destructive">
              {form.formState.errors[field]?.message}
            </p>
          </div>
        ))}
        <div>
          <label
            htmlFor="invite-role"
            className="mb-1.5 block text-sm font-medium"
          >
            Role
          </label>
          <Select
            id="invite-role"
            {...form.register("role")}
            className="w-full"
          >
            <option value="member">Member</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
          </Select>
        </div>
        {mutation.isError && <ErrorMessage error={mutation.error} />}
        <Button type="submit" className="w-full" disabled={mutation.isPending}>
          {mutation.isPending ? "Adding member…" : "Create demo invitation"}
        </Button>
      </form>
    </Dialog>
  );
}

"use client";
import { Button, ErrorMessage } from "@org/ui";
export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="space-y-4">
      <ErrorMessage error={error} />
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}

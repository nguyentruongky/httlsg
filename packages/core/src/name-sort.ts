// Vietnamese names are displayed in full, but ordered by their final word.
export function compareNamesByLastWord(a: string, b: string) {
  const last = (name: string) => name.trim().split(/\s+/u).at(-1) ?? "";
  return (
    last(a).localeCompare(last(b), "vi", { sensitivity: "base" }) ||
    a.localeCompare(b, "vi", { sensitivity: "base" })
  );
}

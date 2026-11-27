export function stripDiacritics(str: string): string {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function searchMatches(name: string, query: string): boolean {
  const nameNorm = stripDiacritics(name.toLowerCase());
  const queryNorm = stripDiacritics(query.trim().toLowerCase());
  if (!queryNorm) return false;
  const queryWords = queryNorm.split(/\s+/).filter(Boolean);
  const nameWords = nameNorm.split(/\s+/);
  return queryWords.every((qw) => nameWords.some((nw) => nw.startsWith(qw)));
}

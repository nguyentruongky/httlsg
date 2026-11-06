/** Encode each query value once, preserving literal +, %, Unicode and newlines. */
function encodeQueryValue(value: string): string {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (character) => "%" + character.charCodeAt(0).toString(16).toUpperCase(),
  );
}
/** A user-initiated draft, never automatic group delivery. Client support varies. */
export function createWorshipViberDraftLink(message: string): string {
  return (
    "viber://chat?number=" +
    encodeQueryValue("+84397092176") +
    "&draft=" +
    encodeQueryValue(message)
  );
}

export function createWorshipViberRecipientLink(): string {
  return "viber://chat?number=" + encodeQueryValue("+84397092176");
}

/** Diagnostic counts only: no asserted limit for the undocumented chat draft. */
export function getWorshipViberDiagnostics(message: string) {
  const link = createWorshipViberDraftLink(message);
  const encodedDraft = link.split("&draft=")[1];
  return {
    characterCount: Array.from(message).length,
    utf16Length: message.length,
    utf8Bytes: new TextEncoder().encode(message).length,
    encodedDraftLength: encodedDraft.length,
    urlLength: link.length,
    roundTripMatches: decodeURIComponent(encodedDraft) === message,
    strategy: "direct-link" as const,
  };
}

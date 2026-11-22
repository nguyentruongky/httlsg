export const WORSHIP_WORKER_CATEGORIES = {
  hdct: "HDCT",
  hd_hat: "HD Hát",
  ban_hat_thieu_nhien: "Ban hát Thiếu niên",
  ban_hat_thanh_trang: "Ban hát Thanh tráng",
  ban_hat_thanh_nien: "Ban hát Thanh niên",
  ban_hat_phu_nu: "Ban hát Phụ nữ",
  ban_hat_trung_nien: "Ban hát Trung niên",
  ban_hat_trang_nien: "Ban hát Tráng niên",
  ban_hat_lao_nien: "Ban hát Lão niên",
} as const;
export type WorshipWorkerCategory = keyof typeof WORSHIP_WORKER_CATEGORIES;
export function worshipWorkerCategorySearchTerms(
  category: WorshipWorkerCategory,
) {
  const label = WORSHIP_WORKER_CATEGORIES[category];
  return category.startsWith("ban_hat_")
    ? [
        label,
        label.replace(/^Ban hát /, "Ban "),
        label.replace(/^Ban hát /, ""),
      ]
    : [label];
}

export type WorshipWorker = {
  id: string;
  category: WorshipWorkerCategory;
  fullName: string;
  phone: string | null;
  email: string | null;
  roleLabel: string | null;
};
export type WorshipPersonInCharge = {
  id: string;
  memberId: string | null;
  name: string;
  categories: WorshipWorkerCategory[];
  phone: string | null;
  email: string | null;
  roleLabel: string | null;
  hasAccount: boolean;
  pushEnabled: boolean;
};
export const normalizeWorshipWorkerText = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

/** Specific choir names take precedence over the generic Ban hát category. */
export function detectWorshipWorkerCategories(
  text: string,
  includeGenericChoirs = true,
): WorshipWorkerCategory[] {
  const normalized = normalizeWorshipWorkerText(text);
  const categories: WorshipWorkerCategory[] = [];
  if (/\bhd\s*c\s*t\b/.test(normalized)) categories.push("hdct");
  if (/\bhd\s+hat\b/.test(normalized)) categories.push("hd_hat");
  const choirs = Object.entries(WORSHIP_WORKER_CATEGORIES).filter(([key]) =>
    key.startsWith("ban_hat_"),
  );
  let remainder = normalized;
  for (const [key, label] of choirs) {
    const pattern = new RegExp(
      "\\b" + normalizeWorshipWorkerText(label) + "\\b",
      "g",
    );
    if (pattern.test(normalized)) categories.push(key as WorshipWorkerCategory);
    remainder = remainder.replace(pattern, "");
  }
  if (includeGenericChoirs && /\bban hat\b/.test(remainder))
    categories.push(...choirs.map(([key]) => key as WorshipWorkerCategory));
  return [...new Set(categories)];
}
export function stripLeadingWorkerMentions(text: string) {
  return text.replace(
    /^(?:[ \t]*@[^\r\n]*(?:\r\n|\n|\r|$)[ \t]*(?:\r\n|\n|\r)?)*/,
    "",
  );
}
export function prependWorkerMentions(
  text: string,
  workers: readonly { fullName: string }[],
) {
  const existing = [...text.matchAll(/@([^@\r\n,;]+)/gu)].map((match) =>
    normalizeWorshipWorkerText(match[1]),
  );
  const added = new Set<string>();
  const names = workers
    .filter((worker) => {
      const name = normalizeWorshipWorkerText(worker.fullName);
      if (
        added.has(name) ||
        existing.some(
          (mention) => mention === name || mention.startsWith(name + " "),
        )
      )
        return false;
      added.add(name);
      return true;
    })
    .map((worker) => "@" + worker.fullName);
  return names.length ? names.join(" ") + "\n" + text : text;
}

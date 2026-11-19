import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function normalizeSearch(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s\u00C0-\u024F]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function debounce<T extends (...args: any[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export function matchesSearch(
  value: string | null | undefined,
  query: string
): boolean {
  if (!query) return true;
  if (!value) return false;
  const normValue = normalizeSearch(value);
  const normQuery = normalizeSearch(query);
  return normValue.includes(normQuery);
}

export function displayChurchName(form: string | null | undefined, name: string): string {
  const f = (form || '').trim().toLowerCase();
  const capitalized = capitalize(name);
  if (f.includes('chi hội')) return `Hội Thánh ${capitalized}`;
  if (f.includes('hội nhánh')) return `Hội nhánh ${capitalized}`;
  if (f.includes('điểm nhóm')) return `Điểm nhóm ${capitalized}`;
  return capitalized;
}

export function displayPastorName(title: string | null | undefined, name: string): string {
  const capitalized = capitalize(name);
  const t = (title || 'Mục sư').trim();
  return `${t} ${capitalized}`;
}

export function capitalize(value: string | null | undefined): string {
  if (!value) return '';
  return value
    .toLowerCase()
    .split(' ')
    .map((w) => {
      const firstLetterIdx = w.search(/\p{L}/u);
      if (firstLetterIdx === -1) return w;
      return (
        w.slice(0, firstLetterIdx) +
        w.charAt(firstLetterIdx).toUpperCase() +
        w.slice(firstLetterIdx + 1)
      );
    })
    .join(' ');
}

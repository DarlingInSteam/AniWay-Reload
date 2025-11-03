const SLUG_SAFE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const TRANSLIT_MAP: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l',
  м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh',
  щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya'
};

function transliterate(value: string): string {
  let result = '';
  for (const rawChar of value.toLowerCase()) {
    if (TRANSLIT_MAP[rawChar as keyof typeof TRANSLIT_MAP]) {
      result += TRANSLIT_MAP[rawChar as keyof typeof TRANSLIT_MAP];
      continue;
    }
    result += rawChar;
  }
  return result;
}

function normalizeSlugCandidate(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (SLUG_SAFE_PATTERN.test(trimmed)) {
    return trimmed;
  }
  return slugifyText(trimmed);
}

export function slugifyText(value?: string | null): string | null {
  if (!value) return null;
  const transliterated = transliterate(value);
  const ascii = transliterated
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // strip combining marks
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/_/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return ascii || null;
}

export function resolveMangaSlug(source?: Record<string, unknown> | null): string | null {
  if (!source) return null;

  const directCandidates = [
    (source as Record<string, unknown>).slug,
    (source as Record<string, unknown>).mangaSlug,
    (source as Record<string, unknown>).melonSlug,
    (source as Record<string, unknown>).slugLatin,
    (source as Record<string, unknown>).slugEn,
    (source as Record<string, unknown>)['slug_en'],
    (source as Record<string, unknown>)['slug_ru'],
    (source as Record<string, unknown>).slugRu
  ];

  for (const candidate of directCandidates) {
    const normalized = normalizeSlugCandidate(candidate);
    if (normalized) {
      return normalized;
    }
  }

  const titleCandidate = normalizeSlugCandidate((source as Record<string, unknown>).title);
  if (titleCandidate) {
    return titleCandidate;
  }

  const fallbackFields = ['alternativeTitles', 'alternativeNames', 'altTitles', 'altNames'] as const;
  for (const field of fallbackFields) {
    const raw = (source as Record<string, unknown>)[field];
    if (!raw) continue;

    if (Array.isArray(raw)) {
      for (const entry of raw) {
        const normalized = normalizeSlugCandidate(entry);
        if (normalized) return normalized;
      }
    } else if (typeof raw === 'string') {
      const parts = raw.split(/[,;\n]+/);
      for (const part of parts) {
        const normalized = normalizeSlugCandidate(part);
        if (normalized) return normalized;
      }
    }
  }

  return null;
}

export function buildReaderPath(chapterId: number | string, mangaSlug?: string | null): string {
  const id = String(chapterId).trim();
  const slugCandidate = normalizeSlugCandidate(mangaSlug ?? null);
  if (slugCandidate) {
    return `/reader/${slugCandidate}/${id}`;
  }
  return `/reader/${id}`;
}

export function ensureReaderSlug(currentSlug: string | undefined, fallbackSource?: Record<string, unknown> | null): string | null {
  return normalizeSlugCandidate(currentSlug ?? null) ?? resolveMangaSlug(fallbackSource ?? null);
}

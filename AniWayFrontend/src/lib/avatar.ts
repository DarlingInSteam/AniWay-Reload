// Utility helpers for resolving avatar URLs consistently across components
// Tries multiple possible field names and normalizes relative paths

export function extractAvatar(raw: any): string | undefined {
  if(!raw) return undefined;
  const candidate = raw.avatarUrl || raw.userAvatarUrl || raw.userAvatar || raw.profileImageUrl || raw.imageUrl || raw.avatar || raw.avatarURL || raw.profileAvatar || raw.avatarPath;
  return normalizeAvatarUrl(candidate);
}

export function normalizeAvatarUrl(url?: string): string | undefined {
  if(!url || typeof url !== 'string') return undefined;
  // Trim and handle data/base64 directly
  const trimmed = url.trim();
  if(trimmed.startsWith('data:')) return trimmed;
  if(/^https?:\/\//i.test(trimmed)) return trimmed;
  // Avoid empty or placeholder values
  if(!trimmed || trimmed === 'null' || trimmed === 'undefined') return undefined;
  // Prepend API host if relative (heuristic: starts with / or no protocol)
  // Access Vite env with any cast to avoid TS complaining in isolated util context
  const base = (import.meta as any)?.env?.VITE_API_BASE_URL || '';
  if(trimmed.startsWith('/')) return base ? base.replace(/\/$/,'') + trimmed : trimmed;
  // If it's something like uploads/avatars/.. also prepend
  if(!trimmed.startsWith('http')) return base ? base.replace(/\/$/,'') + '/' + trimmed : trimmed;
  return trimmed;
}

// Fallback letter
export function avatarFallbackLetter(name?: string): string {
  if(!name) return '?';
  const c = name.trim()[0];
  return c ? c.toUpperCase() : '?';
}

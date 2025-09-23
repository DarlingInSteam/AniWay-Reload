export function toProfileSlug(displayName?: string, username?: string) {
  const base = (displayName || username || '').toLowerCase().trim();
  const slug = base
    .replace(/[_\s]+/g,'-')
    .replace(/[^a-z0-9-]/g,'')
    .replace(/-+/g,'-')
    .replace(/^-|-$/g,'');
  return slug || 'user';
}

export function buildProfileUrl(id: number | string, displayName?: string, username?: string) {
  const slug = toProfileSlug(displayName, username);
  return `/profile/${id}--${slug}`;
}

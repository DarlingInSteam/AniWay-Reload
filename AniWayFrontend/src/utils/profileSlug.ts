export function buildProfileSlug(id: number, name?: string) {
  const base = (name || '').trim() || `user-${id}`
  let slug = base.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')
  if (slug.length > 40) slug = slug.slice(0,40)
  return `${id}--${slug || 'user'}`
}

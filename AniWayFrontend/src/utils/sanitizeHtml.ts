import DOMPurify from 'dompurify'

const hasBrowserContext = typeof window !== 'undefined'

export function sanitizeHtml(html: string): string {
  if (!html) return ''
  if (!hasBrowserContext) return DOMPurify.sanitize ? DOMPurify.sanitize(html) : html

  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'title', 'class', 'id', 'width', 'height'],
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z])/i
  })
}

export function sanitizePlainText(input: string): string {
  if (!input) return ''
  if (!hasBrowserContext) return DOMPurify.sanitize ? DOMPurify.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }) : input
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })
}

export default sanitizeHtml
// Стандартизированные категории модераторских причин
// Можно расширять без изменений логики — UI читает структуру динамически
export interface ModReasonCategory {
  code: string
  label: string
  templates: string[]
}

export const MOD_REASON_CATEGORIES: ModReasonCategory[] = [
  {
    code: 'ABUSE',
    label: 'Оскорбления / Токсичность',
    templates: [
      'Систематические оскорбления',
      'Токсичное поведение в комментариях',
      'Нарушение правил общения'
    ]
  },
  {
    code: 'SPAM',
    label: 'Спам / Реклама',
    templates: [
      'Массовая публикация однотипного контента',
      'Реклама сторонних ресурсов',
      'Авто-генерируемые бесполезные сообщения'
    ]
  },
  {
    code: 'NSFW',
    label: 'Недопустимый контент',
    templates: [
      'NSFW контент вне разрешённых зон',
      'Публикация неприемлемых материалов'
    ]
  },
  {
    code: 'DMCA',
    label: 'Авторские права',
    templates: [
      'Запрос правообладателя (DMCA)',
      'Нарушение лицензии'
    ]
  },
  {
    code: 'OTHER',
    label: 'Другое',
    templates: []
  }
]

export interface ModerationDiff { field: string; old: any; new: any }
export interface ModerationMeta { [k: string]: any }

// Строит сериализованную строку причины пока backend не поддерживает структуру.
// Формат: [CODE]|meta(k=v;...);diff(field:old→new;...)| текст
export function buildReason(
  reasonCode: string,
  humanReason: string,
  diff?: ModerationDiff[],
  meta?: ModerationMeta
) {
  const metaPart = meta && Object.keys(meta).length
    ? 'meta(' + Object.entries(meta).map(([k,v]) => `${k}=${v ?? '∅'}`).join(';') + ')'
    : ''
  const diffPart = diff && diff.length
    ? 'diff(' + diff.map(d => `${d.field}:${d.old ?? '∅'}→${d.new ?? '∅'}`).join(';') + ')'
    : ''
  const middle = [metaPart, diffPart].filter(Boolean).join(';')
  return `[${reasonCode}]${middle ? '|' + middle : ''}| ${humanReason}`.trim()
}

// Парсер сериализованной строки причины.
// Возвращает структурированные части для дальнейшего отображения и аудита.
export interface ParsedReason {
  code: string
  text: string
  meta: ModerationMeta
  diff: ModerationDiff[]
  raw: string
}

export function parseReason(raw: string): ParsedReason {
  const fallback: ParsedReason = { code: 'UNKNOWN', text: raw || '', meta: {}, diff: [], raw }
  if (!raw) return fallback
  const codeMatch = raw.match(/\[([^\]]+)\]/)
  const code = codeMatch ? codeMatch[1].trim() : 'UNKNOWN'
  let after = codeMatch ? raw.slice(codeMatch.index! + codeMatch[0].length) : raw
  after = after.trim()
  if (after.startsWith('|')) after = after.slice(1).trim()

  // Найдём последнюю вертикальную черту — правее неё человекочитаемый текст
  const lastPipe = after.lastIndexOf('|')
  let middle = ''
  let text = ''
  if (lastPipe >= 0) {
    middle = after.slice(0, lastPipe).trim()
    text = after.slice(lastPipe + 1).trim()
  } else {
    text = after.trim()
  }

  const meta: ModerationMeta = {}
  const diff: ModerationDiff[] = []

  if (middle) {
    // meta(...)
    const metaMatch = middle.match(/meta\(([^)]*)\)/)
    if (metaMatch) {
      const body = metaMatch[1]
      body.split(';').forEach(pair => {
        if (!pair) return
        const [k, v] = pair.split('=')
        meta[k] = v === '∅' ? null : v
      })
    }
    // diff(...)
    const diffMatch = middle.match(/diff\(([^)]*)\)/)
    if (diffMatch) {
      const body = diffMatch[1]
      body.split(';').forEach(item => {
        if (!item) return
        const [field, rest] = item.split(':')
        if (!field || rest === undefined) return
        const arrowIdx = rest.indexOf('→')
        if (arrowIdx === -1) return
        const oldVal = rest.slice(0, arrowIdx)
        const newVal = rest.slice(arrowIdx + 1)
        diff.push({ field, old: oldVal === '∅' ? null : oldVal, new: newVal === '∅' ? null : newVal })
      })
    }
  }

  return { code, text, meta, diff, raw }
}

// Функция подготовки полезной нагрузки: когда backend будет готов к структуре.
// Если флаг STRUCTURED_ADMIN_REASON выключен — фронт продолжает использовать сериализованную строку.
export function buildStructuredReasonPayload(parsed: ParsedReason) {
  return {
    reasonCode: parsed.code,
    reasonDetails: parsed.text,
    diff: parsed.diff,
    meta: parsed.meta
  }
}

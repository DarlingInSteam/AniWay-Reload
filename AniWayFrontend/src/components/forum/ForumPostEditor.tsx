import { useState } from 'react'

interface Props {
  value?: string;
  onSubmit: (content: string) => void;
  placeholder?: string;
  submitting?: boolean;
}

export function ForumPostEditor({ value = '', onSubmit, placeholder = 'Ваш ответ...', submitting }: Props) {
  const [text, setText] = useState(value)
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder={placeholder}
        className="h-32 w-full resize-none rounded-md bg-black/30 p-3 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
      />
      <div className="mt-3 flex justify-end">
        <button
          disabled={!text.trim() || submitting}
          onClick={() => onSubmit(text.trim())}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50 hover:bg-primary/90 transition"
        >
          {submitting ? 'Отправка...' : 'Отправить'}
        </button>
      </div>
    </div>
  )
}

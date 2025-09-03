import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Send, X } from 'lucide-react'

interface CommentFormProps {
  onSubmit: (content: string) => void
  onCancel?: () => void
  initialValue?: string
  placeholder?: string
  submitText?: string
  maxLength?: number
}

export function CommentForm({
  onSubmit,
  onCancel,
  initialValue = '',
  placeholder = 'Написать комментарий...',
  submitText = 'Отправить',
  maxLength = 1000
}: CommentFormProps) {
  const [content, setContent] = useState(initialValue)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!content.trim()) return

    setIsSubmitting(true)
    try {
      await onSubmit(content.trim())
      setContent('')
    } catch (error) {
      console.error('Error submitting comment:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSubmit(e)
    }
  }

  const isValid = content.trim().length > 0 && content.length <= maxLength

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="relative">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="min-h-[80px] resize-none bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-400 focus:border-primary"
          maxLength={maxLength}
        />
        <div className="absolute bottom-2 right-2 text-xs text-gray-500">
          {content.length}/{maxLength}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">
          Нажмите Ctrl+Enter для отправки
        </p>
        
        <div className="flex items-center space-x-2">
          {onCancel && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              <X className="h-4 w-4 mr-1" />
              Отмена
            </Button>
          )}
          
          <Button
            type="submit"
            size="sm"
            disabled={!isValid || isSubmitting}
            className="bg-primary hover:bg-primary/80"
          >
            {isSubmitting ? (
              <div className="h-4 w-4 mr-1 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <Send className="h-4 w-4 mr-1" />
            )}
            {submitText}
          </Button>
        </div>
      </div>
    </form>
  )
}

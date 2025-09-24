import React, { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize from 'rehype-sanitize'

// Minimal allow list extension (can be adjusted later)
// Using default schema from rehype-sanitize with additions for span + className
import { defaultSchema } from 'hast-util-sanitize'
// @ts-ignore
const schema = { ...defaultSchema, attributes: { ...defaultSchema.attributes, span: ['className'] } }

// Simple plugin to transform ||spoiler|| into <Spoiler>spoiler</Spoiler>
function spoilerPlugin(){
  const tokenize = function(this: any, eat: any, value: string, silent: boolean){
    const match = /^\|\|([^\n]+?)\|\|/.exec(value)
    if(match){
      if(silent) return true
      const add = eat(match[0])
      const inner = match[1].replace(/</g,'&lt;').replace(/>/g,'&gt;')
      return add({ type: 'html', value: `<span class="spoiler blur-[4px] brightness-50 cursor-pointer relative inline-flex" data-spoiler="true">${inner}</span>` })
    }
  }
  // @ts-ignore legacy parser attach
  tokenize.locator = (value: string, from: number) => value.indexOf('||', from)
  // @ts-ignore
  const Parser = this.Parser
  if(Parser && Parser.prototype && Parser.prototype.inlineTokenizers){
    // @ts-ignore
    Parser.prototype.inlineTokenizers.spoiler = tokenize
    // @ts-ignore
    Parser.prototype.inlineMethods.splice(Parser.prototype.inlineMethods.indexOf('text'), 0, 'spoiler')
  }
}

export const MarkdownRenderer: React.FC<{ value: string }> = ({ value }) => {
  useEffect(()=> {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const el = target?.closest('[data-spoiler="true"]') as HTMLElement | null
      if(el){
        el.classList.remove('blur-[4px]','brightness-50')
        el.dataset.spoiler = 'revealed'
      }
    }
    document.addEventListener('click', handler)
    return ()=> document.removeEventListener('click', handler)
  }, [])
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, spoilerPlugin]}
      rehypePlugins={[[rehypeRaw], [rehypeSanitize, schema]]}
      components={{
        code(props: any){
          const { children, className } = props as any
          const inline = !/language-/.test(className||'')
          return <code className={`rounded bg-black/40 px-1.5 py-0.5 text-[12px] ${className||''}`}>{children}</code>
        },
        a(props: any){
          return <a {...props} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline" />
        },
        hr(){ return <hr className="my-4 border-white/10" /> },
        ul(props: any){ return <ul {...props} className="list-disc pl-5 space-y-1" /> },
        ol(props: any){ return <ol {...props} className="list-decimal pl-5 space-y-1" /> },
        blockquote(props: any){ return <blockquote {...props} className="border-l-2 border-primary/40 pl-3 italic text-white/80" /> }
      }}
    >{value}</ReactMarkdown>
  )
}

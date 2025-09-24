import React, { useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize from 'rehype-sanitize'

// Minimal allow list extension (can be adjusted later)
// Using default schema from rehype-sanitize with additions for span + className
import { defaultSchema } from 'hast-util-sanitize'
// Extend sanitize schema to allow span with data-spoiler and class
// @ts-ignore
const schema = { ...defaultSchema, attributes: { ...defaultSchema.attributes, span: ['className', 'data-spoiler'] } }

// Remark plugin: walk text nodes and replace ||text|| with raw HTML spans
function remarkSpoilers(){
  return (tree: any) => {
    const visit = (node: any, index: number, parent: any) => {
      if(!node || !parent) return
      if(node.type === 'text' && /\|\|.+?\|\|/.test(node.value)){
        const segments: any[] = []
        let remaining = node.value as string
        while(remaining.length){
          const m = remaining.match(/\|\|([^|\n][^\n]*?)\|\|/)
            if(!m){
              segments.push({ type: 'text', value: remaining })
              break
            }
          const before = remaining.slice(0, m.index)
          if(before) segments.push({ type: 'text', value: before })
          const inner = m[1].replace(/</g,'&lt;').replace(/>/g,'&gt;')
          segments.push({ type: 'html', value: `<span class="spoiler blur-[4px] brightness-50 cursor-pointer inline-flex" data-spoiler="true">${inner}</span>` })
          remaining = remaining.slice((m.index||0) + m[0].length)
        }
        parent.children.splice(index, 1, ...segments)
        return index + segments.length
      }
      if(node.children){
        for(let i=0;i<node.children.length;i++){
          i = (visit(node.children[i], i, node) as any) ?? i
        }
      }
    }
    visit(tree, 0, { children: [tree] })
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
  remarkPlugins={[remarkGfm, remarkSpoilers]}
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

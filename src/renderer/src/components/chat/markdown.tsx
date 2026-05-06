import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/utils'

interface Props {
  children: string
  className?: string
}

export function Markdown({ children, className }: Props): React.JSX.Element {
  return (
    <div
      className={cn(
        'text-sm leading-relaxed text-foreground',
        // headings
        '[&_h1]:mb-3 [&_h1]:mt-4 [&_h1]:text-xl [&_h1]:font-semibold',
        '[&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:text-lg [&_h2]:font-semibold',
        '[&_h3]:mb-2 [&_h3]:mt-3 [&_h3]:text-base [&_h3]:font-semibold',
        '[&_h4]:mb-1 [&_h4]:mt-3 [&_h4]:text-sm [&_h4]:font-semibold',
        // paragraphs
        '[&_p]:my-2 first:[&_p]:mt-0 last:[&_p]:mb-0',
        // lists
        '[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5',
        '[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5',
        '[&_li]:my-0.5',
        '[&_li_p]:my-0',
        // links
        '[&_a]:text-indigo-500 [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:opacity-80',
        // inline code
        '[&_code]:rounded [&_code]:border [&_code]:bg-muted/50 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[12px]',
        // pre / code blocks
        '[&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:border [&_pre]:bg-muted/40 [&_pre]:p-3',
        '[&_pre_code]:border-0 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-[12px] [&_pre_code]:leading-relaxed',
        // blockquote
        '[&_blockquote]:my-3 [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-muted-foreground',
        // hr
        '[&_hr]:my-4 [&_hr]:border-border',
        // tables
        '[&_table]:my-3 [&_table]:w-full [&_table]:border-collapse [&_table]:text-xs',
        '[&_th]:border [&_th]:border-border [&_th]:bg-muted/40 [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_th]:font-semibold',
        '[&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1',
        // strong/em
        '[&_strong]:font-semibold',
        '[&_em]:italic',
        className
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  )
}

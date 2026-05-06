import { useMemo, useState } from 'react'
import { Check, Copy, Maximize2, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { JsonViewer } from '@/components/json-view'
import { filterJson } from '@/lib/json-filter'
import { McpLogo } from '@/components/mcp-logo'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet'
import type { ToolInfo } from '@/lib/mcp-types'

interface Props {
  tool: ToolInfo | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ToolSchemaSheet({ tool, open, onOpenChange }: Props): React.JSX.Element {
  const [copied, setCopied] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [query, setQuery] = useState('')
  const json = useMemo(() => (tool ? JSON.stringify(tool.inputSchema, null, 2) : ''), [tool])
  const filtered = useMemo(
    () => (tool ? filterJson(tool.inputSchema, query) : null),
    [tool, query]
  )

  const handleExpand = (): void => {
    setQuery('')
    setExpanded(true)
  }

  const handleCopy = async (): Promise<void> => {
    if (!tool) return
    await navigator.clipboard.writeText(json)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
          <SheetHeader className="border-b pr-12">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <McpLogo className="size-3.5" />
              <span className="uppercase tracking-wide">Tool</span>
            </div>
            <SheetTitle className="font-mono text-base break-all">{tool?.name}</SheetTitle>
            {tool?.description && <SheetDescription>{tool.description}</SheetDescription>}
          </SheetHeader>

          <div className="flex items-center justify-between border-b px-6 py-3">
            <span className="text-sm font-medium">Input schema</span>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={handleExpand} disabled={!tool}>
                <Maximize2 />
                Expand
              </Button>
              <Button variant="ghost" size="sm" onClick={handleCopy} disabled={!tool}>
                {copied ? <Check /> : <Copy />}
                {copied ? 'Copied' : 'Copy JSON'}
              </Button>
            </div>
          </div>

          <div className="schema-scroll min-h-0 flex-1 overflow-auto bg-muted/30 px-6 py-4">
            {tool && <JsonViewer value={tool.inputSchema} collapsed={2} />}
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={expanded} onOpenChange={setExpanded}>
        <DialogContent
          className="flex h-[90vh] w-[95vw] max-w-[1100px] flex-col gap-0 overflow-hidden p-0 sm:max-w-[1100px]"
          showCloseButton
        >
          <DialogHeader className="border-b px-6 py-4 pr-12">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <McpLogo className="size-3.5" />
              <span className="uppercase tracking-wide">Tool input schema</span>
            </div>
            <DialogTitle className="font-mono text-base break-all">{tool?.name}</DialogTitle>
          </DialogHeader>

          <div className="flex items-center gap-3 border-b px-6 py-2.5">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search keys or values…"
                className="h-8 pl-8 pr-8"
                autoFocus
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
            <span className="min-w-20 text-right text-xs text-muted-foreground">
              {query
                ? filtered?.empty
                  ? 'No matches'
                  : `${filtered?.count} match${filtered?.count === 1 ? '' : 'es'}`
                : ''}
            </span>
            <Button variant="ghost" size="sm" onClick={handleCopy}>
              {copied ? <Check /> : <Copy />}
              {copied ? 'Copied' : 'Copy JSON'}
            </Button>
          </div>

          <div className="schema-scroll min-h-0 flex-1 overflow-auto bg-muted/30 px-6 py-4">
            {tool &&
              (filtered?.empty ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  No matches for &ldquo;{query}&rdquo;
                </div>
              ) : (
                <JsonViewer
                  key={query}
                  value={filtered?.tree ?? tool.inputSchema}
                  collapsed={false}
                />
              ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

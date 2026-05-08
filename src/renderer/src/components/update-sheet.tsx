import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertCircle,
  ArrowDownToLine,
  Check,
  ExternalLink,
  Loader2,
  RefreshCw,
  RotateCw
} from 'lucide-react'
import { McpBrandLogo } from '@/components/mcp-brand-logo'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { useUpdate } from '@/hooks/use-update'
import type { UpdateState } from '@/lib/update-types'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function formatBytes(n: number): string {
  if (!n || !isFinite(n)) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.min(units.length - 1, Math.floor(Math.log(n) / Math.log(1024)))
  return `${(n / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

export function UpdateSheet({ open, onOpenChange }: Props): React.JSX.Element {
  const { state, check, download, install, openRelease } = useUpdate()

  // Auto-open the sheet when an update becomes available or finishes downloading.
  const prevStatusRef = useRef<UpdateState['status']>(state.status)
  useEffect(() => {
    const prev = prevStatusRef.current
    prevStatusRef.current = state.status
    if (prev === state.status) return
    if (state.status === 'available' && prev !== 'downloading' && prev !== 'downloaded') {
      onOpenChange(true)
    }
    if (state.status === 'downloaded' && prev === 'downloading') {
      onOpenChange(true)
    }
  }, [state.status, onOpenChange])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="top"
        className="flex w-screen flex-col gap-0 p-0 data-[side=top]:h-screen sm:max-w-none"
      >
        <SheetTitle className="sr-only">Update</SheetTitle>
        <AnimatePresence mode="wait">
          {state.status === 'available' && (
            <Available
              key="available"
              state={state}
              onDownload={() => void download()}
              onOpenRelease={() => void openRelease()}
              onClose={() => onOpenChange(false)}
            />
          )}
          {state.status === 'downloading' && (
            <Downloading key="downloading" state={state} />
          )}
          {state.status === 'downloaded' && (
            <Downloaded
              key="downloaded"
              state={state}
              onInstall={() => void install()}
              onOpenRelease={() => void openRelease()}
              onClose={() => onOpenChange(false)}
            />
          )}
          {state.status === 'checking' && <Checking key="checking" state={state} />}
          {state.status === 'not-available' && (
            <NotAvailable key="up-to-date" state={state} onClose={() => onOpenChange(false)} />
          )}
          {state.status === 'error' && (
            <ErrorScreen
              key="error"
              state={state}
              onRetry={() => void check()}
              onClose={() => onOpenChange(false)}
            />
          )}
          {state.status === 'idle' && (
            <Idle
              key="idle"
              state={state}
              onCheck={() => void check()}
              onClose={() => onOpenChange(false)}
            />
          )}
        </AnimatePresence>
      </SheetContent>
    </Sheet>
  )
}

// electron-updater returns release notes as HTML (parsed from GitHub's Atom
// feed). Render it directly with the same styling vocabulary the chat
// Markdown component uses.
function ReleaseNotes({ html }: { html: string }): React.JSX.Element {
  return (
    <div
      className={cn(
        'rounded-xl border bg-muted/30 p-5 text-sm leading-relaxed text-foreground',
        '[&>:first-child]:mt-0 [&>:last-child]:mb-0',
        '[&_h1]:mb-3 [&_h1]:mt-5 [&_h1]:text-xl [&_h1]:font-semibold',
        '[&_h2]:mb-2 [&_h2]:mt-5 [&_h2]:text-lg [&_h2]:font-semibold',
        '[&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:text-base [&_h3]:font-semibold',
        '[&_h4]:mb-1 [&_h4]:mt-3 [&_h4]:text-sm [&_h4]:font-semibold',
        '[&_p]:my-2',
        '[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul_ul]:my-0',
        '[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5',
        '[&_li]:my-1 [&_li_p]:my-0',
        '[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:opacity-80',
        '[&_code]:rounded [&_code]:border [&_code]:bg-background/60 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[12px]',
        '[&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:border [&_pre]:bg-background/60 [&_pre]:p-3 [&_pre]:text-[12px]',
        '[&_pre_code]:border-0 [&_pre_code]:bg-transparent [&_pre_code]:p-0',
        '[&_blockquote]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground',
        '[&_hr]:my-4 [&_hr]:border-border',
        '[&_strong]:font-semibold',
        '[&_em]:italic'
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

const fade = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.18 }
}

function Available({
  state,
  onDownload,
  onOpenRelease,
  onClose
}: {
  state: Extract<UpdateState, { status: 'available' }>
  onDownload: () => void
  onOpenRelease: () => void
  onClose: () => void
}): React.JSX.Element {
  return (
    <motion.div {...fade} className="flex h-full flex-col">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b px-8 py-5 pr-20">
        <div className="flex items-center gap-3">
          <McpBrandLogo className="size-9" />
          <div className="flex flex-col leading-tight">
            <span className="text-xs text-muted-foreground">Update available</span>
            <span className="font-mono text-base font-semibold">v{state.version}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Currently running</span>
          <span className="font-mono text-foreground">v{state.current}</span>
        </div>
      </header>

      <div className="schema-scroll min-h-0 flex-1 overflow-y-auto px-8 py-6">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-sm font-semibold tracking-tight">What's new</h2>
            {state.releaseDate && (
              <span className="text-[11px] text-muted-foreground">
                Released {new Date(state.releaseDate).toLocaleDateString()}
              </span>
            )}
          </div>
          {state.releaseNotes ? (
            <ReleaseNotes html={state.releaseNotes} />
          ) : (
            <p className="text-sm text-muted-foreground italic">
              No release notes provided. Open the release page for details.
            </p>
          )}
        </div>
      </div>

      <footer className="flex shrink-0 items-center justify-between gap-3 border-t px-8 py-4">
        <Button variant="ghost" size="sm" onClick={onClose}>
          Later
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onOpenRelease}>
            <ExternalLink /> Release page
          </Button>
          <Button size="sm" onClick={onDownload}>
            <ArrowDownToLine /> Download update
          </Button>
        </div>
      </footer>
    </motion.div>
  )
}

function Downloading({
  state
}: {
  state: Extract<UpdateState, { status: 'downloading' }>
}): React.JSX.Element {
  const percent = Math.max(0, Math.min(100, state.percent || 0))
  return (
    <motion.div
      {...fade}
      className="flex h-full flex-col items-center justify-center gap-10 px-8"
    >
      <motion.div
        animate={{
          y: [0, -6, 0],
          scale: [1, 1.03, 1]
        }}
        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
        className="relative"
      >
        <motion.div
          aria-hidden
          className="absolute inset-0 -z-10 rounded-full bg-primary/30 blur-3xl"
          animate={{ opacity: [0.45, 0.75, 0.45], scale: [0.9, 1.1, 0.9] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
        />
        <McpBrandLogo className="size-32" />
      </motion.div>

      <div className="flex w-full max-w-md flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-muted-foreground">Downloading update</span>
          <span className="font-mono text-sm tabular-nums">{percent.toFixed(1)}%</span>
        </div>
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
          <motion.div
            className="h-full rounded-full bg-primary"
            initial={false}
            animate={{ width: `${percent}%` }}
            transition={{ type: 'spring', stiffness: 80, damping: 24 }}
          />
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 w-24 -translate-x-full bg-gradient-to-r from-transparent via-primary-foreground/30 to-transparent mix-blend-overlay"
            animate={{ x: ['-100%', '400%'] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }}
            style={{ left: 0 }}
          />
        </div>
        <div className="flex items-center justify-between font-mono text-[11px] tabular-nums text-muted-foreground">
          <span>
            {formatBytes(state.transferred)} / {formatBytes(state.total)}
          </span>
          <span>{formatBytes(state.bytesPerSecond)}/s</span>
        </div>
        {state.version && (
          <p className="text-center text-[11px] text-muted-foreground">
            Preparing v{state.version} …
          </p>
        )}
      </div>
    </motion.div>
  )
}

function Downloaded({
  state,
  onInstall,
  onOpenRelease,
  onClose
}: {
  state: Extract<UpdateState, { status: 'downloaded' }>
  onInstall: () => void
  onOpenRelease: () => void
  onClose: () => void
}): React.JSX.Element {
  return (
    <motion.div
      {...fade}
      className="flex h-full flex-col items-center justify-center gap-10 px-8"
    >
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 220, damping: 22 }}
        className="relative"
      >
        <div
          aria-hidden
          className="absolute inset-0 -z-10 rounded-full bg-emerald-500/20 blur-3xl"
        />
        <McpBrandLogo className="size-32" />
        <motion.span
          aria-hidden
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.25, type: 'spring', stiffness: 280, damping: 18 }}
          className="absolute -right-3 -bottom-3 flex size-12 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/40"
        >
          <Check className="size-6" strokeWidth={3} />
        </motion.span>
      </motion.div>

      <div className="flex max-w-md flex-col items-center gap-3 text-center">
        <h2 className="text-2xl font-semibold tracking-tight">Update ready</h2>
        <p className="text-sm text-muted-foreground">
          Version <span className="font-mono text-foreground">v{state.version}</span> has
          been downloaded
          {state.canInstall ? (
            <> and is ready to install. The app will restart.</>
          ) : (
            <> but cannot be installed automatically for this build (likely a .deb).
            Open the release page to update manually.</>
          )}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onClose}>
          Later
        </Button>
        {state.canInstall ? (
          <Button size="sm" onClick={onInstall}>
            <RotateCw /> Restart & install
          </Button>
        ) : (
          <Button size="sm" onClick={onOpenRelease}>
            <ExternalLink /> Open release page
          </Button>
        )}
      </div>
    </motion.div>
  )
}

function Checking({
  state
}: {
  state: Extract<UpdateState, { status: 'checking' }>
}): React.JSX.Element {
  return (
    <motion.div
      {...fade}
      className="flex h-full flex-col items-center justify-center gap-6 px-8"
    >
      <McpBrandLogo className="size-24 opacity-80" />
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Checking for updates …
      </div>
      <span className="font-mono text-[11px] text-muted-foreground/70">
        Currently v{state.current}
      </span>
    </motion.div>
  )
}

function NotAvailable({
  state,
  onClose
}: {
  state: Extract<UpdateState, { status: 'not-available' }>
  onClose: () => void
}): React.JSX.Element {
  return (
    <motion.div
      {...fade}
      className="flex h-full flex-col items-center justify-center gap-6 px-8"
    >
      <div className="relative">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 rounded-full bg-emerald-500/15 blur-2xl"
        />
        <McpBrandLogo className="size-24" />
      </div>
      <div className="flex flex-col items-center gap-1">
        <h2 className="text-xl font-semibold">You're up to date</h2>
        <p className="text-sm text-muted-foreground">
          Running the latest version, <span className="font-mono">v{state.current}</span>.
        </p>
      </div>
      <Button size="sm" variant="outline" onClick={onClose}>
        Close
      </Button>
    </motion.div>
  )
}

function ErrorScreen({
  state,
  onRetry,
  onClose
}: {
  state: Extract<UpdateState, { status: 'error' }>
  onRetry: () => void
  onClose: () => void
}): React.JSX.Element {
  return (
    <motion.div
      {...fade}
      className="flex h-full flex-col items-center justify-center gap-6 px-8"
    >
      <div className="flex size-20 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertCircle className="size-10" strokeWidth={1.5} />
      </div>
      <div className="flex max-w-md flex-col items-center gap-2 text-center">
        <h2 className="text-xl font-semibold">Update check failed</h2>
        <pre className="schema-scroll max-h-40 max-w-full overflow-auto rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-left font-mono text-[11px] whitespace-pre-wrap break-words text-destructive">
          {state.message}
        </pre>
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="ghost" onClick={onClose}>
          Close
        </Button>
        <Button size="sm" variant="outline" onClick={onRetry}>
          <RefreshCw /> Retry
        </Button>
      </div>
    </motion.div>
  )
}

function Idle({
  state,
  onCheck,
  onClose
}: {
  state: Extract<UpdateState, { status: 'idle' }>
  onCheck: () => void
  onClose: () => void
}): React.JSX.Element {
  return (
    <motion.div
      {...fade}
      className="flex h-full flex-col items-center justify-center gap-6 px-8"
    >
      <McpBrandLogo className="size-24 opacity-80" />
      <div className="flex flex-col items-center gap-1">
        <h2 className="text-xl font-semibold">Updates</h2>
        <p className="text-sm text-muted-foreground">
          Currently <span className="font-mono">v{state.current}</span>.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="ghost" onClick={onClose}>
          Close
        </Button>
        <Button size="sm" variant="outline" onClick={onCheck}>
          <RefreshCw /> Check for updates
        </Button>
      </div>
    </motion.div>
  )
}

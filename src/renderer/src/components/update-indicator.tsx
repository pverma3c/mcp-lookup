import { useEffect, useState } from 'react'
import {
  AlertCircle,
  ArrowDownToLine,
  Check,
  Loader2,
  RefreshCw,
  RotateCw
} from 'lucide-react'
import { UpdateSheet } from '@/components/update-sheet'
import { cn } from '@/lib/utils'
import { useUpdate } from '@/hooks/use-update'

export function UpdateIndicator(): React.JSX.Element | null {
  const { state, check } = useUpdate()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [hideNotAvailable, setHideNotAvailable] = useState(false)

  useEffect(() => {
    if (state.status !== 'not-available') return
    setHideNotAvailable(false)
    const t = window.setTimeout(() => setHideNotAvailable(true), 2500)
    return () => window.clearTimeout(t)
  }, [state.status])

  const visible =
    state.status === 'available' ||
    state.status === 'downloading' ||
    state.status === 'downloaded' ||
    state.status === 'error' ||
    state.status === 'checking' ||
    (state.status === 'not-available' && !hideNotAvailable)

  if (!visible) {
    return (
      <>
        <button
          type="button"
          onClick={() => {
            void check()
            setSheetOpen(true)
          }}
          aria-label="Check for updates"
          title="Check for updates"
          className="flex h-5 cursor-pointer items-center gap-1 rounded px-1.5 text-[10px] text-muted-foreground/60 transition-colors hover:bg-muted/40 hover:text-foreground"
        >
          <RefreshCw className="size-2.5" />
        </button>
        <UpdateSheet open={sheetOpen} onOpenChange={setSheetOpen} />
      </>
    )
  }

  const label =
    state.status === 'available'
      ? `Update available · ${state.version}`
      : state.status === 'downloading'
        ? `Downloading ${Math.round(state.percent)}%`
        : state.status === 'downloaded'
          ? `Ready to install · ${state.version}`
          : state.status === 'checking'
            ? 'Checking…'
            : state.status === 'error'
              ? 'Update error'
              : state.status === 'not-available'
                ? 'Up to date'
                : ''

  return (
    <>
      <button
        type="button"
        onClick={() => setSheetOpen(true)}
        aria-label={label}
        title={label}
        className={cn(
          'flex h-5 cursor-pointer items-center gap-1.5 rounded px-1.5 text-[10px] font-medium transition-colors',
          'hover:bg-muted/40',
          state.status === 'available' || state.status === 'downloaded'
            ? 'text-amber-500'
            : state.status === 'error'
              ? 'text-red-500'
              : state.status === 'not-available'
                ? 'text-emerald-500'
                : 'text-muted-foreground'
        )}
      >
        {state.status === 'checking' || state.status === 'downloading' ? (
          <Loader2 className="size-2.5 animate-spin" />
        ) : state.status === 'available' ? (
          <ArrowDownToLine className="size-2.5" />
        ) : state.status === 'downloaded' ? (
          <RotateCw className="size-2.5" />
        ) : state.status === 'error' ? (
          <AlertCircle className="size-2.5" />
        ) : state.status === 'not-available' ? (
          <Check className="size-2.5" />
        ) : null}
        <span className="max-w-[160px] truncate">{label}</span>
        {state.status === 'downloading' && (
          <span className="ml-1 h-1 w-12 overflow-hidden rounded-full bg-muted/60">
            <span
              className="block h-full rounded-full bg-amber-500 transition-[width]"
              style={{ width: `${Math.max(2, Math.round(state.percent))}%` }}
            />
          </span>
        )}
      </button>
      <UpdateSheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </>
  )
}

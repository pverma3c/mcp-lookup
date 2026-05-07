import { useEffect, useState } from 'react'
import JsonView from '@uiw/react-json-view'
import JsonViewEditor from '@uiw/react-json-view/editor'
import { githubDarkTheme } from '@uiw/react-json-view/githubDark'
import { githubLightTheme } from '@uiw/react-json-view/githubLight'

function useResolvedTheme(): 'dark' | 'light' {
  const [resolved, setResolved] = useState<'dark' | 'light'>(() =>
    document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  )

  useEffect(() => {
    const root = document.documentElement
    const observer = new MutationObserver(() => {
      setResolved(root.classList.contains('dark') ? 'dark' : 'light')
    })
    observer.observe(root, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  return resolved
}

interface Props {
  value: unknown
  collapsed?: number | boolean
  className?: string
}

function useViewerStyle(): React.CSSProperties {
  const theme = useResolvedTheme()
  return (
    theme === 'dark'
      ? { ...githubDarkTheme, '--w-rjv-background-color': 'transparent' }
      : { ...githubLightTheme, '--w-rjv-background-color': 'transparent' }
  ) as React.CSSProperties
}

export function JsonViewer({ value, collapsed = 2, className }: Props): React.JSX.Element {
  const style = useViewerStyle()
  return (
    <JsonView
      value={value as object}
      collapsed={collapsed}
      displayDataTypes={false}
      enableClipboard={false}
      shortenTextAfterLength={80}
      style={style}
      className={className}
    />
  )
}

interface EditorProps extends Props {
  onChange?: (next: Record<string, unknown>) => void
  editable?: boolean
}

export function JsonEditor({
  value,
  collapsed = 2,
  className,
  onChange,
  editable = true
}: EditorProps): React.JSX.Element {
  const style = useViewerStyle()
  return (
    <JsonViewEditor
      value={value as object}
      collapsed={collapsed}
      displayDataTypes={false}
      enableClipboard={false}
      style={style}
      className={className}
      editable={editable}
      onEdit={() => {
        // The editor mutates `value` in place. Spread to a new top-level
        // reference so React notices and downstream consumers re-render.
        onChange?.({ ...(value as Record<string, unknown>) })
        return true
      }}
    />
  )
}

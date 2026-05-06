import { useEffect, useState } from 'react'
import JsonView from '@uiw/react-json-view'
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

export function JsonViewer({ value, collapsed = 2, className }: Props): React.JSX.Element {
  const theme = useResolvedTheme()
  const style =
    theme === 'dark'
      ? { ...githubDarkTheme, '--w-rjv-background-color': 'transparent' }
      : { ...githubLightTheme, '--w-rjv-background-color': 'transparent' }

  return (
    <JsonView
      value={value as object}
      collapsed={collapsed}
      displayDataTypes={false}
      enableClipboard={false}
      shortenTextAfterLength={0}
      style={style as React.CSSProperties}
      className={className}
    />
  )
}

import { cn } from '@/lib/utils'
import logoUrl from '@/assets/logo.png'

export function McpBrandLogo({
  className,
  ...props
}: React.ImgHTMLAttributes<HTMLImageElement>): React.JSX.Element {
  return (
    <img
      src={logoUrl}
      alt="MCP-Lookup"
      draggable={false}
      className={cn('object-contain', className)}
      {...props}
    />
  )
}

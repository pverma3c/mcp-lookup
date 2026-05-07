import {
  Bot,
  Brain,
  KeyRound,
  MoreVertical,
  Pencil,
  PlugZap,
  ServerCog,
  Sparkles,
  Trash2,
  Zap
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { PROVIDER_LABELS } from '@/lib/llm-types'
import type { Provider, ProviderType } from '@/lib/llm-types'

interface Props {
  provider: Provider
  onEdit: () => void
}

const TYPE_ICON: Record<ProviderType, React.ComponentType<{ className?: string }>> = {
  openai: Sparkles,
  anthropic: Brain,
  groq: Zap,
  ollama: ServerCog
}

const TYPE_TINT: Record<ProviderType, string> = {
  openai: 'text-emerald-500',
  anthropic: 'text-orange-500',
  groq: 'text-amber-500',
  ollama: 'text-sky-500'
}

function summary(provider: Provider): string {
  const c = provider.config
  if (c.type === 'ollama') return c.baseUrl
  if ((c.type === 'openai' || c.type === 'anthropic') && c.baseUrl) return c.baseUrl
  return PROVIDER_LABELS[c.type]
}

export function ProviderCard({ provider, onEdit }: Props): React.JSX.Element {
  const Icon = TYPE_ICON[provider.config.type] ?? Bot
  const tint = TYPE_TINT[provider.config.type]

  const handleDelete = async (): Promise<void> => {
    if (!confirm(`Delete "${provider.name}"?`)) return
    await window.api.llm.remove(provider.id)
    toast.success('Provider deleted')
  }

  const handleTest = async (): Promise<void> => {
    const id = toast.loading(`Testing ${provider.name}…`)
    try {
      const result = await window.api.llm.test({
        config: provider.config,
        id: provider.id
      })
      const latency = result.latencyMs !== undefined ? ` (${result.latencyMs}ms)` : ''
      if (result.ok) {
        toast.success(`${provider.name} OK${latency}`, {
          id,
          description: result.message
        })
      } else {
        toast.error(`${provider.name} failed${latency}`, {
          id,
          description: result.message
        })
      }
    } catch (err) {
      toast.error('Test failed', {
        id,
        description: err instanceof Error ? err.message : String(err)
      })
    }
  }

  const handleToggleEnabled = async (enabled: boolean): Promise<void> => {
    await window.api.llm.setEnabled(provider.id, enabled)
    toast.success(`${provider.name} ${enabled ? 'enabled' : 'disabled'}`)
  }

  return (
    <Card
      className={cn(
        'h-full gap-4 py-5 transition-all hover:border-foreground/20',
        provider.disabled && 'opacity-60'
      )}
    >
      <CardHeader>
        <CardTitle className="flex min-w-0 items-center gap-3">
          <span
            className={cn(
              'flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted',
              provider.disabled && 'grayscale'
            )}
          >
            <Icon className={`size-4 ${tint}`} />
          </span>
          <span className="truncate">{provider.name}</span>
        </CardTitle>
        <CardDescription className="truncate pl-12 font-mono text-xs">
          {summary(provider)}
        </CardDescription>
        <CardAction className="flex items-center gap-2">
          <Switch
            checked={!provider.disabled}
            onCheckedChange={handleToggleEnabled}
            aria-label={provider.disabled ? 'Enable provider' : 'Disable provider'}
            title={provider.disabled ? 'Enable' : 'Disable'}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="More">
                <MoreVertical />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onSelect={handleTest}
                disabled={provider.disabled}
              >
                <PlugZap /> Test connection
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={onEdit}>
                <Pencil /> Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={handleDelete}>
                <Trash2 /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-wrap items-center gap-1.5">
        <Badge variant="outline">{PROVIDER_LABELS[provider.config.type]}</Badge>
        <Badge variant="secondary" className="font-mono">
          {provider.config.model}
        </Badge>
        {provider.config.type !== 'ollama' && (
          <Badge variant={provider.hasApiKey ? 'secondary' : 'outline'} className="gap-1">
            <KeyRound className="size-3" />
            {provider.hasApiKey ? 'Key set' : 'No key'}
          </Badge>
        )}
        {provider.disabled && (
          <Badge variant="outline" className="border-dashed text-muted-foreground">
            Disabled
          </Badge>
        )}
      </CardContent>
    </Card>
  )
}

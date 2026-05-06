import { useState } from 'react'
import { Bot, Plus } from 'lucide-react'
import { AddProviderDialog } from '@/components/add-provider-dialog'
import { ProviderCard } from '@/components/provider-card'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from '@/components/ui/empty'
import { useProviders } from '@/hooks/use-providers'
import type { Provider } from '@/lib/llm-types'

function Providers(): React.JSX.Element {
  const { providers } = useProviders()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Provider | undefined>()

  const openAdd = (): void => {
    setEditing(undefined)
    setDialogOpen(true)
  }
  const openEdit = (provider: Provider): void => {
    setEditing(provider)
    setDialogOpen(true)
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">LLM Providers</h1>
          <p className="text-sm text-muted-foreground">
            Add OpenAI, Anthropic, Groq, or Ollama credentials. Used to chat with your MCP
            servers.
          </p>
        </div>
        {providers.length > 0 && (
          <Button onClick={openAdd}>
            <Plus /> Add provider
          </Button>
        )}
      </header>

      {providers.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Bot />
            </EmptyMedia>
            <EmptyTitle>No providers yet</EmptyTitle>
            <EmptyDescription>
              Add an LLM provider to enable chat against your MCP servers.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={openAdd}>
              <Plus /> Add provider
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {providers.map((p) => (
            <ProviderCard key={p.id} provider={p} onEdit={() => openEdit(p)} />
          ))}
        </div>
      )}

      <AddProviderDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} />
    </div>
  )
}

export default Providers

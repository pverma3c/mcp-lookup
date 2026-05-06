import { useEffect, useMemo, useState } from 'react'
import {
  CheckCircle2,
  Download,
  Eye,
  EyeOff,
  Loader2,
  PlugZap,
  XCircle
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  OLLAMA_DEFAULT_BASE_URL,
  PROVIDER_DEFAULT_MODELS,
  PROVIDER_LABELS,
  PROVIDER_NEEDS_API_KEY
} from '@/lib/llm-types'
import { cn } from '@/lib/utils'
import type { Provider, ProviderConfig, ProviderType, TestResult } from '@/lib/llm-types'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing?: Provider
}

export function AddProviderDialog({ open, onOpenChange, editing }: Props): React.JSX.Element {
  const [type, setType] = useState<ProviderType>('openai')
  const [name, setName] = useState('')
  const [model, setModel] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<TestResult | null>(null)
  const [fetchingModels, setFetchingModels] = useState(false)
  const [availableModels, setAvailableModels] = useState<string[]>([])
  const [modelsError, setModelsError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    if (editing) {
      setType(editing.config.type)
      setName(editing.name)
      setModel(editing.config.model)
      setBaseUrl(
        editing.config.type === 'groq'
          ? ''
          : (editing.config as { baseUrl?: string }).baseUrl ?? ''
      )
      setApiKey('')
      setShowKey(false)
      setTestResult(null)
      setAvailableModels([])
      setModelsError(null)
    } else {
      setType('openai')
      setName('')
      setModel(PROVIDER_DEFAULT_MODELS.openai)
      setApiKey('')
      setBaseUrl('')
      setShowKey(false)
      setTestResult(null)
      setAvailableModels([])
      setModelsError(null)
    }
  }, [open, editing])

  const handleTypeChange = (next: ProviderType): void => {
    setType(next)
    setAvailableModels([])
    setModelsError(null)
    if (!editing) {
      if (!name.trim()) setName(PROVIDER_LABELS[next])
      setModel(PROVIDER_DEFAULT_MODELS[next])
      if (next === 'ollama') setBaseUrl(OLLAMA_DEFAULT_BASE_URL)
      else setBaseUrl('')
    }
  }

  const handleFetchModels = async (): Promise<void> => {
    const config = buildConfig()
    if (!config) {
      toast.error('Model is required (use any value, then fetch)')
      return
    }
    if (type === 'ollama' && !baseUrl.trim()) {
      toast.error('Base URL is required')
      return
    }
    setFetchingModels(true)
    setModelsError(null)
    try {
      const result = await window.api.llm.listModels({
        config,
        apiKey: apiKey.trim() || undefined,
        id: editing?.id
      })
      if (result.ok) {
        setAvailableModels(result.models)
        if (result.models.length === 0) {
          setModelsError('Provider returned no models')
        }
      } else {
        setAvailableModels([])
        setModelsError(result.message ?? 'Failed to fetch')
      }
    } catch (err) {
      setAvailableModels([])
      setModelsError(err instanceof Error ? err.message : String(err))
    } finally {
      setFetchingModels(false)
    }
  }

  const filteredModels = useMemo(() => {
    const q = model.trim().toLowerCase()
    if (!q) return availableModels
    return availableModels.filter((m) => m.toLowerCase().includes(q))
  }, [model, availableModels])

  const needsKey = PROVIDER_NEEDS_API_KEY[type]

  const buildConfig = (): ProviderConfig | null => {
    if (!model.trim()) return null
    if (type === 'openai') return { type, model: model.trim(), baseUrl: baseUrl.trim() || undefined }
    if (type === 'anthropic')
      return { type, model: model.trim(), baseUrl: baseUrl.trim() || undefined }
    if (type === 'groq') return { type, model: model.trim() }
    return { type, model: model.trim(), baseUrl: baseUrl.trim() || OLLAMA_DEFAULT_BASE_URL }
  }

  const handleTest = async (): Promise<void> => {
    const config = buildConfig()
    if (!config) {
      toast.error('Model is required')
      return
    }
    if (type === 'ollama' && !baseUrl.trim()) {
      toast.error('Base URL is required')
      return
    }
    if (needsKey && !apiKey.trim() && !(editing && editing.hasApiKey)) {
      toast.error('Enter an API key to test')
      return
    }
    setTesting(true)
    setTestResult(null)
    try {
      const result = await window.api.llm.test({
        config,
        apiKey: apiKey.trim() || undefined,
        id: editing?.id
      })
      setTestResult(result)
    } catch (err) {
      setTestResult({
        ok: false,
        message: err instanceof Error ? err.message : 'Test failed'
      })
    } finally {
      setTesting(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('Name is required')
      return
    }
    if (!model.trim()) {
      toast.error('Model is required')
      return
    }
    if (needsKey && !editing && !apiKey.trim()) {
      toast.error('API key is required')
      return
    }
    if (type === 'ollama' && !baseUrl.trim()) {
      toast.error('Base URL is required')
      return
    }

    let config: ProviderConfig
    if (type === 'openai') {
      config = { type, model: model.trim(), baseUrl: baseUrl.trim() || undefined }
    } else if (type === 'anthropic') {
      config = { type, model: model.trim(), baseUrl: baseUrl.trim() || undefined }
    } else if (type === 'groq') {
      config = { type, model: model.trim() }
    } else {
      config = { type, model: model.trim(), baseUrl: baseUrl.trim() }
    }

    try {
      if (editing) {
        await window.api.llm.update({
          id: editing.id,
          name: name.trim(),
          config,
          apiKey: apiKey.trim() || undefined
        })
        toast.success('Provider updated')
      } else {
        await window.api.llm.add({
          name: name.trim(),
          config,
          apiKey: needsKey ? apiKey.trim() : undefined
        })
        toast.success('Provider added')
      }
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-[560px]">
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <DialogHeader className="border-b px-6 py-4">
            <DialogTitle>{editing ? 'Edit provider' : 'Add LLM provider'}</DialogTitle>
            <DialogDescription>
              Used to power chat against your MCP servers. API keys are stored encrypted at rest.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <FieldGroup>
              <Field>
                <FieldLabel>Type</FieldLabel>
                <Select
                  value={type}
                  onValueChange={(v) => handleTypeChange(v as ProviderType)}
                  disabled={!!editing}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="anthropic">Anthropic</SelectItem>
                    <SelectItem value="groq">Groq</SelectItem>
                    <SelectItem value="ollama">Ollama</SelectItem>
                  </SelectContent>
                </Select>
                {editing && (
                  <FieldDescription>Type can&apos;t be changed after creation.</FieldDescription>
                )}
              </Field>

              <Field>
                <FieldLabel htmlFor="provider-name">Name</FieldLabel>
                <Input
                  id="provider-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={PROVIDER_LABELS[type]}
                />
              </Field>

              <Field>
                <div className="flex items-center justify-between">
                  <FieldLabel htmlFor="model">Default model</FieldLabel>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleFetchModels}
                    disabled={fetchingModels}
                  >
                    {fetchingModels ? (
                      <>
                        <Loader2 className="animate-spin" /> Fetching
                      </>
                    ) : (
                      <>
                        <Download /> Fetch models
                      </>
                    )}
                  </Button>
                </div>
                <Input
                  id="model"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder={PROVIDER_DEFAULT_MODELS[type]}
                  className="font-mono"
                />
                {modelsError && (
                  <FieldDescription className="text-destructive">
                    {modelsError}
                  </FieldDescription>
                )}
                {availableModels.length > 0 && (
                  <div className="rounded-md border">
                    <div className="flex items-center justify-between border-b px-3 py-1.5 text-xs text-muted-foreground">
                      <span>
                        {filteredModels.length} of {availableModels.length}
                        {model.trim() ? ` matching "${model.trim()}"` : ''}
                      </span>
                      {model.trim() && (
                        <button
                          type="button"
                          onClick={() => setModel('')}
                          className="text-xs text-muted-foreground hover:text-foreground"
                        >
                          Clear filter
                        </button>
                      )}
                    </div>
                    <div className="schema-scroll max-h-44 overflow-y-auto p-1.5">
                      {filteredModels.length === 0 ? (
                        <div className="px-2 py-3 text-center text-xs text-muted-foreground">
                          No matches
                        </div>
                      ) : (
                        <ul className="flex flex-col gap-0.5">
                          {filteredModels.map((m) => (
                            <li key={m}>
                              <button
                                type="button"
                                onClick={() => setModel(m)}
                                className={cn(
                                  'flex w-full cursor-pointer items-center justify-between rounded px-2 py-1.5 text-left font-mono text-xs transition-colors hover:bg-muted',
                                  model === m && 'bg-muted'
                                )}
                              >
                                <span className="truncate">{m}</span>
                                {model === m && (
                                  <CheckCircle2 className="size-3.5 shrink-0 text-emerald-500" />
                                )}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )}
              </Field>

              {needsKey && (
                <Field>
                  <FieldLabel htmlFor="api-key">
                    API key{' '}
                    {editing && (
                      <span className="font-normal text-muted-foreground">
                        (leave blank to keep)
                      </span>
                    )}
                  </FieldLabel>
                  <div className="relative">
                    <Input
                      id="api-key"
                      type={showKey ? 'text' : 'password'}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder={
                        editing && editing.hasApiKey ? '•••••••• stored' : 'sk-…'
                      }
                      autoComplete="off"
                      className="pr-10 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-1 text-muted-foreground hover:text-foreground"
                      aria-label={showKey ? 'Hide key' : 'Show key'}
                    >
                      {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </Field>
              )}

              {(type === 'openai' || type === 'anthropic') && (
                <Field>
                  <FieldLabel htmlFor="base-url">
                    Base URL <span className="text-muted-foreground">(optional)</span>
                  </FieldLabel>
                  <Input
                    id="base-url"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder={
                      type === 'openai'
                        ? 'https://api.openai.com/v1'
                        : 'https://api.anthropic.com'
                    }
                  />
                  <FieldDescription>For self-hosted or proxy endpoints.</FieldDescription>
                </Field>
              )}

              {type === 'ollama' && (
                <Field>
                  <FieldLabel htmlFor="ollama-url">Base URL</FieldLabel>
                  <Input
                    id="ollama-url"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder={OLLAMA_DEFAULT_BASE_URL}
                  />
                </Field>
              )}

              <Field>
                <div className="flex items-center justify-between">
                  <FieldLabel>Connection test</FieldLabel>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleTest}
                    disabled={testing}
                  >
                    {testing ? (
                      <>
                        <Loader2 className="animate-spin" /> Testing
                      </>
                    ) : (
                      <>
                        <PlugZap /> Test connection
                      </>
                    )}
                  </Button>
                </div>
                {testResult && (
                  <div
                    className={cn(
                      'flex items-start gap-2 rounded-md border px-3 py-2 text-sm',
                      testResult.ok
                        ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400'
                        : 'border-destructive/40 bg-destructive/5 text-destructive'
                    )}
                  >
                    {testResult.ok ? (
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
                    ) : (
                      <XCircle className="mt-0.5 size-4 shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">
                        {testResult.ok ? 'Success' : 'Failed'}
                        {testResult.latencyMs !== undefined && (
                          <span className="ml-2 font-normal text-muted-foreground">
                            {testResult.latencyMs}ms
                          </span>
                        )}
                      </div>
                      <div className="break-all font-mono text-xs opacity-90">
                        {testResult.message}
                      </div>
                    </div>
                  </div>
                )}
                {!testResult && (
                  <FieldDescription>
                    Pings the provider with the credentials above. Doesn&apos;t consume tokens.
                  </FieldDescription>
                )}
              </Field>
            </FieldGroup>
          </div>

          <DialogFooter className="border-t px-6 py-4">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{editing ? 'Save changes' : 'Add provider'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

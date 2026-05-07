import { useMemo } from 'react'
import { Field, FieldLabel, FieldDescription, FieldGroup } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'

type JSONObject = Record<string, unknown>

interface JSONSchemaField {
  type?: string | string[]
  description?: string
  default?: unknown
  enum?: unknown[]
  minimum?: number
  maximum?: number
  minLength?: number
  maxLength?: number
  items?: JSONSchemaField
  properties?: Record<string, JSONSchemaField>
  required?: string[]
}

interface SchemaFormProps {
  schema: JSONSchemaField | undefined
  value: JSONObject
  onChange: (next: JSONObject) => void
}

function pickType(t: JSONSchemaField['type']): string {
  if (Array.isArray(t)) return t.find((x) => x !== 'null') ?? t[0]
  return t ?? 'string'
}

export function SchemaForm({ schema, value, onChange }: SchemaFormProps): React.JSX.Element {
  const properties = schema?.properties ?? {}
  const required = useMemo(() => new Set(schema?.required ?? []), [schema?.required])
  const keys = Object.keys(properties)

  if (keys.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        This tool takes no parameters. Click <span className="font-medium">Run</span> to call it.
      </p>
    )
  }

  const set = (key: string, v: unknown): void => {
    const next = { ...value }
    if (v === undefined) delete next[key]
    else next[key] = v
    onChange(next)
  }

  return (
    <FieldGroup>
      {keys.map((key) => {
        const prop = properties[key]
        const type = pickType(prop.type)
        const isRequired = required.has(key)
        const current = value[key]

        return (
          <Field key={key}>
            <FieldLabel className="flex items-center gap-1.5">
              <span className="font-mono">{key}</span>
              {isRequired ? (
                <Badge variant="outline" className="h-4 px-1 text-[9px]">
                  required
                </Badge>
              ) : (
                <span className="text-[10px] text-muted-foreground/70">optional</span>
              )}
              <span className="ml-auto font-mono text-[10px] text-muted-foreground/70">
                {Array.isArray(prop.type) ? prop.type.join(' | ') : type}
              </span>
            </FieldLabel>

            {renderInput(prop, type, current, (v) => set(key, v), key)}

            {prop.description && (
              <FieldDescription>{prop.description}</FieldDescription>
            )}
          </Field>
        )
      })}
    </FieldGroup>
  )
}

function renderInput(
  prop: JSONSchemaField,
  type: string,
  current: unknown,
  set: (v: unknown) => void,
  id: string
): React.ReactNode {
  if (prop.enum && Array.isArray(prop.enum)) {
    return (
      <Select
        value={current === undefined ? '' : String(current)}
        onValueChange={(v) => set(coerceEnum(prop.enum ?? [], v))}
      >
        <SelectTrigger id={id}>
          <SelectValue placeholder={`Select ${id}`} />
        </SelectTrigger>
        <SelectContent>
          {prop.enum.map((opt, i) => (
            <SelectItem key={i} value={String(opt)}>
              {String(opt)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  if (type === 'boolean') {
    return (
      <div className="flex items-center gap-2">
        <Switch
          id={id}
          checked={current === true}
          onCheckedChange={(v) => set(v)}
        />
        <span className="text-xs text-muted-foreground">
          {current === true ? 'true' : 'false'}
        </span>
      </div>
    )
  }

  if (type === 'integer' || type === 'number') {
    return (
      <Input
        id={id}
        type="number"
        inputMode={type === 'integer' ? 'numeric' : 'decimal'}
        step={type === 'integer' ? 1 : 'any'}
        min={prop.minimum}
        max={prop.maximum}
        placeholder={prop.default !== undefined ? String(prop.default) : ''}
        value={current === undefined || current === null ? '' : String(current)}
        onChange={(e) => {
          const raw = e.target.value
          if (raw === '') return set(undefined)
          const n = type === 'integer' ? parseInt(raw, 10) : parseFloat(raw)
          set(Number.isFinite(n) ? n : undefined)
        }}
      />
    )
  }

  if (type === 'array' || type === 'object') {
    // Complex type — fall back to JSON textarea for this single field.
    const text = current === undefined ? '' : safeStringify(current)
    return (
      <Textarea
        id={id}
        rows={4}
        spellCheck={false}
        className="font-mono text-xs"
        placeholder={type === 'array' ? '[]' : '{}'}
        value={text}
        onChange={(e) => {
          const raw = e.target.value
          if (raw.trim() === '') return set(undefined)
          try {
            set(JSON.parse(raw))
          } catch {
            // keep partial / invalid in the textarea uncommitted; do nothing
            // (renders the user's keystrokes via React's controlled value
            // because we set state via a different path)
          }
        }}
      />
    )
  }

  // string / fallback
  return (
    <Input
      id={id}
      type="text"
      placeholder={prop.default !== undefined ? String(prop.default) : ''}
      value={current === undefined || current === null ? '' : String(current)}
      onChange={(e) => set(e.target.value === '' ? undefined : e.target.value)}
    />
  )
}

function coerceEnum(options: unknown[], v: string): unknown {
  return options.find((o) => String(o) === v) ?? v
}

function safeStringify(v: unknown): string {
  try {
    return JSON.stringify(v, null, 2)
  } catch {
    return String(v)
  }
}

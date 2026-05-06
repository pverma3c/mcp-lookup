export interface FilterResult {
  tree: unknown
  count: number
  empty: boolean
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function visit(node: unknown, q: string): { kept: unknown; count: number; hit: boolean } {
  if (Array.isArray(node)) {
    const out: unknown[] = []
    let count = 0
    for (const item of node) {
      const r = visit(item, q)
      if (r.hit) {
        out.push(r.kept)
        count += r.count
      }
    }
    return { kept: out, count, hit: out.length > 0 }
  }

  if (isObject(node)) {
    const out: Record<string, unknown> = {}
    let count = 0
    for (const [key, val] of Object.entries(node)) {
      if (key.toLowerCase().includes(q)) {
        out[key] = val
        count += 1
        continue
      }
      const r = visit(val, q)
      if (r.hit) {
        out[key] = r.kept
        count += r.count
      }
    }
    return { kept: out, count, hit: Object.keys(out).length > 0 }
  }

  const matches = String(node).toLowerCase().includes(q)
  return { kept: node, count: matches ? 1 : 0, hit: matches }
}

export function filterJson(value: unknown, query: string): FilterResult {
  const trimmed = query.trim().toLowerCase()
  if (!trimmed) return { tree: value, count: 0, empty: false }
  const r = visit(value, trimmed)
  return { tree: r.kept, count: r.count, empty: !r.hit }
}

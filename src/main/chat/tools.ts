import { loadMcpTools } from '@langchain/mcp-adapters'
import type { StructuredToolInterface } from '@langchain/core/tools'
import { mcpManager } from '../mcp/manager'
import type { ServerSummary } from './types'

export interface GatheredTools {
  tools: StructuredToolInterface[]
  toolToServer: Map<string, string>
  summary: ServerSummary[]
}

export async function gatherTools(): Promise<GatheredTools> {
  const out: StructuredToolInterface[] = []
  const toolToServer = new Map<string, string>()
  const summary: ServerSummary[] = []

  for (const { config, client } of mcpManager.getConnected()) {
    const disabled = new Set(config.disabledTools)
    let serverTools: StructuredToolInterface[] = []
    try {
      serverTools = await loadMcpTools(config.name, client)
    } catch {
      continue
    }
    const enabled = serverTools.filter((t) => !disabled.has(t.name))
    for (const tool of enabled) {
      toolToServer.set(tool.name, config.name)
      out.push(tool)
    }
    summary.push({ id: config.id, name: config.name, toolCount: enabled.length })
  }
  return { tools: out, toolToServer, summary }
}

import { execFileSync } from 'child_process'
import { existsSync, readFileSync, readdirSync, statSync } from 'fs'
import { homedir } from 'os'
import { join, delimiter } from 'path'

const MIN_NODE_MAJOR = 20

function readDefaultAlias(nvmDir: string): string | null {
  const aliasFile = join(nvmDir, 'alias', 'default')
  if (!existsSync(aliasFile)) return null
  const raw = readFileSync(aliasFile, 'utf8').trim()
  if (!raw) return null
  // alias may be 'lts/*' or '20' or 'v20.10.0' — resolve symbolic ones below
  return raw
}

function listInstalledVersions(nvmDir: string): string[] {
  const dir = join(nvmDir, 'versions', 'node')
  if (!existsSync(dir)) return []
  return readdirSync(dir).filter((v) => /^v\d+\./.test(v))
}

function pickLatest(versions: string[]): string | null {
  if (versions.length === 0) return null
  const parsed = versions
    .map((v) => {
      const m = v.match(/^v(\d+)\.(\d+)\.(\d+)/)
      return m ? { v, n: [+m[1], +m[2], +m[3]] as const } : null
    })
    .filter((x): x is { v: string; n: readonly [number, number, number] } => !!x)
  parsed.sort((a, b) => b.n[0] - a.n[0] || b.n[1] - a.n[1] || b.n[2] - a.n[2])
  return parsed[0]?.v ?? null
}

function resolveNvmAlias(nvmDir: string, alias: string): string | null {
  // direct version like 'v20.10.0' or '20.10.0' or '20'
  if (/^v?\d/.test(alias)) {
    const installed = listInstalledVersions(nvmDir)
    const want = alias.startsWith('v') ? alias : `v${alias}`
    const exact = installed.find((v) => v === want || v.startsWith(`${want}.`))
    if (exact) return exact
  }
  // symbolic alias — read its target
  const aliasFile = join(nvmDir, 'alias', alias)
  if (existsSync(aliasFile) && statSync(aliasFile).isFile()) {
    const target = readFileSync(aliasFile, 'utf8').trim()
    if (target && target !== alias) return resolveNvmAlias(nvmDir, target)
  }
  // lts/* → use latest installed
  return pickLatest(listInstalledVersions(nvmDir))
}

function nvmDefaultBin(): string | null {
  const nvmDir = process.env.NVM_DIR ?? join(homedir(), '.nvm')
  if (!existsSync(nvmDir)) return null
  const alias = readDefaultAlias(nvmDir)
  const version = alias ? resolveNvmAlias(nvmDir, alias) : pickLatest(listInstalledVersions(nvmDir))
  if (!version) return null
  const bin = join(nvmDir, 'versions', 'node', version, 'bin')
  return existsSync(bin) ? bin : null
}

export function buildSpawnEnv(extra: Record<string, string> = {}): Record<string, string> {
  const base = { ...(process.env as Record<string, string>) }
  const extraBin = nvmDefaultBin()
  if (extraBin) {
    const current = base.PATH ?? ''
    if (!current.split(delimiter).includes(extraBin)) {
      base.PATH = `${extraBin}${delimiter}${current}`
    }
  }
  return { ...base, ...extra }
}

function nodeMajorOf(nodeBinary: string, env: Record<string, string>): number | null {
  try {
    const out = execFileSync(nodeBinary, ['--version'], {
      env,
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 3000
    })
      .toString()
      .trim()
    const m = out.match(/^v(\d+)\./)
    return m ? +m[1] : null
  } catch {
    return null
  }
}

function which(cmd: string, env: Record<string, string>): string | null {
  const path = env.PATH ?? ''
  for (const dir of path.split(delimiter).filter(Boolean)) {
    const candidate = join(dir, cmd)
    if (existsSync(candidate)) return candidate
  }
  return null
}

// Returns null if the spawn looks fine, or a human-readable error string if
// the resolved node is too old to run modern npm packages.
export function preflightNodeCommand(
  command: string,
  env: Record<string, string>
): string | null {
  const base = command.split(/[\\/]/).pop() ?? command
  if (base !== 'npx' && base !== 'node') return null

  const nodePath = which('node', env)
  if (!nodePath) {
    return 'Could not find a `node` binary on PATH. Install Node.js 20+ and try again.'
  }
  const major = nodeMajorOf(nodePath, env)
  if (major == null) {
    return null // couldn't probe; let it run and fail naturally
  }
  if (major < MIN_NODE_MAJOR) {
    return (
      `Node ${major} is too old to run most MCP servers (need ≥ ${MIN_NODE_MAJOR}).\n` +
      `Resolved node: ${nodePath}\n` +
      `Fix: install Node ${MIN_NODE_MAJOR}+ system-wide, or launch the app from a shell where ` +
      `\`nvm use ${MIN_NODE_MAJOR}\` is active so its PATH is inherited.`
    )
  }
  return null
}

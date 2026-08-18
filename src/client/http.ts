/** JSON API client for the dsh-settings-manager host routes. */

export interface McpServerRecord {
  serverName: string
  transport: 'stdio' | 'streamable-http'
  command?: string
  args?: string[]
  env?: Record<string, string>
  cwd?: string
  url?: string
  headers?: Record<string, string>
  toolCallTimeoutMs?: number
  failOnStartupError?: boolean
  status: 'starting' | 'connected' | 'offline' | 'error'
  toolCount: number
  lastError?: string
}

export interface SkillRoot {
  key: string
  label: string
  path: string
}

export interface SkillEntry {
  name: string
  description: string
  root: string
  kind: 'bundle' | 'flat'
  path: string
  updatedAt: number
}

export interface SkillBody {
  root: string
  name: string
  description: string
  whenToUse?: string
  body: string
}

/** One tool a server exposes, as rendered in the tool list. */
export interface McpToolRecord {
  /** Tool name without the `mcp__<serverName>__` prefix. */
  name: string
  description: string
  parameters: Record<string, unknown>
}

/**
 * Call one manager API route and parse its JSON body. Throws with the
 * server-provided message when the response is not ok.
 */
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    headers: { 'content-type': 'application/json' },
    ...init,
  })
  const text = await response.text()
  let body: unknown = {}
  try {
    body = text === '' ? {} : JSON.parse(text)
  } catch {
    body = {}
  }
  if (!response.ok) {
    const message = (body as { error?: string }).error ?? `HTTP ${response.status}`
    throw new Error(message)
  }
  return body as T
}

export function listMcpServers(): Promise<{ servers: McpServerRecord[] }> {
  return api('/dsh-settings-manager/mcp')
}

export function upsertMcpServer(config: Record<string, unknown>): Promise<{ servers: McpServerRecord[] }> {
  return api('/dsh-settings-manager/mcp', { method: 'POST', body: JSON.stringify(config) })
}

export function deleteMcpServer(serverName: string): Promise<{ servers: McpServerRecord[] }> {
  return api(`/dsh-settings-manager/mcp/delete?serverName=${encodeURIComponent(serverName)}`, { method: 'DELETE' })
}

export function listMcpServerTools(serverName: string): Promise<{ tools: McpToolRecord[] }> {
  return api(`/dsh-settings-manager/mcp/tools?serverName=${encodeURIComponent(serverName)}`)
}

export function listSkills(): Promise<{ roots: SkillRoot[]; skills: SkillEntry[] }> {
  return api('/dsh-settings-manager/skills')
}

export function getSkillBody(root: string, name: string): Promise<{ skill: SkillBody }> {
  return api(`/dsh-settings-manager/skills/body?root=${encodeURIComponent(root)}&name=${encodeURIComponent(name)}`)
}

export function upsertSkill(input: {
  root: string
  name: string
  description: string
  whenToUse?: string
  body: string
}): Promise<{ skill: SkillBody }> {
  return api('/dsh-settings-manager/skills/upsert', { method: 'POST', body: JSON.stringify(input) })
}

export function deleteSkill(root: string, name: string): Promise<{ removed: boolean }> {
  return api(`/dsh-settings-manager/skills/delete?root=${encodeURIComponent(root)}&name=${encodeURIComponent(name)}`, { method: 'DELETE' })
}

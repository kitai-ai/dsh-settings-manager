/** MCP Servers settings section: list, add, edit, and remove MCP servers. */

import { useCallback, useEffect, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import {
  deleteMcpServer, listMcpServerTools, listMcpServers, upsertMcpServer,
} from './http'
import type { McpServerRecord, McpToolRecord } from './http'

type T = (key: string) => string

const STATUS_COLOR: Record<McpServerRecord['status'], string> = {
  connected: '#3fb950',
  offline: '#8b949e',
  starting: '#d29922',
  error: '#f85149',
}

const s: Record<string, CSSProperties> = {
  wrap: { display: 'flex', flexDirection: 'column', gap: '12px' },
  row: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 0', borderBottom: '1px solid rgba(128,128,128,0.25)' },
  name: { fontWeight: 600, minWidth: '150px' },
  target: { color: 'inherit', opacity: 0.75, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 12 },
  badge: { fontSize: 11, padding: '2px 8px', borderRadius: '999px', border: '1px solid rgba(128,128,128,0.4)' },
  chip: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: 12, whiteSpace: 'nowrap' },
  dot: { width: 8, height: 8, borderRadius: '50%' },
  hint: { fontSize: 12, opacity: 0.7 },
  error: { color: '#f85149', fontSize: 13 },
  button: { padding: '6px 12px', borderRadius: 6, border: '1px solid rgba(128,128,128,0.4)', background: 'transparent', color: 'inherit', cursor: 'pointer', fontSize: 13 },
  buttonPrimary: { background: 'rgba(80,140,255,0.18)', borderColor: 'rgba(80,140,255,0.55)' },
  buttonDanger: { color: '#f85149', borderColor: 'rgba(248,81,73,0.5)' },
  field: { display: 'flex', flexDirection: 'column', gap: 4 },
  label: { fontSize: 12, opacity: 0.85 },
  input: { padding: '6px 8px', borderRadius: 6, border: '1px solid rgba(128,128,128,0.4)', background: 'transparent', color: 'inherit', font: 'inherit', fontSize: 13, width: '100%', boxSizing: 'border-box' } as CSSProperties,
  textarea: { padding: '6px 8px', borderRadius: 6, border: '1px solid rgba(128,128,128,0.4)', background: 'transparent', color: 'inherit', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 12, width: '100%', boxSizing: 'border-box', minHeight: 64, resize: 'vertical' } as CSSProperties,
  editor: { display: 'flex', flexDirection: 'column', gap: 10, border: '1px solid rgba(128,128,128,0.3)', borderRadius: 8, padding: 14, background: 'rgba(128,128,128,0.06)' },
  actions: { display: 'flex', gap: 8, justifyContent: 'flex-end' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  empty: { fontSize: 13, opacity: 0.7, padding: '12px 0' },
}

function parseLines(text: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (trimmed === '') continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    out[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim()
  }
  return out
}

interface EditorProps {
  t: T
  initial: McpServerRecord | null
  onSaved: () => void
  onCancel: () => void
}

function McpEditor({ t, initial, onSaved, onCancel }: EditorProps) {
  const [transport, setTransport] = useState<'stdio' | 'streamable-http'>(initial?.transport ?? 'stdio')
  const [serverName, setServerName] = useState(initial?.serverName ?? '')
  const [command, setCommand] = useState(initial?.command ?? '')
  const [args, setArgs] = useState((initial?.args ?? []).join(' '))
  const [env, setEnv] = useState(Object.entries(initial?.env ?? {}).map(([k, v]) => `${k}=${v}`).join('\n'))
  const [cwd, setCwd] = useState(initial?.cwd ?? '')
  const [url, setUrl] = useState(initial?.url ?? '')
  const [headers, setHeaders] = useState(Object.entries(initial?.headers ?? {}).map(([k, v]) => `${k}=${v}`).join('\n'))
  const [timeoutMs, setTimeoutMs] = useState(String(initial?.toolCallTimeoutMs ?? 60000))
  const [failOnStartup, setFailOnStartup] = useState(initial?.failOnStartupError ?? false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (): Promise<void> => {
    setSaving(true)
    setError(null)
    const config: Record<string, unknown> = {
      serverName: serverName.trim(),
      transport,
      toolCallTimeoutMs: Number(timeoutMs) || 60000,
      failOnStartupError: failOnStartup,
    }
    if (transport === 'stdio') {
      config.command = command.trim()
      config.args = args.split(/\s+/).filter(Boolean)
      config.env = parseLines(env)
      config.cwd = cwd.trim()
    } else {
      config.url = url.trim()
      config.headers = parseLines(headers)
    }
    try {
      await upsertMcpServer(config)
      onSaved()
    } catch (e) {
      setError(String(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={s.editor}>
      <div style={s.grid2}>
        <div style={s.field}>
          <label style={s.label}>{t('serverName')}</label>
          <input style={s.input} value={serverName} onChange={(e) => setServerName(e.target.value)} placeholder="github" />
        </div>
        <div style={s.field}>
          <label style={s.label}>{t('transport')}</label>
          <select style={s.input} value={transport} onChange={(e) => setTransport(e.target.value as 'stdio' | 'streamable-http')}>
            <option value="stdio">{t('stdio')}</option>
            <option value="streamable-http">{t('streamableHttp')}</option>
          </select>
        </div>
      </div>
      <div style={s.hint}>{t('serverNameHint')}</div>
      {transport === 'stdio' ? (
        <>
          <div style={s.grid2}>
            <div style={s.field}>
              <label style={s.label}>{t('command')}</label>
              <input style={s.input} value={command} onChange={(e) => setCommand(e.target.value)} placeholder="npx" />
            </div>
            <div style={s.field}>
              <label style={s.label}>{t('args')}</label>
              <input style={s.input} value={args} onChange={(e) => setArgs(e.target.value)} placeholder="-y @modelcontextprotocol/server-github" />
            </div>
          </div>
          <div style={s.field}>
            <label style={s.label}>{t('env')}</label>
            <textarea style={s.textarea} value={env} onChange={(e) => setEnv(e.target.value)} placeholder="GITHUB_TOKEN=ghp_xxx" />
          </div>
          <div style={s.field}>
            <label style={s.label}>{t('cwd')}</label>
            <input style={s.input} value={cwd} onChange={(e) => setCwd(e.target.value)} />
          </div>
        </>
      ) : (
        <>
          <div style={s.field}>
            <label style={s.label}>{t('url')}</label>
            <input style={s.input} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="http://localhost:3000/mcp" />
          </div>
          <div style={s.field}>
            <label style={s.label}>{t('headers')}</label>
            <textarea style={s.textarea} value={headers} onChange={(e) => setHeaders(e.target.value)} placeholder="Authorization=Bearer xxx" />
          </div>
        </>
      )}
      <div style={s.grid2}>
        <div style={s.field}>
          <label style={s.label}>{t('timeout')}</label>
          <input style={s.input} type="number" value={timeoutMs} onChange={(e) => setTimeoutMs(e.target.value)} />
        </div>
        <div style={{ ...s.field, justifyContent: 'flex-end' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <input type="checkbox" checked={failOnStartup} onChange={(e) => setFailOnStartup(e.target.checked)} />
            {t('failOnStartup')}
          </label>
        </div>
      </div>
      {error !== null && <div style={s.error}>{error}</div>}
      <div style={s.actions}>
        <button style={s.button} onClick={onCancel} disabled={saving}>{t('cancel')}</button>
        <button style={{ ...s.button, ...s.buttonPrimary }} onClick={() => void submit()} disabled={saving}>{saving ? '…' : t('save')}</button>
      </div>
    </div>
  )
}

/** Render a tool's JSON-schema parameters as a compact `name, other*` line (`*` = required). */
function toolParams(parameters: Record<string, unknown>): string | undefined {
  const props = (parameters as { properties?: Record<string, unknown> }).properties
  if (props === undefined) return undefined
  const names = Object.keys(props)
  if (names.length === 0) return undefined
  const requiredRaw = (parameters as { required?: unknown }).required
  const required = new Set(
    Array.isArray(requiredRaw) ? requiredRaw.filter((item): item is string => typeof item === 'string') : [],
  )
  return names.map((name) => (required.has(name) ? `${name}*` : name)).join(', ')
}

/** The tool list of one server: fetched on open, rendered as name/description/params rows. */
function McpToolList({ t, server, onClose }: { t: T; server: McpServerRecord; onClose: () => void }): ReactNode {
  const [tools, setTools] = useState<McpToolRecord[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    listMcpServerTools(server.serverName)
      .then((data) => {
        if (!cancelled) setTools(data.tools)
      })
      .catch((e) => {
        if (!cancelled) setError(String(e))
      })
    return () => {
      cancelled = true
    }
  }, [server.serverName])

  return (
    <div style={s.editor}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{server.serverName}</div>
        <button style={s.button} onClick={onClose}>{t('close')}</button>
      </div>
      {error !== null ? (
        <div style={s.error}>{error}</div>
      ) : tools === null ? (
        <div style={s.empty}>…</div>
      ) : tools.length === 0 ? (
        <div style={s.empty}>{t('noTools')}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {tools.map((tool) => {
            const params = toolParams(tool.parameters)
            return (
              <div key={tool.name} style={{ padding: '8px 0', borderBottom: '1px solid rgba(128,128,128,0.25)' }}>
                <div style={{ fontWeight: 600, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 13 }}>{tool.name}</div>
                {tool.description !== '' && <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>{tool.description}</div>}
                {params !== undefined && <div style={{ fontSize: 12, opacity: 0.6, marginTop: 2 }}>{t('params')}: {params}</div>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function statusLabel(t: T, status: McpServerRecord['status']): string {
  switch (status) {
    case 'connected': return t('connected')
    case 'offline': return t('offline')
    case 'starting': return t('starting')
    case 'error': return t('error')
  }
}

export function McpSection({ t }: { t: T }): ReactNode {
  const [servers, setServers] = useState<McpServerRecord[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<McpServerRecord | 'new' | null>(null)
  const [viewingTools, setViewingTools] = useState<McpServerRecord | null>(null)

  const refresh = useCallback(async (): Promise<void> => {
    try {
      const data = await listMcpServers()
      setServers(data.servers)
      setError(null)
    } catch (e) {
      setError(String(e))
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const remove = async (serverName: string): Promise<void> => {
    if (!window.confirm(t('confirmRemove'))) return
    try {
      const data = await deleteMcpServer(serverName)
      setServers(data.servers)
    } catch (e) {
      setError(String(e))
    }
  }

  return (
    <div style={s.wrap}>
      <div style={s.hint}>{t('mcpSubtitle')}</div>
      {error !== null && <div style={s.error}>{error}</div>}
      {editing !== null && (
        <McpEditor
          t={t}
          initial={editing === 'new' ? null : editing}
          onSaved={() => {
            setEditing(null)
            void refresh()
          }}
          onCancel={() => setEditing(null)}
        />
      )}
      {viewingTools !== null && (
        <McpToolList t={t} server={viewingTools} onClose={() => setViewingTools(null)} />
      )}
      {servers === null ? (
        <div style={s.empty}>…</div>
      ) : servers.length === 0 ? (
        <div style={s.empty}>{t('emptyServers')}</div>
      ) : (
        servers.map((server) => (
          <div key={server.serverName} style={s.row}>
            <span style={s.name}>{server.serverName}</span>
            <span style={s.badge}>{server.transport}</span>
            <span style={s.target}>{server.transport === 'stdio' ? `${server.command} ${(server.args ?? []).join(' ')}`.trim() : server.url}</span>
            <span style={s.chip}>
              <span style={{ ...s.dot, background: STATUS_COLOR[server.status] }} />
              {statusLabel(t, server.status)}
              {server.toolCount > 0 ? ` · ${server.toolCount}${t('toolsCount')}` : ''}
            </span>
            <button style={s.button} onClick={() => setViewingTools(server)}>{t('viewTools')}</button>
            <button style={s.button} onClick={() => setEditing(server)}>{t('edit')}</button>
            <button style={{ ...s.button, ...s.buttonDanger }} onClick={() => void remove(server.serverName)}>{t('delete')}</button>
          </div>
        ))
      )}
      {editing === null && (
        <div>
          <button style={{ ...s.button, ...s.buttonPrimary }} onClick={() => setEditing('new')}>{t('addServer')}</button>
        </div>
      )}
    </div>
  )
}

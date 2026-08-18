/**
 * dsh-settings-manager host plugin: mounts the MCP server and skill managers
 * and exposes their JSON API over the web server routes the browser settings
 * pages call. Every mutation route is restricted to loopback same-origin
 * requests; read routes are open to the loopback binding only.
 *
 * @module @deepseek-ai/dsh-settings-manager
 */

import type { Context } from '@deepseek-ai/cordis'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { createMcpManager } from './mcp.js'
import { deleteSkill, getSkillBody, listSkills, upsertSkill } from './skills.js'
import type { UpsertSkillInput } from './skills.js'
import { queryParam, readJsonBody, sendJson, trustedRequest } from './util.js'

/** Cordis plugin name used by loader diagnostics. */
export const name = 'dsh-settings-manager'

/** Services required by this plugin. */
export const inject = ['webServer', 'tools']

interface WebServer {
  register(route: {
    kind: 'exact' | 'prefix'
    path: string
    handler: (req: IncomingMessage, res: ServerResponse) => void
  }): () => void
}

interface ToolsLike {
  schemas(): { name: string }[]
}

/** The host context this plugin needs. */
export type HostContext = Context & { webServer: WebServer; tools: ToolsLike }

/** Method check shared by every route. */
function method(req: IncomingMessage, res: ServerResponse, allowed: string[]): boolean {
  if (allowed.includes(req.method ?? '')) return true
  sendJson(res, 405, { error: 'method not allowed' })
  return false
}

/** Guard mutating routes against cross-origin requests. */
function guarded(req: IncomingMessage, res: ServerResponse): boolean {
  if (trustedRequest(req)) return true
  sendJson(res, 403, { error: 'cross-origin request rejected' })
  return false
}

/**
 * Mount the manager's HTTP routes and MCP lifecycle for one host context.
 * @param ctx - the host context with webServer and tools injected.
 */
export function apply(ctx: HostContext): void {
  const mcp = createMcpManager(ctx)

  const disposers = [
    ctx.webServer.register({
      kind: 'exact',
      path: '/dsh-settings-manager/mcp',
      handler: (req, res) => {
        void (async () => {
          if (req.method === 'GET') {
            sendJson(res, 200, { servers: mcp.list() })
            return
          }
          if (req.method === 'POST') {
            if (!guarded(req, res)) return
            const body = await readJsonBody(req).catch(() => undefined)
            const result = mcp.upsert(body)
            if (!result.ok) {
              sendJson(res, 400, { error: result.error })
              return
            }
            sendJson(res, 200, { servers: result.servers })
            return
          }
          sendJson(res, 405, { error: 'method not allowed' })
        })()
      },
    }),

    ctx.webServer.register({
      kind: 'exact',
      path: '/dsh-settings-manager/mcp/delete',
      handler: (req, res) => {
        if (!method(req, res, ['DELETE'])) return
        if (!guarded(req, res)) return
        const serverName = queryParam(req.url, 'serverName')
        if (serverName === undefined || serverName === '') {
          sendJson(res, 400, { error: 'missing serverName query parameter' })
          return
        }
        const result = mcp.remove(serverName)
        if (!result.ok) {
          sendJson(res, 400, { error: result.error })
          return
        }
        sendJson(res, 200, { servers: result.servers })
      },
    }),

    ctx.webServer.register({
      kind: 'exact',
      path: '/dsh-settings-manager/skills',
      handler: (req, res) => {
        if (!method(req, res, ['GET'])) return
        sendJson(res, 200, listSkills())
      },
    }),

    ctx.webServer.register({
      kind: 'exact',
      path: '/dsh-settings-manager/skills/body',
      handler: (req, res) => {
        if (!method(req, res, ['GET'])) return
        const root = queryParam(req.url, 'root')
        const name = queryParam(req.url, 'name')
        if (root === undefined || name === undefined) {
          sendJson(res, 400, { error: 'missing root or name query parameter' })
          return
        }
        const result = getSkillBody(root, name)
        if (!result.ok) {
          sendJson(res, 400, { error: result.error })
          return
        }
        sendJson(res, 200, { skill: result.value })
      },
    }),

    ctx.webServer.register({
      kind: 'exact',
      path: '/dsh-settings-manager/skills/upsert',
      handler: (req, res) => {
        void (async () => {
          if (!method(req, res, ['POST'])) return
          if (!guarded(req, res)) return
          const body = await readJsonBody(req).catch(() => undefined)
          const result = upsertSkill(body as UpsertSkillInput)
          if (!result.ok) {
            sendJson(res, 400, { error: result.error })
            return
          }
          sendJson(res, 200, { skill: result.value })
        })()
      },
    }),

    ctx.webServer.register({
      kind: 'exact',
      path: '/dsh-settings-manager/skills/delete',
      handler: (req, res) => {
        if (!method(req, res, ['DELETE'])) return
        if (!guarded(req, res)) return
        const root = queryParam(req.url, 'root')
        const name = queryParam(req.url, 'name')
        if (root === undefined || name === undefined) {
          sendJson(res, 400, { error: 'missing root or name query parameter' })
          return
        }
        const result = deleteSkill(root, name)
        if (!result.ok) {
          sendJson(res, 400, { error: result.error })
          return
        }
        sendJson(res, 200, result.value)
      },
    }),
  ]

  ctx.effect(() => {
    return () => {
      for (const dispose of disposers) dispose()
      mcp.dispose()
    }
  }, 'dsh-settings-manager: http routes and mcp mounts')
}

/**
 * dsh-settings-manager browser half: registers the "MCP 服务器" and "技能"
 * settings sections. The client plugin system serves this bundle at
 * `/plugins/dsh-settings-manager/client.js` because the package declares
 * `dsh.client` (see package.json).
 *
 * @module
 */

import { createElement } from 'react'
import { McpSection } from './McpSection'
import { SkillsSection } from './SkillsSection'
import { dictionaries } from './locales'

export const name = 'dsh-settings-manager'

/** Services required by this client plugin. */
export const inject = ['slots', 'locale']

/** Locale namespace for this plugin's copy. */
const NS = 'dsh-settings-manager'

/** Structural client context: slots ledger + locale service. */
interface ClientCtx {
  effect(fn: () => unknown, label?: string): void
  locale: {
    register(ns: string, dict: { zh: Record<string, string>; en: Record<string, string> }): unknown
    bind(ns: string): (key: string) => string
  }
  slots: {
    inject(name: string, register: () => unknown): unknown
    register(options: Record<string, unknown>, component: unknown): unknown
  }
}

/**
 * Register the settings sections. Each section renders a React component that
 * talks to the host JSON API over the same-origin HTTP routes.
 * @param ctx - the client context with slots and locale injected.
 */
export function apply(ctx: ClientCtx): void {
  ctx.effect(() => ctx.locale.register(NS, dictionaries), 'dsh-settings-manager: dictionaries')
  const t = ctx.locale.bind(NS)

  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 'mcp-servers',
    order: 30,
    label: () => t('navMcp'),
    locale: NS,
  }, () => createElement(McpSection, { t })))

  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 'skills',
    order: 31,
    label: () => t('navSkills'),
    locale: NS,
  }, () => createElement(SkillsSection, { t })))
}

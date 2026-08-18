/**
 * MCP server manager: persists the configured server list under the active
 * profile (`<profileDir>/mcp.servers.yml`) and reconciles it against live
 * `@deepseek-ai/dsh-mcp-client` plugin instances mounted at runtime. Add,
 * update, and remove take effect immediately — mounting/unmounting the plugin
 * registers/unregisters the server's tools on the shared tool registry with no
 * patch-file surgery and no composition reload.
 *
 * Connection state is derived from the tool registry: a server is
 * `connected` while at least one `mcp__<serverName>__*` tool is registered.
 *
 * @module
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { load as parseYaml, dump as dumpYaml } from 'js-yaml';
import * as mcpClient from '@deepseek-ai/dsh-mcp-client';
import { profileDir } from './util.js';
const SERVER_NAME_PATTERN = /^[A-Za-z0-9_-]{1,32}$/;
function arrayOfStrings(value, field) {
    if (value === undefined)
        return { ok: true, value: [] };
    if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
        return { ok: false, error: `${field} must be a string array` };
    }
    return { ok: true, value: value };
}
function recordOfStrings(value, field) {
    if (value === undefined)
        return { ok: true, value: {} };
    if (typeof value !== 'object' || value === null)
        return { ok: false, error: `${field} must be an object of string values` };
    const record = {};
    for (const [key, item] of Object.entries(value)) {
        if (typeof item !== 'string')
            return { ok: false, error: `${field}.${key} must be a string` };
        record[key] = item;
    }
    return { ok: true, value: record };
}
function positiveInt(value, fallback) {
    return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}
function normalizeReconnect(value) {
    if (typeof value !== 'object' || value === null)
        return { ok: false, error: 'reconnect must be an object' };
    const raw = value;
    const result = {};
    if (raw.enabled !== undefined) {
        if (typeof raw.enabled !== 'boolean')
            return { ok: false, error: 'reconnect.enabled must be a boolean' };
        result.enabled = raw.enabled;
    }
    for (const field of ['initialDelayMs', 'maxDelayMs', 'maxAttempts']) {
        if (raw[field] !== undefined) {
            if (typeof raw[field] !== 'number' || !Number.isFinite(raw[field])) {
                return { ok: false, error: `reconnect.${field} must be a number` };
            }
            result[field] = raw[field];
        }
    }
    return { ok: true, value: result };
}
/**
 * Validate and normalize a raw API input into the full mcp-client Config,
 * applying the same defaults the plugin schema would.
 */
export function normalizeConfig(input) {
    if (typeof input !== 'object' || input === null)
        return { error: 'config must be an object' };
    const raw = input;
    const serverName = raw.serverName;
    if (typeof serverName !== 'string' || !SERVER_NAME_PATTERN.test(serverName)) {
        return { error: 'serverName must match [A-Za-z0-9_-]{1,32}' };
    }
    let reconnect;
    if (raw.reconnect !== undefined) {
        const result = normalizeReconnect(raw.reconnect);
        if (!result.ok)
            return result;
        reconnect = result.value;
    }
    const base = {
        serverName,
        toolCallTimeoutMs: positiveInt(raw.toolCallTimeoutMs, 60_000),
        failOnStartupError: raw.failOnStartupError === true,
        ...(reconnect !== undefined ? { reconnect } : {}),
    };
    const transport = raw.transport;
    if (transport === 'stdio') {
        if (typeof raw.command !== 'string' || raw.command.trim() === '') {
            return { error: 'stdio transport requires a command' };
        }
        const args = arrayOfStrings(raw.args, 'args');
        if (!args.ok)
            return args;
        const env = recordOfStrings(raw.env, 'env');
        if (!env.ok)
            return env;
        return {
            ...base,
            transport: 'stdio',
            command: raw.command,
            args: args.value,
            env: env.value,
            cwd: typeof raw.cwd === 'string' ? raw.cwd : '',
        };
    }
    if (transport === 'streamable-http') {
        if (typeof raw.url !== 'string' || raw.url.trim() === '') {
            return { error: 'streamable-http transport requires a url' };
        }
        let parsed;
        try {
            parsed = new URL(raw.url);
        }
        catch {
            return { error: 'url must be a valid absolute URL' };
        }
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            return { error: 'url must use http or https' };
        }
        const headers = recordOfStrings(raw.headers, 'headers');
        if (!headers.ok)
            return headers;
        return { ...base, transport: 'streamable-http', url: raw.url, headers: headers.value };
    }
    return { error: 'transport must be "stdio" or "streamable-http"' };
}
/** Whether two normalized configs describe the same server (fixed key order makes string compare sound). */
function sameConfig(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
}
/** Flatten an error's cause chain into one readable message. */
function describeError(error) {
    const seen = new Set();
    const parts = [];
    let current = error;
    while (current !== undefined && current !== null && !seen.has(current)) {
        seen.add(current);
        if (current instanceof Error) {
            parts.push(current.message);
            current = current.cause;
        }
        else {
            parts.push(String(current));
            current = undefined;
        }
    }
    return parts.join(' ← ');
}
/**
 * Create the MCP manager for one host context. Mounts the persisted servers
 * immediately and keeps live instances reconciled against the file on every
 * mutation.
 * @param ctx - the host context with the tool registry injected.
 */
export function createMcpManager(ctx) {
    const file = join(profileDir(), 'mcp.servers.yml');
    const live = new Map();
    function readServers() {
        if (!existsSync(file))
            return [];
        let parsed;
        try {
            parsed = parseYaml(readFileSync(file, 'utf8'));
        }
        catch (error) {
            ctx.logger.warn('dsh-settings-manager: failed to parse %s: %o', file, error);
            return [];
        }
        if (!Array.isArray(parsed)) {
            ctx.logger.warn('dsh-settings-manager: %s must contain a YAML list of servers', file);
            return [];
        }
        const servers = [];
        for (const entry of parsed) {
            const result = normalizeConfig(entry);
            if ('error' in result) {
                ctx.logger.warn('dsh-settings-manager: skipping invalid server entry in %s: %s', file, result.error);
                continue;
            }
            servers.push(result);
        }
        return servers;
    }
    function persist(servers) {
        mkdirSync(profileDir(), { recursive: true });
        writeFileSync(file, dumpYaml(servers, { noRefs: true, lineWidth: 120 }));
    }
    function refreshStatus() {
        const schemas = ctx.tools.schemas();
        for (const [name, entry] of live) {
            const count = schemas.filter((schema) => schema.name.startsWith(`mcp__${name}__`)).length;
            entry.state.toolCount = count;
            if (count > 0) {
                entry.state.status = 'connected';
            }
            else if (entry.state.status === 'starting') {
                entry.state.status = 'offline';
            }
        }
    }
    function mount(config) {
        if (live.has(config.serverName))
            return;
        const state = { status: 'starting', toolCount: 0 };
        let fiber;
        try {
            fiber = ctx.plugin(mcpClient, config);
        }
        catch (error) {
            state.status = 'error';
            state.lastError = String(error);
            live.set(config.serverName, {
                config,
                fiber: Object.assign({ dispose: () => undefined }, Promise.resolve()),
                state,
            });
            return;
        }
        live.set(config.serverName, { config, fiber, state });
        fiber.then(() => {
            if (live.get(config.serverName)?.state === state)
                refreshStatus();
        }, (error) => {
            state.status = 'error';
            state.lastError = describeError(error);
        });
    }
    function unmount(serverName) {
        const entry = live.get(serverName);
        if (entry === undefined)
            return;
        live.delete(serverName);
        try {
            void entry.fiber.dispose();
        }
        catch {
            // disposal failure keeps no stale mount: the entry is already gone
        }
    }
    function reconcile() {
        const desired = readServers();
        const desiredNames = new Set(desired.map((server) => server.serverName));
        for (const name of [...live.keys()]) {
            if (!desiredNames.has(name))
                unmount(name);
        }
        for (const config of desired) {
            const entry = live.get(config.serverName);
            if (entry === undefined) {
                mount(config);
            }
            else if (!sameConfig(entry.config, config) || entry.state.status === 'error') {
                // A failed mount is retried on the next reconcile (including a save
                // that did not change the config): the error state is stale once the
                // underlying server recovers.
                unmount(config.serverName);
                mount(config);
            }
        }
        refreshStatus();
    }
    ctx.on('tools/change', (() => refreshStatus()));
    reconcile();
    return {
        list() {
            const order = readServers().map((server) => server.serverName);
            const byName = new Map();
            for (const [name, entry] of live) {
                byName.set(name, {
                    ...entry.config,
                    status: entry.state.status,
                    toolCount: entry.state.toolCount,
                    ...(entry.state.lastError !== undefined ? { lastError: entry.state.lastError } : {}),
                });
            }
            return order
                .map((name) => byName.get(name))
                .filter((record) => record !== undefined);
        },
        upsert(input) {
            const result = normalizeConfig(input);
            if ('error' in result)
                return { ok: false, error: result.error };
            const servers = readServers();
            const index = servers.findIndex((server) => server.serverName === result.serverName);
            if (index === -1)
                servers.push(result);
            else
                servers[index] = result;
            try {
                persist(servers);
            }
            catch (error) {
                return { ok: false, error: `failed to write ${file}: ${String(error)}` };
            }
            reconcile();
            return { ok: true, servers: this.list() };
        },
        remove(serverName) {
            const before = readServers();
            const after = before.filter((server) => server.serverName !== serverName);
            if (after.length === before.length)
                return { ok: false, error: `no server named "${serverName}"` };
            try {
                persist(after);
            }
            catch (error) {
                return { ok: false, error: `failed to write ${file}: ${String(error)}` };
            }
            reconcile();
            return { ok: true, servers: this.list() };
        },
        listTools(serverName) {
            const entry = live.get(serverName);
            if (entry === undefined)
                return { ok: false, error: `no server named "${serverName}"` };
            const prefix = `mcp__${serverName}__`;
            const value = [];
            for (const schema of ctx.tools.schemas()) {
                if (!schema.name.startsWith(prefix))
                    continue;
                value.push({
                    name: schema.name.slice(prefix.length),
                    description: schema.description,
                    parameters: schema.parameters,
                });
            }
            value.sort((a, b) => a.name.localeCompare(b.name));
            return { ok: true, value };
        },
        dispose() {
            for (const name of [...live.keys()])
                unmount(name);
        },
    };
}
//# sourceMappingURL=mcp.js.map
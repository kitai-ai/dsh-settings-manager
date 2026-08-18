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
import type { Context } from '@deepseek-ai/cordis';
import type { Config as McpClientConfig } from '@deepseek-ai/dsh-mcp-client';
/** A normalized, persisted MCP server configuration (the mcp-client Config). */
export type McpServerConfig = McpClientConfig;
/** One model-facing tool schema the shared tool registry projects. */
export interface RegisteredToolSchema {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
}
/** Live connection state for one server, derived from the tool registry. */
export interface McpServerState {
    status: 'starting' | 'connected' | 'offline' | 'error';
    toolCount: number;
    lastError?: string;
}
/** One row the browser renders: the persisted config plus live state. */
export type McpServerRecord = McpServerConfig & {
    status: McpServerState['status'];
    toolCount: number;
    lastError?: string;
};
export type UpsertResult = {
    ok: true;
    servers: McpServerRecord[];
} | {
    ok: false;
    error: string;
};
/** One tool a server exposes, as the browser tool list renders it. */
export interface McpToolSummary {
    /** Tool name without the `mcp__<serverName>__` prefix. */
    name: string;
    description: string;
    parameters: Record<string, unknown>;
}
export type ToolsResult = {
    ok: true;
    value: McpToolSummary[];
} | {
    ok: false;
    error: string;
};
/** The host context this manager needs: the tool registry's schema view. */
type ManagerContext = Context & {
    tools: {
        schemas(): RegisteredToolSchema[];
    };
};
/**
 * Validate and normalize a raw API input into the full mcp-client Config,
 * applying the same defaults the plugin schema would.
 */
export declare function normalizeConfig(input: unknown): McpServerConfig | {
    error: string;
};
export interface McpManager {
    list(): McpServerRecord[];
    upsert(input: unknown): UpsertResult;
    remove(serverName: string): UpsertResult;
    listTools(serverName: string): ToolsResult;
    dispose(): void;
}
/**
 * Create the MCP manager for one host context. Mounts the persisted servers
 * immediately and keeps live instances reconciled against the file on every
 * mutation.
 * @param ctx - the host context with the tool registry injected.
 */
export declare function createMcpManager(ctx: ManagerContext): McpManager;
export {};

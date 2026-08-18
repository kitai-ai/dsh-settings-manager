/**
 * dsh-settings-manager host plugin: mounts the MCP server and skill managers
 * and exposes their JSON API over the web server routes the browser settings
 * pages call. Every mutation route is restricted to loopback same-origin
 * requests; read routes are open to the loopback binding only.
 *
 * @module @deepseek-ai/dsh-settings-manager
 */
import type { Context } from '@deepseek-ai/cordis';
import type { IncomingMessage, ServerResponse } from 'node:http';
/** Cordis plugin name used by loader diagnostics. */
export declare const name = "dsh-settings-manager";
/** Services required by this plugin. */
export declare const inject: string[];
interface WebServer {
    register(route: {
        kind: 'exact' | 'prefix';
        path: string;
        handler: (req: IncomingMessage, res: ServerResponse) => void;
    }): () => void;
}
interface ToolsLike {
    schemas(): {
        name: string;
    }[];
}
/** The host context this plugin needs. */
export type HostContext = Context & {
    webServer: WebServer;
    tools: ToolsLike;
};
/**
 * Mount the manager's HTTP routes and MCP lifecycle for one host context.
 * @param ctx - the host context with webServer and tools injected.
 */
export declare function apply(ctx: HostContext): void;
export {};

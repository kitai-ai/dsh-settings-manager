/**
 * Shared host-side helpers for the dsh-settings-manager host plugin: harness
 * home / profile resolution, loopback request trust, and JSON body handling.
 *
 * @module
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
/** Resolve the harness home (`$DSH_HOME` or `~/.dsh`), mirroring `dsh-home-paths`. */
export declare function resolveDshHome(env?: NodeJS.ProcessEnv): string;
/** The profile this process booted (`--profile <name>` on the dsh CLI invocation). */
export declare function profileNameFromArgv(argv?: string[]): string;
/** Absolute path of the active profile directory. */
export declare function profileDir(home?: string, profile?: string): string;
/** Whether a `Host` header names the loopback interface. */
export declare function isLoopbackHost(host: string | undefined): boolean;
/**
 * Reject cross-origin requests to mutating routes: browser same-origin pages
 * send an `Origin` header matching `Host`, while curl and other tools omit it.
 * A present, mismatched origin is the only denied case.
 */
export declare function trustedRequest(req: IncomingMessage): boolean;
/** Send a JSON response with a fixed content-type. */
export declare function sendJson(res: ServerResponse, status: number, body: unknown): void;
/** Read and parse the JSON request body; resolves `undefined` for an empty body. */
export declare function readJsonBody(req: IncomingMessage): Promise<unknown>;
/** Read one query parameter from a request URL (the path may be relative). */
export declare function queryParam(url: string | undefined, name: string): string | undefined;
/** Expand a leading `~` to the user's home directory. */
export declare function expandHomePath(path: string, env?: NodeJS.ProcessEnv): string;

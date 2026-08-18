/**
 * Shared host-side helpers for the dsh-settings-manager host plugin: harness
 * home / profile resolution, loopback request trust, and JSON body handling.
 *
 * @module
 */
import { homedir } from 'node:os';
import { join } from 'node:path';
/** Resolve the harness home (`$DSH_HOME` or `~/.dsh`), mirroring `dsh-home-paths`. */
export function resolveDshHome(env = process.env) {
    return env.DSH_HOME ?? join(homedir(), '.dsh');
}
/** The profile this process booted (`--profile <name>` on the dsh CLI invocation). */
export function profileNameFromArgv(argv = process.argv) {
    const flag = argv.indexOf('--profile');
    if (flag !== -1 && flag + 1 < argv.length && !argv[flag + 1].startsWith('-'))
        return argv[flag + 1];
    return 'web';
}
/** Absolute path of the active profile directory. */
export function profileDir(home = resolveDshHome(), profile = profileNameFromArgv()) {
    return join(home, 'profiles', profile);
}
/** Whether a `Host` header names the loopback interface. */
export function isLoopbackHost(host) {
    if (host === undefined)
        return true;
    const name = host.split(':')[0].replace(/^\[|\]$/g, '');
    return name === 'localhost' || name === '127.0.0.1' || name === '::1' || name === '::ffff:127.0.0.1';
}
/**
 * Reject cross-origin requests to mutating routes: browser same-origin pages
 * send an `Origin` header matching `Host`, while curl and other tools omit it.
 * A present, mismatched origin is the only denied case.
 */
export function trustedRequest(req) {
    if (!isLoopbackHost(req.headers.host))
        return false;
    const origin = req.headers.origin;
    if (origin === undefined)
        return true;
    try {
        return new URL(origin).host === req.headers.host;
    }
    catch {
        return false;
    }
}
/** Send a JSON response with a fixed content-type. */
export function sendJson(res, status, body) {
    const payload = JSON.stringify(body);
    res.writeHead(status, {
        'content-type': 'application/json; charset=utf-8',
        'content-length': Buffer.byteLength(payload),
    });
    res.end(payload);
}
/** Read and parse the JSON request body; resolves `undefined` for an empty body. */
export function readJsonBody(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        req.on('data', (chunk) => chunks.push(chunk));
        req.on('end', () => {
            const raw = Buffer.concat(chunks).toString('utf8');
            if (raw.trim() === '') {
                resolve(undefined);
                return;
            }
            try {
                resolve(JSON.parse(raw));
            }
            catch (error) {
                reject(error);
            }
        });
        req.on('error', reject);
    });
}
/** Read one query parameter from a request URL (the path may be relative). */
export function queryParam(url, name) {
    if (url === undefined)
        return undefined;
    try {
        return new URL(url, 'http://localhost').searchParams.get(name) ?? undefined;
    }
    catch {
        return undefined;
    }
}
/** Expand a leading `~` to the user's home directory. */
export function expandHomePath(path, env = process.env) {
    if (path === '~')
        return env.HOME ?? homedir();
    if (path.startsWith('~/'))
        return join(env.HOME ?? homedir(), path.slice(2));
    return path;
}
//# sourceMappingURL=util.js.map
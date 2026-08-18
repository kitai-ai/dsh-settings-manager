/**
 * Skills manager: lists, reads, writes, and deletes local skill files across
 * the standard skill roots (project `.dsh`/`.agents`, user `~/.dsh/skills`,
 * shared `~/.agents/skills`). The filesystem skill provider watches these
 * roots, so every mutation lands in the model-visible catalog automatically.
 *
 * @module
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { load as parseYaml, dump as dumpYaml } from 'js-yaml';
import { expandHomePath, resolveDshHome } from './util.js';
const SKILL_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;
/** Resolve the standard skill roots in provider rank order (project before user). */
export function skillRoots(env = process.env) {
    const home = resolveDshHome(env);
    const cwd = process.cwd();
    const project = nearestGitRoot(cwd) ?? cwd;
    const agentsHome = env.DSH_AGENTS_HOME ?? expandHomePath('~/.agents');
    return [
        { key: 'project-dsh', label: '项目 .dsh/skills', path: join(project, '.dsh', 'skills') },
        { key: 'project-agents', label: '项目 .agents/skills', path: join(project, '.agents', 'skills') },
        { key: 'user-dsh', label: '用户 ~/.dsh/skills', path: join(home, 'skills') },
        { key: 'user-agents', label: '共享 ~/.agents/skills', path: join(agentsHome, 'skills') },
    ];
}
/** Nearest ancestor directory containing a `.git` entry, or undefined. */
export function nearestGitRoot(start) {
    let current = start;
    for (;;) {
        if (existsSync(join(current, '.git')))
            return current;
        const parent = join(current, '..');
        if (parent === current)
            return undefined;
        current = parent;
    }
}
/** Parse a skill file's frontmatter; a file without frontmatter yields an empty body split. */
function readSkillFile(path) {
    const raw = readFileSync(path, 'utf8');
    const match = FRONTMATTER.exec(raw);
    if (match === null)
        return { description: '', body: raw };
    let meta = {};
    try {
        const parsed = parseYaml(match[1]);
        if (parsed !== null && typeof parsed === 'object')
            meta = parsed;
    }
    catch {
        meta = {};
    }
    return {
        description: typeof meta.description === 'string' ? meta.description : '',
        ...(typeof meta.whenToUse === 'string' ? { whenToUse: meta.whenToUse } : {}),
        body: raw.slice(match[0].length),
    };
}
function skillFileFor(root, name) {
    const bundle = join(root, name, 'SKILL.md');
    if (existsSync(bundle))
        return { path: bundle, kind: 'bundle' };
    const flat = join(root, `${name}.md`);
    if (existsSync(flat))
        return { path: flat, kind: 'flat' };
    return undefined;
}
/** List every skill across the standard roots, newest first within each root. */
export function listSkills(env) {
    const roots = skillRoots(env);
    const skills = [];
    for (const root of roots) {
        if (!existsSync(root.path))
            continue;
        let entries;
        try {
            entries = readdirSync(root.path);
        }
        catch {
            continue;
        }
        for (const entry of entries) {
            if (entry.startsWith('.') || entry.startsWith('_'))
                continue;
            const full = join(root.path, entry);
            let stat;
            try {
                stat = statSync(full);
            }
            catch {
                continue;
            }
            if (stat.isDirectory()) {
                const skillMd = join(full, 'SKILL.md');
                if (!existsSync(skillMd))
                    continue;
                const parsed = readSkillFile(skillMd);
                skills.push({
                    name: entry,
                    description: parsed.description,
                    root: root.path,
                    kind: 'bundle',
                    path: skillMd,
                    updatedAt: stat.mtimeMs,
                });
            }
            else if (stat.isFile() && entry.endsWith('.md') && entry !== 'SKILL.md') {
                const name = entry.slice(0, -3);
                if (!SKILL_NAME.test(name))
                    continue;
                const parsed = readSkillFile(full);
                skills.push({
                    name,
                    description: parsed.description,
                    root: root.path,
                    kind: 'flat',
                    path: full,
                    updatedAt: stat.mtimeMs,
                });
            }
        }
    }
    return { roots, skills };
}
/** Read one skill's full body and frontmatter fields. */
export function getSkillBody(root, name) {
    if (!SKILL_NAME.test(name))
        return { ok: false, error: '技能名必须是 kebab-case（小写字母和数字，用 - 连接）' };
    const target = skillFileFor(root, name);
    if (target === undefined)
        return { ok: false, error: `未找到技能 "${name}"` };
    try {
        const parsed = readSkillFile(target.path);
        return { ok: true, value: { root, name, description: parsed.description, ...(parsed.whenToUse !== undefined ? { whenToUse: parsed.whenToUse } : {}), body: parsed.body } };
    }
    catch (error) {
        return { ok: false, error: `读取失败: ${String(error)}` };
    }
}
/** Create or overwrite one skill file (bundle form unless a flat file already exists). */
export function upsertSkill(input) {
    const name = input.name.trim();
    if (!SKILL_NAME.test(name))
        return { ok: false, error: '技能名必须是 kebab-case（小写字母和数字，用 - 连接）' };
    const description = input.description.trim();
    if (description === '')
        return { ok: false, error: 'description 是必填的，模型目录靠它路由' };
    try {
        mkdirSync(input.root, { recursive: true });
    }
    catch (error) {
        return { ok: false, error: `无法创建目录 ${input.root}: ${String(error)}` };
    }
    const existing = skillFileFor(input.root, name);
    const target = existing ?? { path: join(input.root, name, 'SKILL.md'), kind: 'bundle' };
    if (target.kind === 'bundle') {
        try {
            mkdirSync(join(input.root, name), { recursive: true });
        }
        catch (error) {
            return { ok: false, error: `无法创建目录 ${join(input.root, name)}: ${String(error)}` };
        }
    }
    const meta = { name, description };
    if (input.whenToUse !== undefined && input.whenToUse.trim() !== '')
        meta.whenToUse = input.whenToUse;
    let front;
    try {
        front = dumpYaml(meta, { lineWidth: 120 }).trimEnd();
    }
    catch (error) {
        return { ok: false, error: `frontmatter 序列化失败: ${String(error)}` };
    }
    const body = input.body.replace(/^\s*\n/, '');
    const content = `---\n${front}\n---\n\n${body}${body === '' || body.endsWith('\n') ? '' : '\n'}`;
    try {
        writeFileSync(target.path, content, 'utf8');
    }
    catch (error) {
        return { ok: false, error: `写入失败: ${String(error)}` };
    }
    return { ok: true, value: { root: input.root, name, description, ...(input.whenToUse !== undefined && input.whenToUse.trim() !== '' ? { whenToUse: input.whenToUse } : {}), body } };
}
/** Delete one skill (bundle directory or flat file). */
export function deleteSkill(root, name) {
    if (!SKILL_NAME.test(name))
        return { ok: false, error: '技能名必须是 kebab-case' };
    const target = skillFileFor(root, name);
    if (target === undefined)
        return { ok: false, error: `未找到技能 "${name}"` };
    try {
        if (target.kind === 'bundle')
            rmSync(join(root, name), { recursive: true, force: true });
        else
            rmSync(target.path, { force: true });
    }
    catch (error) {
        return { ok: false, error: `删除失败: ${String(error)}` };
    }
    return { ok: true, value: { removed: true } };
}
//# sourceMappingURL=skills.js.map
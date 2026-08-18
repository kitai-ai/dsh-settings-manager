/**
 * Skills manager: lists, reads, writes, and deletes local skill files across
 * the standard skill roots (project `.dsh`/`.agents`, user `~/.dsh/skills`,
 * shared `~/.agents/skills`). The filesystem skill provider watches these
 * roots, so every mutation lands in the model-visible catalog automatically.
 *
 * @module
 */
export interface SkillRoot {
    key: string;
    label: string;
    path: string;
}
export interface SkillEntry {
    name: string;
    description: string;
    root: string;
    kind: 'bundle' | 'flat';
    path: string;
    updatedAt: number;
}
export interface SkillBody {
    root: string;
    name: string;
    description: string;
    whenToUse?: string;
    body: string;
}
export type SkillResult<T> = {
    ok: true;
    value: T;
} | {
    ok: false;
    error: string;
};
/** Resolve the standard skill roots in provider rank order (project before user). */
export declare function skillRoots(env?: NodeJS.ProcessEnv): SkillRoot[];
/** Nearest ancestor directory containing a `.git` entry, or undefined. */
export declare function nearestGitRoot(start: string): string | undefined;
/** List every skill across the standard roots, newest first within each root. */
export declare function listSkills(env?: NodeJS.ProcessEnv): {
    roots: SkillRoot[];
    skills: SkillEntry[];
};
/** Read one skill's full body and frontmatter fields. */
export declare function getSkillBody(root: string, name: string): SkillResult<SkillBody>;
export interface UpsertSkillInput {
    root: string;
    name: string;
    description: string;
    whenToUse?: string;
    body: string;
}
/** Create or overwrite one skill file (bundle form unless a flat file already exists). */
export declare function upsertSkill(input: UpsertSkillInput): SkillResult<SkillBody>;
/** Delete one skill (bundle directory or flat file). */
export declare function deleteSkill(root: string, name: string): SkillResult<{
    removed: boolean;
}>;

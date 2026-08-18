/** Skills settings section: browse, create, edit, and delete local skills. */

import { useCallback, useEffect, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import {
  deleteSkill, getSkillBody, listSkills, upsertSkill,
} from './http'
import type { SkillEntry, SkillRoot } from './http'

type T = (key: string) => string

const s: Record<string, CSSProperties> = {
  wrap: { display: 'flex', flexDirection: 'column', gap: '12px' },
  rootRow: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 },
  rootSelect: { padding: '6px 8px', borderRadius: 6, border: '1px solid rgba(128,128,128,0.4)', background: 'transparent', color: 'inherit', font: 'inherit', fontSize: 13, maxWidth: '60%' },
  row: { display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0', borderBottom: '1px solid rgba(128,128,128,0.25)' },
  name: { fontWeight: 600, minWidth: '150px' },
  desc: { color: 'inherit', opacity: 0.75, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12 },
  hint: { fontSize: 12, opacity: 0.7 },
  error: { color: '#f85149', fontSize: 13 },
  ok: { color: '#3fb950', fontSize: 13 },
  button: { padding: '6px 12px', borderRadius: 6, border: '1px solid rgba(128,128,128,0.4)', background: 'transparent', color: 'inherit', cursor: 'pointer', fontSize: 13 },
  buttonPrimary: { background: 'rgba(80,140,255,0.18)', borderColor: 'rgba(80,140,255,0.55)' },
  buttonDanger: { color: '#f85149', borderColor: 'rgba(248,81,73,0.5)' },
  field: { display: 'flex', flexDirection: 'column', gap: 4 },
  label: { fontSize: 12, opacity: 0.85 },
  input: { padding: '6px 8px', borderRadius: 6, border: '1px solid rgba(128,128,128,0.4)', background: 'transparent', color: 'inherit', font: 'inherit', fontSize: 13, width: '100%', boxSizing: 'border-box' } as CSSProperties,
  textarea: { padding: '6px 8px', borderRadius: 6, border: '1px solid rgba(128,128,128,0.4)', background: 'transparent', color: 'inherit', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 12, width: '100%', boxSizing: 'border-box', minHeight: 180, resize: 'vertical' } as CSSProperties,
  badge: { fontSize: 11, padding: '2px 8px', borderRadius: '999px', border: '1px solid rgba(128,128,128,0.4)', opacity: 0.8 },
  editor: { display: 'flex', flexDirection: 'column', gap: 10, border: '1px solid rgba(128,128,128,0.3)', borderRadius: 8, padding: 14, background: 'rgba(128,128,128,0.06)' },
  actions: { display: 'flex', gap: 8, justifyContent: 'flex-end' },
  empty: { fontSize: 13, opacity: 0.7, padding: '12px 0' },
}

interface EditorState {
  root: string
  name: string
  description: string
  whenToUse: string
  body: string
  originalName: string
}

function emptyEditor(defaultRoot: string): EditorState {
  return { root: defaultRoot, name: '', description: '', whenToUse: '', body: '', originalName: '' }
}

export function SkillsSection({ t }: { t: T }): ReactNode {
  const [roots, setRoots] = useState<SkillRoot[]>([])
  const [skills, setSkills] = useState<SkillEntry[] | null>(null)
  const [root, setRoot] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [editor, setEditor] = useState<EditorState | null>(null)

  const refresh = useCallback(async (): Promise<void> => {
    try {
      const data = await listSkills()
      setRoots(data.roots)
      setSkills(data.skills)
      setRoot((current) => current ?? data.roots.find((r) => r.key === 'user-dsh')?.path ?? data.roots[0]?.path ?? null)
      setError(null)
    } catch (e) {
      setError(String(e))
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const visible = (skills ?? []).filter((skill) => skill.root === root)

  const startCreate = (): void => {
    setEditor(emptyEditor(root ?? roots[0]?.path ?? ''))
  }

  const startEdit = async (skill: SkillEntry): Promise<void> => {
    try {
      const { skill: body } = await getSkillBody(skill.root, skill.name)
      setEditor({
        root: body.root,
        name: body.name,
        description: body.description,
        whenToUse: body.whenToUse ?? '',
        body: body.body,
        originalName: body.name,
      })
    } catch (e) {
      setError(String(e))
    }
  }

  const saveEditor = async (): Promise<void> => {
    if (editor === null) return
    setError(null)
    setNotice(null)
    try {
      await upsertSkill({
        root: editor.root,
        name: editor.name.trim(),
        description: editor.description.trim(),
        whenToUse: editor.whenToUse.trim() === '' ? undefined : editor.whenToUse,
        body: editor.body,
      })
      setEditor(null)
      setNotice(t('skillSaved'))
      await refresh()
    } catch (e) {
      setError(String(e))
    }
  }

  const remove = async (skill: SkillEntry): Promise<void> => {
    if (!window.confirm(`${t('confirmRemoveSkill')} ${skill.name}？`)) return
    try {
      await deleteSkill(skill.root, skill.name)
      setNotice(t('skillDeleted'))
      await refresh()
    } catch (e) {
      setError(String(e))
    }
  }

  return (
    <div style={s.wrap}>
      <div style={s.hint}>{t('skillsSubtitle')}</div>
      {error !== null && <div style={s.error}>{error}</div>}
      {notice !== null && <div style={s.ok}>{notice}</div>}
      {editor !== null && (
        <div style={s.editor}>
          <div style={s.field}>
            <label style={s.label}>{t('root')}</label>
            <select
              style={s.input}
              value={editor.root}
              onChange={(e) => setEditor({ ...editor, root: e.target.value })}
            >
              {roots.map((r) => <option key={r.key} value={r.path}>{r.label}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={s.field}>
              <label style={s.label}>{t('skillName')}</label>
              <input style={s.input} value={editor.name} onChange={(e) => setEditor({ ...editor, name: e.target.value })} placeholder={t('newSkillName')} />
            </div>
            <div style={s.field}>
              <label style={s.label}>{t('whenToUse')}</label>
              <input style={s.input} value={editor.whenToUse} onChange={(e) => setEditor({ ...editor, whenToUse: e.target.value })} />
            </div>
          </div>
          <div style={s.field}>
            <label style={s.label}>{t('description')}</label>
            <input style={s.input} value={editor.description} onChange={(e) => setEditor({ ...editor, description: e.target.value })} />
          </div>
          <div style={s.field}>
            <label style={s.label}>{t('content')}</label>
            <textarea style={s.textarea} value={editor.body} onChange={(e) => setEditor({ ...editor, body: e.target.value })} />
          </div>
          <div style={s.actions}>
            <button style={s.button} onClick={() => setEditor(null)}>{t('cancel')}</button>
            <button style={{ ...s.button, ...s.buttonPrimary }} onClick={() => void saveEditor()}>{t('save')}</button>
          </div>
        </div>
      )}
      {roots.length > 0 && (
        <div style={s.rootRow}>
          <span style={{ opacity: 0.7 }}>{t('currentRoot')}</span>
          <select style={s.rootSelect} value={root ?? ''} onChange={(e) => setRoot(e.target.value)}>
            {roots.map((r) => <option key={r.key} value={r.path}>{r.label}</option>)}
          </select>
        </div>
      )}
      {skills === null ? (
        <div style={s.empty}>…</div>
      ) : visible.length === 0 ? (
        <div style={s.empty}>{t('emptySkills')}</div>
      ) : (
        visible.map((skill) => (
          <div key={`${skill.root}/${skill.name}`} style={s.row}>
            <span style={s.name}>{skill.name}</span>
            <span style={s.badge}>{skill.kind}</span>
            <span style={s.desc}>{skill.description}</span>
            <button style={s.button} onClick={() => void startEdit(skill)}>{t('edit')}</button>
            <button style={{ ...s.button, ...s.buttonDanger }} onClick={() => void remove(skill)}>{t('delete')}</button>
          </div>
        ))
      )}
      {editor === null && (
        <div>
          <button style={{ ...s.button, ...s.buttonPrimary }} onClick={startCreate}>{t('createSkill')}</button>
        </div>
      )}
    </div>
  )
}

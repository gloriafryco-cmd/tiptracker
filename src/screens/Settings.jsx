import { useState } from 'react'
import { eraseAll, DEFAULT_SHIFT_TIMES, migrate, download, today } from '../store.js'
import TimeField from '../TimeField.jsx'
import { buildSteps, finishJob } from './Quiz.jsx'
import { Export, PaycheckLog, TimeOffList } from './History.jsx'

// SETTINGS: jobs (tap a card to edit it), redo the intake quiz, archive, and display options.
export default function Settings({ state, update, onRedo, onAddJob }) {
  const [openId, setOpenId] = useState(null)
  const setPref = (patch) => update((s) => { Object.assign(s.prefs, patch) })
  const setJob = (id, patch) => update((s) => { Object.assign(s.jobs.find((j) => j.id === id), patch) })

  return (
    <section>
      <h2>Settings</h2>

      <h3>My jobs</h3>
      <p className="hint">Tap a job to change anything on it. Use "Redo my job intake quiz" only if you want to answer every question again. Neither one deletes your past shifts.</p>
      <ul className="list">
        {state.jobs.map((j) => (
          <li key={j.id} className="stack">
            <button className="link job-head" onClick={() => setOpenId(openId === j.id ? null : j.id)}>
              <strong>{j.name}{j.archived ? ' (archived)' : ''}</strong>
              <span className="hint">{j.roles.map((r) => r.name).join(', ')} · {openId === j.id ? 'close' : 'tap to edit'}</span>
            </button>
            {openId === j.id && (
              <JobEditor
                key={j.id}
                job={j}
                state={state}
                onSave={(job) => {
                  update((s) => { s.jobs[s.jobs.findIndex((x) => x.id === job.id)] = job })
                  setOpenId(null)
                }}
              />
            )}
            <div className="row-actions">
              <button className="link" onClick={() => onRedo(j.id)}>Redo my job intake quiz</button>
              <button className="link" onClick={() => setJob(j.id, { archived: !j.archived })}>
                {j.archived ? 'Bring back' : 'Archive'}
              </button>
            </div>
          </li>
        ))}
      </ul>
      <button className="primary" onClick={onAddJob}>Add a job</button>
      <p className="hint">Changes apply from today. Past shifts keep what they were saved with. Jobs are archived, never deleted.</p>

      {/* MOVED HERE FOR NOW: until we find a better spot */}
      <h3>Shifts and pay</h3>
      <Export state={state} />
      <PaycheckLog state={state} update={update} />
      <TimeOffList state={state} update={update} />

      <h3>Display</h3>
      <label className="field">
        <span>Theme</span>
        <select value={state.prefs.theme} onChange={(e) => setPref({ theme: e.target.value })}>
          <option value="auto">Match my device</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </label>

      <h3>My data</h3>
      <p className="hint">Everything is saved in this browser on this computer only.</p>
      <Backup state={state} update={update} />
      <button
        className="ghost danger"
        onClick={() => {
          if (confirm('Erase ALL jobs, shifts and regulars? This can\'t be undone.')) {
            eraseAll()
            location.reload()
          }
        }}
      >
        Erase all my data
      </button>
    </section>
  )
}

// JOB EDITOR: every quiz question on one page, plus shift type hours and the auto-gratuity line.
function JobEditor({ job, state, onSave }) {
  const [draft, setDraft] = useState(() => structuredClone(job))
  const [newRole, setNewRole] = useState('')
  const set = (patch) => setDraft((d) => ({ ...d, ...patch }))
  const steps = buildSteps({ draft, set, state, existing: job, newRole, setNewRole })
  const times = draft.shiftTimes || DEFAULT_SHIFT_TIMES
  const setTime = (t, patch) => set({ shiftTimes: { ...times, [t]: { ...times[t], ...patch } } })

  return (
    <div className="editor">
      {steps.map((st) => (
        <div key={st.title}>
          <h3>{st.title}</h3>
          {st.body}
        </div>
      ))}

      <h3>Shift type hours</h3>
      <p className="hint">Tapping a shift type on Quick Add fills in these hours. You can still change them on any shift.</p>
      {Object.keys(DEFAULT_SHIFT_TIMES).map((t) => (
        <div key={t}>
          <strong>{t}</strong>
          <div className="grid2">
            <TimeField label="Start" value={times[t].start} onChange={(v) => v && setTime(t, { start: v })} />
            <TimeField label="End" value={times[t].end} onChange={(v) => v && setTime(t, { end: v })} />
          </div>
        </div>
      ))}

      <label className="switch">
        <input type="checkbox" checked={!!draft.trackAutoGrat} onChange={(e) => set({ trackAutoGrat: e.target.checked })} />
        <span>Show an auto-gratuity line when logging shifts</span>
      </label>

      <button className="primary" onClick={() => onSave(finishJob(draft))}>Save changes to this job</button>
    </div>
  )
}

// BACKUP: download everything in the app as one file, and upload it again later.
// Includes jobs, shifts, tags, regulars, paychecks, time off, settings and feedback.
function Backup({ state, update }) {
  const [msg, setMsg] = useState('')

  const save = () => {
    const file = { app: 'tip-tracker', version: 1, savedAt: new Date().toISOString(), data: state }
    download(`tip-tracker-backup-${today()}.json`, JSON.stringify(file, null, 2), 'application/json')
    setMsg('Backup downloaded. Move the file into your My Claude folder so it is easy to find.')
  }

  const load = async (e) => {
    const f = e.target.files[0]
    e.target.value = ''
    if (!f) return
    try {
      const parsed = JSON.parse(await f.text())
      const data = parsed.data || parsed
      if (!Array.isArray(data.jobs) || !Array.isArray(data.shifts)) throw new Error('not a backup')
      const n = `${data.jobs.length} job(s), ${data.shifts.length} shift(s), ${(data.regulars || []).length} regular(s)`
      if (!confirm(`Replace everything in the app with this backup (${n})? What is in the app right now will be replaced.`)) return
      const clean = migrate(data)
      update((s) => {
        Object.keys(s).forEach((k) => delete s[k])
        Object.assign(s, clean)
      })
      setMsg(`Backup loaded: ${n}.`)
    } catch {
      setMsg('That file is not a Tip Tracker backup, so nothing was changed.')
    }
  }

  return (
    <div className="card">
      <div className="actions small">
        <button className="primary" onClick={save}>Download backup</button>
        <label className="upload">
          Upload backup
          <input type="file" accept=".json,application/json" onChange={load} hidden />
        </label>
      </div>
      <p className="hint">The backup holds everything: jobs, shifts, tags, regulars, paychecks, time off and settings. Download one before each app update, then upload it if anything looks missing.</p>
      {msg && <p><strong>{msg}</strong></p>}
    </div>
  )
}

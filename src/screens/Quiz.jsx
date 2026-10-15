import { useState } from 'react'
import Icon from '../Icon.jsx'
import { newJob, uid, WEEKDAYS } from '../store.js'

// INTAKE QUIZ: asks about one job, one question per screen.
// Runs for a new job, and again from Settings ("Redo my job intake quiz")
// with the current answers filled in. Redoing it never deletes past shifts.
// The same questions (buildSteps) also power the job editor in Settings.

const SPLIT_CHOICES = [
  ['pool', 'I am in a tip pool'],
  ['own', 'I keep all my own tips'],
  ['other', 'Other'],
]

const PAY_CHOICES = [
  ['weekly', 'Weekly'],
  ['biweekly', 'Every 2 weeks'],
  ['semimonthly', 'Twice a month (1st to 15th, 16th to end of month)'],
  ['monthly', 'Monthly'],
]

const QUICK_ROLES = ['Server', 'Bartender']
const TIPOUT_QUICK = ['Busser', 'Bar', 'Host', 'Runner']
const TIPOUT_METHODS = [
  ['tips', '% of my tips'],
  ['sales', '% of my sales'],
  ['flat', 'Flat $ per shift'],
]

// STEPS: each has a title, the settings it covers (for "Not sure, use the default"), and its form.
export function buildSteps({ draft, set, state, existing, newRole, setNewRole }) {
  const others = state.jobs.filter((j) => j.id !== draft.id)

  const toggleRole = (name) => {
    const has = draft.roles.find((r) => r.name === name)
    set({
      roles: has
        ? draft.roles.filter((r) => r.name !== name)
        : [...draft.roles, { id: uid(), name, wage: 0 }],
    })
  }
  const addRole = () => {
    const name = newRole.trim()
    if (!name || draft.roles.some((r) => r.name.toLowerCase() === name.toLowerCase())) return
    set({ roles: [...draft.roles, { id: uid(), name, wage: 0 }] })
    setNewRole('')
  }

  return [
    {
      title: 'What is this job called, and which roles do you work here?',
      keys: ['roles'],
      body: (
        <>
          {!existing && others.length > 0 && (
            <label className="field">
              <span>Copy settings from another job (optional)</span>
              <select
                defaultValue=""
                onChange={(e) => {
                  const src = state.jobs.find((j) => j.id === e.target.value)
                  if (src) {
                    set({
                      ...structuredClone(src),
                      id: draft.id,
                      name: draft.name,
                      archived: false,
                      roles: src.roles.map((r) => ({ ...r, id: uid() })),
                    })
                  }
                }}
              >
                <option value="">Start fresh</option>
                {others.map((j) => (
                  <option key={j.id} value={j.id}>{j.name}</option>
                ))}
              </select>
            </label>
          )}
          <label className="field">
            <span>Restaurant or job name</span>
            <input value={draft.name} placeholder="e.g. The Anchor" onChange={(e) => set({ name: e.target.value })} />
          </label>
          <div className="field">
            <span>Roles (pick all you work)</span>
            <div className="chips">
              {QUICK_ROLES.map((name) => (
                <button
                  key={name}
                  className={draft.roles.some((r) => r.name === name) ? 'chip on' : 'chip'}
                  onClick={() => toggleRole(name)}
                >
                  {name}
                </button>
              ))}
              {draft.roles
                .filter((r) => !QUICK_ROLES.includes(r.name))
                .map((r) => (
                  <button key={r.id} className="chip on" onClick={() => toggleRole(r.name)}>
                    {r.name} <Icon name="X" label="Remove" />
                  </button>
                ))}
            </div>
            <div className="row">
              <input
                value={newRole}
                placeholder="Other role (Manager, Host, Barback...)"
                onChange={(e) => setNewRole(e.target.value)}
              />
              <button onClick={addRole}>Add</button>
            </div>
          </div>
        </>
      ),
    },
    {
      title: 'What is your hourly wage for each role?',
      keys: [],
      body: (
        <>
          <p className="hint">Hourly wage is optional. It is the hourly wage your employer pays, not tips. Leave a role at 0 if you don't want to track it.</p>
          {draft.roles.length === 0 && <p className="hint">Go back and pick at least one role.</p>}
          {draft.roles.map((r, i) => (
            <label className="field" key={r.id}>
              <span>{r.name} hourly wage ($)</span>
              <input
                type="number" inputMode="decimal" min="0" step="0.01"
                value={r.wage}
                onChange={(e) => {
                  const roles = [...draft.roles]
                  roles[i] = { ...r, wage: e.target.value }
                  set({ roles })
                }}
              />
            </label>
          ))}
        </>
      ),
    },
    {
      title: 'How do you want to enter hours?',
      keys: ['hoursFormat'],
      body: (
        <Choice
          value={draft.hoursFormat}
          onChange={(v) => set({ hoursFormat: v })}
          options={[
            ['decimal', 'As a number, like 6.5'],
            ['hm', 'As hours and minutes, like 6 h 30 m'],
          ]}
        />
      ),
    },
    {
      // ONE PAY SECTION: week start, hourly wage schedule and tips schedule use the same choices.
      title: 'When does your week start, and how are you paid?',
      keys: [
        'weekStart', 'wageSchedule', 'wageStartDate', 'wageLagDays',
        'tipsRule', 'cardTipsRule', 'cardTipsWeekday', 'cardTipsStartDate',
      ],
      body: (
        <>
          <label className="field">
            <span>My work week starts on</span>
            <select value={draft.weekStart} onChange={(e) => set({ weekStart: Number(e.target.value) })}>
              {WEEKDAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
            </select>
          </label>

          <h3>How do you get your tips?</h3>
          <Choice
            value={draft.tipsRule}
            onChange={(v) => set({ tipsRule: v })}
            options={[
              ['cash', 'I receive cash at the end of the night for all my credit card tips'],
              ['paycheck', 'My tips are paid on a schedule'],
            ]}
          />
          {draft.tipsRule === 'paycheck' && (
            <>
              <h3>How often are your tips paid?</h3>
              <Choice
                value={draft.cardTipsRule}
                onChange={(v) => set({ cardTipsRule: v })}
                options={[...PAY_CHOICES, ['withPaycheck', 'With my hourly wage check for that pay period']]}
              />
              {draft.cardTipsRule === 'weekly' && (
                <label className="field">
                  <span>Which weekday are they paid?</span>
                  <select value={draft.cardTipsWeekday} onChange={(e) => set({ cardTipsWeekday: Number(e.target.value) })}>
                    {WEEKDAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
                  </select>
                </label>
              )}
              {draft.cardTipsRule === 'biweekly' && (
                <label className="field">
                  <span>First day of any tips pay period</span>
                  <input type="date" value={draft.cardTipsStartDate} onChange={(e) => set({ cardTipsStartDate: e.target.value })} />
                </label>
              )}
            </>
          )}

          <h3>How often is your <u>hourly wage</u> paid? (optional)</h3>
          <p className="hint">Hourly wage is optional. Skip this if you only want to track tips.</p>
          <Choice value={draft.wageSchedule} onChange={(v) => set({ wageSchedule: v })} options={PAY_CHOICES} />
          {draft.wageSchedule === 'biweekly' && (
            <label className="field">
              <span>First day of any hourly wage pay period</span>
              <input type="date" value={draft.wageStartDate} onChange={(e) => set({ wageStartDate: e.target.value })} />
            </label>
          )}
          <label className="field">
            <span>The hourly wage check arrives this many days after the pay period ends (optional)</span>
            <input type="number" min="0" inputMode="numeric" value={draft.wageLagDays} onChange={(e) => set({ wageLagDays: e.target.value })} />
          </label>
        </>
      ),
    },
    {
      title: 'How are tips split at this job?',
      keys: ['tipSplit'],
      body: <Choice value={draft.tipSplit} onChange={(v) => set({ tipSplit: v })} options={SPLIT_CHOICES} />,
    },
    {
      title: 'Who do you tip out? (optional)',
      keys: ['tipOuts'],
      body: (
        <>
          <p className="hint">Add the people or roles you tip out at this job and how. This is saved for the tip-out calculator in the Toolbox. Skip it if you don't tip out.</p>
          <div className="chips">
            {TIPOUT_QUICK.map((name) => (
              <button
                key={name}
                className={(draft.tipOuts || []).some((t) => t.name === name) ? 'chip on' : 'chip'}
                onClick={() => {
                  const list = draft.tipOuts || []
                  set({ tipOuts: list.some((t) => t.name === name)
                    ? list.filter((t) => t.name !== name)
                    : [...list, { id: uid(), name, method: 'tips', amount: '' }] })
                }}
              >
                {name}
              </button>
            ))}
          </div>
          <div className="row">
            <input
              placeholder="Someone else (Barback, Expo...)"
              onKeyDown={(e) => {
                const name = e.target.value.trim()
                if (e.key === 'Enter') e.preventDefault() // this box has its own Enter, see App.jsx
                if (e.key === 'Enter' && name) {
                  set({ tipOuts: [...(draft.tipOuts || []), { id: uid(), name, method: 'tips', amount: '' }] })
                  e.target.value = ''
                }
              }}
            />
          </div>
          <p className="hint">Type a name and press Enter to add them.</p>
          {(draft.tipOuts || []).map((t, i) => {
            const change = (patch) => {
              const list = [...draft.tipOuts]
              list[i] = { ...t, ...patch }
              set({ tipOuts: list })
            }
            return (
              <div className="idea" key={t.id}>
                <div className="row-between">
                  <strong>{t.name}</strong>
                  <button className="link danger" onClick={() => set({ tipOuts: draft.tipOuts.filter((x) => x.id !== t.id) })}>Remove</button>
                </div>
                <div className="grid2">
                  <label className="field"><span>How</span>
                    <select value={t.method} onChange={(e) => change({ method: e.target.value })}>
                      {TIPOUT_METHODS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select></label>
                  <label className="field"><span>{t.method === 'flat' ? 'Amount ($)' : 'Percent (%)'}</span>
                    <input type="number" inputMode="decimal" min="0" step="0.1" value={t.amount} onChange={(e) => change({ amount: e.target.value })} /></label>
                </div>
              </div>
            )
          })}
        </>
      ),
    },
    {
      title: 'What is your weekly tip goal?',
      keys: ['weeklyGoal', 'nudge'],
      body: (
        <>
          <label className="field">
            <span>My weekly tip goal ($)</span>
            <input type="number" inputMode="decimal" min="0" value={draft.weeklyGoal} onChange={(e) => set({ weeklyGoal: e.target.value })} />
          </label>
          <label className="switch">
            <input type="checkbox" checked={draft.nudge} onChange={(e) => set({ nudge: e.target.checked })} />
            <span>Nudge me to pick up a shift near the end of the week</span>
          </label>
        </>
      ),
    },
  ]
}

// CLEAN UP a job before saving it
export function finishJob(d) {
  const defaults = newJob()
  const job = { ...d, name: d.name.trim() || 'My job', setupDone: true }
  job.roles = job.roles.length ? job.roles : defaults.roles
  job.roles = job.roles.map((r) => ({ ...r, wage: Number(r.wage) || 0 }))
  job.weeklyGoal = Number(job.weeklyGoal) || 0
  job.tipOuts = (job.tipOuts || []).map((t) => ({ ...t, amount: Number(t.amount) || 0 }))
  job.wageLagDays = Number(job.wageLagDays) || 0
  return job
}

export default function Quiz({ state, jobId, onSave, onCancel }) {
  const existing = state.jobs.find((j) => j.id === jobId)
  const [draft, setDraft] = useState(() => (existing ? structuredClone(existing) : newJob('')))
  const [step, setStep] = useState(0)
  const [newRole, setNewRole] = useState('')
  const set = (patch) => setDraft((d) => ({ ...d, ...patch }))
  const defaults = newJob()

  const steps = buildSteps({ draft, set, state, existing, newRole, setNewRole })
  const s = steps[step]
  const last = step === steps.length - 1

  const next = (d = draft) => (last ? onSave(finishJob(d)) : setStep(step + 1))

  const useDefault = () => {
    const patch = {}
    for (const k of s.keys) patch[k] = structuredClone(defaults[k])
    const d = { ...draft, ...patch }
    setDraft(d)
    next(d)
  }

  return (
    <section className="quiz">
      <p className="step-count">
        {existing ? 'Redo my job intake quiz' : 'Set up a job'} · Question {step + 1} of {steps.length}
      </p>
      {existing && step === 0 && (
        <p className="hint">Redoing the quiz never deletes your past shifts. Changes apply from today.</p>
      )}
      <h2>{s.title}</h2>
      {s.body}
      <div className="actions">
        <button className="primary" onClick={() => next()}>{last ? 'Save job' : 'Next'}</button>
        <button className="ghost" onClick={useDefault}>Not sure, use the default</button>
      </div>
      <div className="actions small">
        {step > 0 && <button className="ghost" onClick={() => setStep(step - 1)}>Back</button>}
        <button className="ghost" onClick={onCancel}>Cancel</button>
      </div>
    </section>
  )
}

// One-pick list of choices
export function Choice({ value, onChange, options }) {
  return (
    <div className="choices">
      {options.map(([v, label]) => (
        <button key={v} className={value === v ? 'choice on' : 'choice'} onClick={() => onChange(v)}>
          {label}
        </button>
      ))}
    </div>
  )
}

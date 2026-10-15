import { useState } from 'react'
import {
  uid, today, num, money, prettyDate, hoursFromTimes, fmtHours,
  shiftTips, tipsPerHour, perHourWithWage, SHIFT_TYPES, DEFAULT_SHIFT_TIMES, tagList,
} from '../store.js'
import TimeField from '../TimeField.jsx'
import { parseShiftDump } from '../braindump.js'
import { Money, TagBox, Totals } from './fields.jsx'
import { BrainDumpModal, TipSortModal, ClarifyModal, TotalsModal, DoYouWantToAdd } from './BrainDump.jsx'

// QUICK ADD: opens with the brain dump pop-up. "Enter manually" (and Edit) use the three screens.
// 1 = How much did I make? (needed)  2 = How much did I sell?  3 = Shift vibes

const WEATHER = ['Sunny', 'Cloudy', 'Rainy', 'Snowy', 'Hot', 'Cold']
export const OFF_TYPES = ['Day off', 'Sick', 'Vacation', 'Call out', 'Other']

function blankShift(state) {
  const jobs = state.jobs.filter((j) => !j.archived)
  const job = jobs.find((j) => j.id === state.last.jobId) || jobs[0]
  const role = job?.roles.find((r) => r.id === state.last.roleId) || job?.roles[0]
  return {
    id: null,
    date: today(),
    jobId: job?.id,
    roleId: role?.id,
    cash: '', card: '', autoGrat: '', general: '',
    hours: '', hh: '', mm: '', useTimes: false, start: '', end: '',
    useWage: !!state.last.useWage,
    sales: '', covers: '', tipOut: '',
    shiftType: [], weather: '', events: [], section: [],
    regularsSeen: [], newRegulars: [], vibe: 0, note: '',
  }
}

// HOURS: typed as 6.5, as hours + minutes, or worked out from start/end times
function calcHours(form, job) {
  if (form.useTimes) return hoursFromTimes(form.start, form.end)
  return job?.hoursFormat === 'hm' ? num(form.hh) + num(form.mm) / 60 : num(form.hours)
}

export default function QuickAdd({ state, update, editId, onSaved, onCancel, onSetup }) {
  const editing = editId ? state.shifts.find((s) => s.id === editId) : null
  const [f, setF] = useState(() => {
    if (!editing) return blankShift(state)
    const h = num(editing.hours)
    return {
      ...blankShift(state), ...editing,
      events: tagList(editing.events), section: tagList(editing.section),
      hh: Math.floor(h), mm: Math.round((h - Math.floor(h)) * 60),
    }
  })
  const [page, setPage] = useState(1)
  const [offOpen, setOffOpen] = useState(false)
  const [offMsg, setOffMsg] = useState('')
  const [newRegular, setNewRegular] = useState('')
  const [newEvent, setNewEvent] = useState('')
  const [mode, setMode] = useState(editId ? 'review' : 'dump') // 'dump' | 'ask' | 'totals' | 'review' | 'manual'
  const [dumped, setDumped] = useState(null) // { base, found, guessedTimes } after a brain dump
  const [newSection, setNewSection] = useState('')
  const [error, setError] = useState('')
  const set = (patch) => setF((x) => ({ ...x, ...patch }))

  const jobs = state.jobs.filter((j) => !j.archived || j.id === f.jobId)
  const job = state.jobs.find((j) => j.id === f.jobId) || jobs[0]
  const role = job?.roles.find((r) => r.id === f.roleId) || job?.roles[0]

  const hours = calcHours(f, job)

  // Editing an old shift keeps the hourly wage it was saved with.
  const wage = editing && editing.roleId === role?.id ? num(editing.wage) : num(role?.wage)
  const preview = { ...f, hours, wage }
  const total = shiftTips(preview)

  // SAVE SHIFT: used by Submit, Save and "Skip these for now"
  const saveShift = (form) => {
    if (!job) return
    const h = calcHours(form, job)
    if (!(h > 0)) {
      setPage(1)
      setError('Add your hours so the app can work out tips per hour.')
      return
    }
    // New regulars named in a brain dump ("saw Roger") are added to Regulars now.
    const seen = [...form.regularsSeen]
    const newRegs = []
    for (const name of form.newRegulars || []) {
      const ex = state.regulars.find((r) => r.name.toLowerCase() === name.toLowerCase())
      if (ex) { if (!seen.includes(ex.id)) seen.push(ex.id) } else {
        const reg = { id: uid(), name, order: '', table: '', details: '' }
        newRegs.push(reg); seen.push(reg.id)
      }
    }
    const id = form.id || uid()
    const shift = {
      id,
      date: form.date,
      jobId: job.id,
      roleId: role?.id,
      roleName: role?.name || '',
      cash: num(form.cash), card: num(form.card), autoGrat: num(form.autoGrat), general: num(form.general),
      hours: h,
      useTimes: form.useTimes, start: form.start, end: form.end,
      useWage: form.useWage,
      wage, // hourly wage saved with the shift, so later wage changes don't rewrite the past
      sales: form.sales === '' ? '' : num(form.sales),
      salesType: job.salesType,
      covers: form.covers === '' ? '' : num(form.covers),
      tipOut: form.tipOut === '' ? '' : num(form.tipOut),
      shiftType: form.shiftType, weather: form.weather, events: form.events, section: form.section,
      regularsSeen: seen, vibe: form.vibe, note: form.note,
    }
    update((s) => {
      s.regulars.push(...newRegs)
      const i = s.shifts.findIndex((x) => x.id === id)
      if (i >= 0) s.shifts[i] = shift
      else s.shifts.push(shift)
      s.last = { jobId: job.id, roleId: role?.id, useWage: form.useWage }
    })
    onSaved(id)
  }
  const submit = () => saveShift(f)

  // BRAIN DUMP: fill the form from one sentence, then show "Do you want to add?"
  const fillFromDump = (text) => {
    const r = parseShiftDump(text, state, job)
    if (!r.found.length && r.unsorted == null && !r.unknown.length) return false
    setF({ ...f, ...r.patch })
    // QUESTIONS: one pop-up for each unclear thing, in this order
    const questions = [
      r.unsorted != null && { type: 'tips', amount: r.unsorted },
      r.ampm && { type: 'ampm', ...r.ampm },
      ...r.unknown.map((u) => ({ type: 'number', ...u })),
    ].filter(Boolean)
    setDumped({ found: r.found, guessedTimes: r.guessedTimes, questions })
    setError('')
    setMode(questions.length ? 'ask' : 'totals')
    return true
  }
  // "Yes, add more info": remember the brain dump as it is now, for "Skip these for now"
  const openReview = () => { setDumped((d) => ({ ...d, base: f })); setError(''); setMode('review') }
  // SKIP THESE FOR NOW: saves only the brain dump, plus hours, date and job from the check box.
  const skipExtras = () => saveShift({
    ...dumped.base,
    hours: f.hours, hh: f.hh, mm: f.mm, useTimes: f.useTimes, start: f.start, end: f.end,
    date: f.date, jobId: f.jobId, roleId: f.roleId,
  })

  // DAY OFF BUTTON
  const markOff = (type) => {
    update((s) => {
      s.timeOff.push({ id: uid(), jobId: job.id, start: f.date, end: f.date, type })
    })
    onCancel() // back to the Home screen
  }

  // SHIFT TYPE: tapping a type with set hours (Lunch, Dinner...) fills in start and end times.
  // Times come from the establishment's settings and stay editable.
  const pickType = (t) => {
    const on = f.shiftType.includes(t)
    const times = (job.shiftTimes || DEFAULT_SHIFT_TIMES)[t]
    if (on) return set({ shiftType: f.shiftType.filter((x) => x !== t) })
    set(times
      ? { shiftType: [...f.shiftType, t], useTimes: true, start: times.start, end: times.end }
      : { shiftType: [...f.shiftType, t] })
  }

  // TAGS: type an event or section and press Enter or Add to make it a tag.
  // Tags you typed once are saved, so you can tap them on later shifts.
  const savedTags = (key) => [...new Set([
    ...((state.tags && state.tags[key]) || []),
    ...state.shifts.flatMap((x) => tagList(x[key])),
  ])]
  const addTag = (key, value, clear) => {
    const v = value.trim()
    if (v && !f[key].includes(v)) {
      set({ [key]: [...f[key], v] })
      update((st) => {
        st.tags = st.tags || { events: [], section: [] }
        st.tags[key] = st.tags[key] || []
        if (!st.tags[key].includes(v)) st.tags[key].push(v)
      })
    }
    clear('')
  }

  const toggleIn = (list, v) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v])

  const addRegular = (typed = newRegular) => {
    const name = typed.trim()
    if (!name) return
    const id = uid()
    update((s) => { s.regulars.push({ id, name, order: '', table: '', details: '' }) })
    set({ regularsSeen: [...f.regularsSeen, id] })
    setNewRegular('')
  }

  if (!job) return null

  if (mode === 'dump') {
    return <BrainDumpModal onFill={fillFromDump} onManual={() => setMode('manual')} onCancel={onCancel} jobs={jobs} job={job} role={role} set={set} />
  }
  if (mode === 'ask') {
    const [q, ...rest] = dumped.questions
    const answer = (patch) => {
      set(patch)
      setDumped((d) => ({ ...d, questions: rest }))
      if (!rest.length) setMode('totals')
    }
    if (q.type === 'tips') return <TipSortModal key={rest.length} amount={q.amount} onDone={answer} />
    return <ClarifyModal key={rest.length} q={q} job={job} onAnswer={answer} />
  }
  if (mode === 'totals') {
    return (
      <TotalsModal f={f} set={set} hours={hours} wage={wage} role={role} job={job} error={error}
        onMore={openReview} onSubmit={submit} />
    )
  }
  if (mode === 'review') {
    const ctx = { state, job, role, jobs, f, set, hours, savedTags, addTag, addRegular, pickType, toggleIn, error, wage }
    return (
      <DoYouWantToAdd ctx={ctx} base={dumped?.base} guessedTimes={dumped?.guessedTimes} editing={!!editing}
        onSave={submit} onSkip={skipExtras} onCancel={onCancel} onManual={() => { setError(''); setMode('manual') }} />
    )
  }

  return (
    <section className="quick-add">
      {!editing && !job.setupDone && (
        <div className="banner">
          Finish setting up {job.name} so the app matches how your job works.{' '}
          <button className="link" onClick={() => onSetup(job.id)}>Finish setup</button>
        </div>
      )}

      {!editing && page === 1 && (
        <div className="off-row">
          <button className="ghost" onClick={() => setOffOpen(!offOpen)}>I had the day off</button>
          {offOpen && (
            <div className="chips">
              {OFF_TYPES.map((t) => <button key={t} className="chip" onClick={() => markOff(t)}>{t}</button>)}
            </div>
          )}
          {offMsg && <p className="hint">{offMsg}</p>}
        </div>
      )}

      <div className="pager">
        {[1, 2, 3].map((n) => (
          <button key={n} className={page === n ? 'dot on' : 'dot'} onClick={() => setPage(n)} aria-label={`Screen ${n}`} />
        ))}
      </div>

      {/* QUICK ADD SCREEN 1: How much did I make? */}
      {page === 1 && (
        <>
          <h2>{editing ? 'Edit shift' : 'How much did I make?'}</h2>
          <div className="grid2">
            <label className="field">
              <span>Establishment</span>
              <select
                value={job.id}
                onChange={(e) => {
                  const j = state.jobs.find((x) => x.id === e.target.value)
                  set({ jobId: j.id, roleId: j.roles[0]?.id })
                }}
              >
                {jobs.map((j) => <option key={j.id} value={j.id}>{j.name}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Position</span>
              <select value={role?.id} onChange={(e) => set({ roleId: e.target.value })}>
                {job.roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </label>
          </div>
          <label className="field">
            <span>Shift date</span>
            <input type="date" value={f.date} onChange={(e) => set({ date: e.target.value })} />
          </label>
          <div className="field">
            <span>Shift type (fills in your hours, you can still change them)</span>
            <div className="chips">
              {SHIFT_TYPES.map((t) => (
                <button key={t} className={f.shiftType.includes(t) ? 'chip on' : 'chip'} onClick={() => pickType(t)}>{t}</button>
              ))}
            </div>
          </div>
          <div className="grid2">
            <Money label="Card tips" value={f.card} onChange={(v) => set({ card: v })} />
            <Money label="Cash tips" value={f.cash} onChange={(v) => set({ cash: v })} />
          </div>
          {job.trackAutoGrat && (
            <Money label="Auto-gratuity (counts as tips)" value={f.autoGrat} onChange={(v) => set({ autoGrat: v })} />
          )}
          <p className="hint">Enter tips after tip-outs.</p>

          {f.useTimes ? (
            <div className="grid2">
              <TimeField label="Start time" value={f.start} onChange={(v) => set({ start: v })} />
              <TimeField label="End time" value={f.end} onChange={(v) => set({ end: v })} />
            </div>
          ) : job.hoursFormat === 'hm' ? (
            <div className="grid2">
              <label className="field"><span>Hours</span>
                <input type="number" inputMode="numeric" min="0" value={f.hh} onChange={(e) => set({ hh: e.target.value })} /></label>
              <label className="field"><span>Minutes</span>
                <input type="number" inputMode="numeric" min="0" max="59" value={f.mm} onChange={(e) => set({ mm: e.target.value })} /></label>
            </div>
          ) : (
            <label className="field"><span>Hours worked</span>
              <input type="number" inputMode="decimal" min="0" step="0.25" placeholder="6.5" value={f.hours} onChange={(e) => set({ hours: e.target.value })} /></label>
          )}
          <button className="link" onClick={() => set({ useTimes: !f.useTimes })}>
            {f.useTimes ? 'I\'ll type in my total hours' : 'Enter start and end time to calculate my hours'}
          </button>
          {f.useTimes && hours > 0 && <p className="hint">That's {fmtHours(hours, job.hoursFormat)}.</p>}

          <Totals f={f} set={set} hours={hours} wage={wage} role={role} />
          {error && <p className="error">{error}</p>}
        </>
      )}

      {/* QUICK ADD SCREEN 2: How much did I sell? */}
      {page === 2 && (
        <>
          <h2>How much did I sell?</h2>
          <p className="hint">Optional. Fill in what you want to track.</p>
          <Money label="Shift sales" value={f.sales} onChange={(v) => set({ sales: v })} />
          <label className="field"><span>Covers (guests served)</span>
            <input type="number" inputMode="numeric" min="0" value={f.covers} onChange={(e) => set({ covers: e.target.value })} /></label>
          <Money label="Amount I tipped out" value={f.tipOut} onChange={(v) => set({ tipOut: v })} />
          <p className="hint">For your records only. It doesn't change your tips.</p>
        </>
      )}

      {/* QUICK ADD SCREEN 3: Shift vibes */}
      {page === 3 && (
        <>
          <h2>Shift vibes</h2>
          <p className="hint">Optional. Helps you spot what makes a good shift.</p>
          <div className="field">
            <span>Weather</span>
            <div className="chips">
              {WEATHER.map((w) => (
                <button key={w} className={f.weather === w ? 'chip on' : 'chip'} onClick={() => set({ weather: f.weather === w ? '' : w })}>{w}</button>
              ))}
            </div>
          </div>
          <TagBox
            label="Events (trivia, bingo, the game...)"
            tags={f.events}
            suggestions={savedTags('events')}
            value={newEvent}
            setValue={setNewEvent}
            onAdd={(v) => addTag('events', v, setNewEvent)}
            onRemove={(t) => set({ events: f.events.filter((x) => x !== t) })}
          />
          <TagBox
            label="Section or station"
            tags={f.section}
            suggestions={savedTags('section')}
            value={newSection}
            setValue={setNewSection}
            onAdd={(v) => addTag('section', v, setNewSection)}
            onRemove={(t) => set({ section: f.section.filter((x) => x !== t) })}
          />
          <div className="field">
            <span>Regulars I saw</span>
            <div className="chips">
              {state.regulars.map((r) => (
                <button key={r.id} className={f.regularsSeen.includes(r.id) ? 'chip on' : 'chip'} onClick={() => set({ regularsSeen: toggleIn(f.regularsSeen, r.id) })}>{r.name}</button>
              ))}
            </div>
            <div className="row">
              <input value={newRegular} placeholder="New regular's name" onChange={(e) => setNewRegular(e.target.value)} />
              <button onClick={() => addRegular()}>Add</button>
            </div>
          </div>
          <div className="field">
            <span>Shift vibe</span>
            <div className="chips">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} className={f.vibe === n ? 'chip on' : 'chip'} onClick={() => set({ vibe: f.vibe === n ? 0 : n })}>{n}</button>
              ))}
            </div>
          </div>
          <label className="field"><span>Notes</span>
            <textarea rows="2" value={f.note} onChange={(e) => set({ note: e.target.value })} /></label>
        </>
      )}

      <div className="actions">
        {page === 1 && <button className="primary big" onClick={() => setPage(2)}>Next: How much did I sell?</button>}
        {page === 2 && <button className="primary big" onClick={() => setPage(3)}>Next: Shift vibes</button>}
        <button className={page === 3 ? 'primary big' : 'ghost'} onClick={submit}>{editing ? 'Save changes' : 'Submit'}</button>
        {page > 1 && <button className="ghost" onClick={() => setPage(page - 1)}>Back</button>}
        {editing && <button className="ghost" onClick={onCancel}>Cancel</button>}
      </div>
    </section>
  )
}


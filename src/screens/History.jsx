import { useState } from 'react'
import Icon from '../Icon.jsx'
import Calendar from './Calendar.jsx'
import ShiftCard from './ShiftCard.jsx'
import { OFF_TYPES } from './QuickAdd.jsx'
import {
  uid, money, num, today, prettyDate, addDays, weekRange, inRange, fmtHours,
  shiftTips, tipsPerHour, paycheckPeriod, toCSV, download, tagList,
} from '../store.js'

// TAG FILTER: does this shift have the tag? kind = regular | section | events | weather | vibe
const hasTag = (s, f) =>
  f.kind === 'regular' ? (s.regularsSeen || []).includes(f.value)
    : f.kind === 'weather' ? s.weather === f.value
      : f.kind === 'vibe' ? s.vibe === f.value
        : tagList(s[f.kind]).includes(f.value)

// JOB PICKER: "Show all jobs" or one job
function JobPicker({ state, value, onChange }) {
  return (
    <label className="field">
      <span>Show</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="all">All jobs</option>
        {state.jobs.map((j) => <option key={j.id} value={j.id}>{j.name}{j.archived ? ' (archived)' : ''}</option>)}
      </select>
    </label>
  )
}

const sum = (list) => list.reduce((a, s) => a + shiftTips(s), 0)
const hrs = (list) => list.reduce((a, s) => a + num(s.hours), 0)
const forJob = (state, jobFilter) => state.shifts
  .filter((s) => jobFilter === 'all' || s.jobId === jobFilter)
  .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))

// OVERVIEW (on Home): job picker, this week / this month / average tips per hour, and the calendar.
export function Overview({ state, update, onEdit }) {
  const [jobFilter, setJobFilter] = useState('all')
  const shifts = forJob(state, jobFilter)
  // TOTALS: this week (uses the picked job's week start, Monday for all jobs) and this month
  const weekStart = jobFilter === 'all' ? 1 : state.jobs.find((j) => j.id === jobFilter)?.weekStart ?? 1
  const week = weekRange(today(), weekStart)
  const monthPrefix = today().slice(0, 7)
  const thisWeek = shifts.filter((s) => inRange(s.date, week))
  const thisMonth = shifts.filter((s) => s.date.startsWith(monthPrefix))
  const avg = hrs(shifts) > 0 ? sum(shifts) / hrs(shifts) : 0
  return (
    <>
      <JobPicker state={state} value={jobFilter} onChange={setJobFilter} />
      <div className="stats">
        <div><span className="label">This week</span><strong>{money(sum(thisWeek))}</strong></div>
        <div><span className="label">This month</span><strong>{money(sum(thisMonth))}</strong></div>
        <div><span className="label">Average tips per hour</span><strong>{money(avg)}</strong></div>
      </div>
      <Calendar state={state} jobFilter={jobFilter} weekStart={weekStart} onEdit={onEdit} update={update} />
    </>
  )
}

// SHIFT LIST PAGE: every shift, like a database. Tap a card to open it, tap a tag to filter.
export default function ShiftList({ state, update, onEdit, filter, setFilter }) {
  const [jobFilter, setJobFilter] = useState('all')
  const [openId, setOpenId] = useState(null)
  const jobName = (id) => state.jobs.find((j) => j.id === id)?.name || 'Unknown job'
  const shifts = forJob(state, jobFilter)
  const shown = shifts.filter((s) => !filter || hasTag(s, filter))
  const open = state.shifts.find((s) => s.id === openId)

  return (
    <section className="history">
      <h2>Shift list</h2>
      <JobPicker state={state} value={jobFilter} onChange={setJobFilter} />
      {filter && (
        <div className="banner">
          Showing {shown.length} shift{shown.length === 1 ? '' : 's'} with <strong>{filter.label}</strong>
          {hrs(shown) > 0 && ` · ${money(sum(shown) / hrs(shown))}/hr`}{' '}
          <button className="link" onClick={() => setFilter(null)}>Show all shifts</button>
        </div>
      )}
      {shifts.length === 0 && <p className="empty">No shifts yet. Your first one shows up here after you submit it.</p>}
      <ul className="list">
        {shown.map((s) => {
          const job = state.jobs.find((j) => j.id === s.jobId)
          return (
            <li key={s.id} className="stack reg-card" onClick={() => setOpenId(s.id)}>
              <div>
                <strong>{prettyDate(s.date)}</strong> · {jobName(s.jobId)} · {s.roleName}
                <div className="hint">
                  {money(shiftTips(s))} tips · {fmtHours(num(s.hours), job?.hoursFormat)} · {money(tipsPerHour(s))}/hr
                </div>
                <ShiftTags s={s} state={state} filter={filter} setFilter={setFilter} />
              </div>
            </li>
          )
        })}
      </ul>

      {/* SHIFT POP-UP: same card as the calendar */}
      {open && (
        <div className="modal-back" role="dialog" aria-modal="true" aria-label={prettyDate(open.date)} onClick={() => setOpenId(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="row-between">
              <h3>{prettyDate(open.date)}</h3>
              <button className="ghost" onClick={() => setOpenId(null)} aria-label="Close"><Icon name="X" /></button>
            </div>
            <ShiftCard state={state} s={open} onEdit={onEdit} update={update} onDeleted={() => setOpenId(null)} />
          </div>
        </div>
      )}
    </section>
  )
}

// SHIFT TAGS: regulars, section, events, weather and vibe as tappable filters
// Tap a tag to filter. Tap the same tag again to clear the filter.
function ShiftTags({ s, state, filter, setFilter }) {
  const tags = [
    ...(s.regularsSeen || []).map((id) => ({ kind: 'regular', value: id, label: state.regulars.find((r) => r.id === id)?.name })).filter((t) => t.label),
    ...tagList(s.section).map((v) => ({ kind: 'section', value: v, label: v })),
    ...tagList(s.events).map((v) => ({ kind: 'events', value: v, label: v })),
    s.weather && { kind: 'weather', value: s.weather, label: s.weather },
    s.vibe && { kind: 'vibe', value: s.vibe, label: `vibe ${s.vibe}/5` },
  ].filter(Boolean)
  if (!tags.length) return null
  return (
    <div className="chips">
      {tags.map((t) => <button key={t.kind + t.value} className={filter && filter.kind === t.kind && filter.value === t.value ? 'chip tag-chip on' : 'chip tag-chip'} onClick={(e) => { e.stopPropagation(); setFilter(filter && filter.kind === t.kind && filter.value === t.value ? null : t) }}>{t.label}</button>)}
    </div>
  )
}

// EXPORT: every shift in a date range as a spreadsheet file (CSV).
// Doubles as "tip proof" to show a manager the card tips for a pay window.
export function Export({ state, jobFilter = 'all' }) {
  const [from, setFrom] = useState(addDays(today(), -30))
  const [to, setTo] = useState(today())
  const run = () => {
    // EXPORT COLUMNS: only these ten, so it works as tip proof
    const rows = [[
      'Date', 'Job', 'Position', 'Cash tips', 'Card tips', 'Auto-gratuity', 'Total tips',
      'Hours', 'Tips per hour', 'Hourly wage',
    ]]
    state.shifts
      .filter((s) => (jobFilter === 'all' || s.jobId === jobFilter) && s.date >= from && s.date <= to)
      .sort((a, b) => (a.date > b.date ? 1 : -1))
      .forEach((s) => rows.push([
        s.date, state.jobs.find((j) => j.id === s.jobId)?.name, s.roleName,
        num(s.cash).toFixed(2), num(s.card).toFixed(2), num(s.autoGrat).toFixed(2), shiftTips(s).toFixed(2),
        num(s.hours), tipsPerHour(s).toFixed(2), s.useWage ? num(s.wage).toFixed(2) : '',
      ]))
    download(`tips_${from}_to_${to}.csv`, toCSV(rows))
  }
  return (
    <details className="card">
      <summary>Export shifts (tip proof)</summary>
      <div className="grid2">
        <label className="field"><span>From</span><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label className="field"><span>To</span><input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
      </div>
      <button className="primary" onClick={run}>Download spreadsheet</button>
    </details>
  )
}

// PAYCHECK LOG: only for jobs where card tips come on a paycheck.
// Compares the tips on the paycheck with the card tips you tracked for that period.
export function PaycheckLog({ state, update }) {
  const payJobs = state.jobs.filter((j) => j.tipsRule === 'paycheck')
  const [jobId, setJobId] = useState(payJobs[0]?.id || '')
  const [payDate, setPayDate] = useState(today())
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [custom, setCustom] = useState(null) // { start, end } when changed by hand
  if (payJobs.length === 0) return null

  const job = payJobs.find((j) => j.id === jobId) || payJobs[0]
  const period = custom || paycheckPeriod(job, payDate)
  const tracked = (jid, p) =>
    state.shifts.filter((s) => s.jobId === jid && inRange(s.date, p)).reduce((a, s) => a + num(s.card), 0)

  const add = () => {
    if (amount === '') return
    update((s) => {
      s.paychecks.push({ id: uid(), jobId: job.id, payDate, start: period.start, end: period.end, amount: num(amount), note })
    })
    setAmount(''); setNote(''); setCustom(null)
  }

  return (
    <details className="card">
      <summary>Paycheck log</summary>
      <p className="hint">Log the tips on each paycheck (after deductions) and compare them with the card tips you tracked.</p>
      {payJobs.length > 1 && (
        <label className="field"><span>Job</span>
          <select value={job.id} onChange={(e) => { setJobId(e.target.value); setCustom(null) }}>
            {payJobs.map((j) => <option key={j.id} value={j.id}>{j.name}</option>)}
          </select>
        </label>
      )}
      <div className="grid2">
        <label className="field"><span>Pay date</span>
          <input type="date" value={payDate} onChange={(e) => { setPayDate(e.target.value); setCustom(null) }} /></label>
        <label className="field"><span>Tips on this paycheck ($)</span>
          <input type="number" inputMode="decimal" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} /></label>
      </div>
      <div className="grid2">
        <label className="field"><span>Covers shifts from</span>
          <input type="date" value={period.start} onChange={(e) => setCustom({ ...period, start: e.target.value })} /></label>
        <label className="field"><span>to</span>
          <input type="date" value={period.end} onChange={(e) => setCustom({ ...period, end: e.target.value })} /></label>
      </div>
      <p className="hint">Card tips you tracked in this period: {money(tracked(job.id, period))}</p>
      <label className="field"><span>Note (tax, fees, deductions...)</span>
        <input value={note} onChange={(e) => setNote(e.target.value)} /></label>
      <button className="primary" onClick={add}>Save paycheck</button>

      {state.paychecks.length > 0 && (
        <ul className="list">
          {[...state.paychecks].sort((a, b) => (a.payDate < b.payDate ? 1 : -1)).map((p) => {
            const t = tracked(p.jobId, p)
            const diff = p.amount - t
            return (
              <li key={p.id}>
                <div>
                  <strong>{prettyDate(p.payDate)}</strong> · {state.jobs.find((j) => j.id === p.jobId)?.name}
                  <div className="hint">
                    Shifts {prettyDate(p.start)} to {prettyDate(p.end)} · Paycheck {money(p.amount)} · Tracked {money(t)} · Difference {money(diff)}
                    {p.note && ` · ${p.note}`}
                  </div>
                </div>
                <button className="link danger" onClick={() => update((s) => { s.paychecks = s.paychecks.filter((x) => x.id !== p.id) })}>Delete</button>
              </li>
            )
          })}
        </ul>
      )}
    </details>
  )
}

// TIME OFF: add days off, sick days or vacation, and see the list.
// Always visible, even before you have any time off saved.
export function TimeOffList({ state, update }) {
  const jobName = (id) => state.jobs.find((j) => j.id === id)?.name || 'Unknown job'
  const jobs = state.jobs.filter((j) => !j.archived)
  const [jobId, setJobId] = useState(jobs[0]?.id || '')
  const [type, setType] = useState('Day off')
  const [from, setFrom] = useState(today())
  const [to, setTo] = useState(today())

  const add = () => {
    if (!jobId || !from) return
    const end = to && to >= from ? to : from
    update((s) => { s.timeOff.push({ id: uid(), jobId, start: from, end, type }) })
  }

  return (
    <details className="card" open>
      <summary>Time off</summary>
      <TimeOffSummary state={state} />
      <p className="hint">Day off, sick, vacation, call out or other. Your weekly tip goal stays the same. The pick-up-a-shift nudge pauses in a week with time off.</p>
      <div className="grid2">
        <label className="field"><span>Establishment</span>
          <select value={jobId} onChange={(e) => setJobId(e.target.value)}>
            {jobs.map((j) => <option key={j.id} value={j.id}>{j.name}</option>)}
          </select></label>
        <label className="field"><span>Type</span>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            {OFF_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select></label>
      </div>
      <div className="grid2">
        <label className="field"><span>From</span>
          <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); if (to < e.target.value) setTo(e.target.value) }} /></label>
        <label className="field"><span>To</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
      </div>
      <button className="primary" onClick={add}>Save time off</button>
      {state.timeOff.length === 0 && <p className="empty">No time off saved yet.</p>}
      <ul className="list">
        {[...state.timeOff].sort((a, b) => (a.start < b.start ? 1 : -1)).map((t) => (
          <li key={t.id}>
            <div>
              <strong>{t.type}</strong> · {jobName(t.jobId)}
              <div className="hint">{t.start === t.end ? prettyDate(t.start) : `${prettyDate(t.start)} to ${prettyDate(t.end)}`}</div>
            </div>
            <button className="link danger" onClick={() => update((s) => { s.timeOff = s.timeOff.filter((x) => x.id !== t.id) })}>Delete</button>
          </li>
        ))}
      </ul>
    </details>
  )
}

// TIME OFF THIS YEAR: days counted by type (day off, sick, vacation, call out, other)
function TimeOffSummary({ state }) {
  const year = today().slice(0, 4)
  const counts = {}
  for (const t of state.timeOff) {
    for (let d = t.start; d <= t.end; d = addDays(d, 1)) {
      if (d.startsWith(year)) counts[t.type] = (counts[t.type] || 0) + 1
    }
  }
  const rows = OFF_TYPES.filter((t) => counts[t]).concat(Object.keys(counts).filter((t) => !OFF_TYPES.includes(t)))
  if (!rows.length) return null
  return (
    <div className="stats">
      {rows.map((t) => <div key={t}><span className="label">{t} ({year})</span><strong>{counts[t]} day{counts[t] === 1 ? '' : 's'}</strong></div>)}
    </div>
  )
}

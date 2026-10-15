import { useState } from 'react'
import Icon from '../Icon.jsx'
import ShiftCard from './ShiftCard.jsx'
import {
  money, num, today, toDate, toStr, addDays, prettyDate, fmtHours,
  shiftTips, tipsPerHour, tagList, WEEKDAYS, daysOffIn, inRange,
} from '../store.js'

// CALENDAR: one box per day showing the total tips made that day.
// Tap a day to see every shift worked that day. Time off days are marked.
export default function Calendar({ state, jobFilter, weekStart, onEdit, update }) {
  const [month, setMonth] = useState(() => today().slice(0, 7)) // "YYYY-MM"
  const [picked, setPicked] = useState(null)

  const [y, m] = month.split('-').map(Number)
  const first = new Date(y, m - 1, 1)
  const daysInMonth = new Date(y, m, 0).getDate()
  const lead = (first.getDay() - weekStart + 7) % 7 // empty boxes before the 1st

  const shifts = state.shifts.filter((s) => jobFilter === 'all' || s.jobId === jobFilter)
  const byDay = {}
  for (const s of shifts) (byDay[s.date] = byDay[s.date] || []).push(s)

  const timeOffOn = (d) =>
    state.timeOff.some((t) => (jobFilter === 'all' || t.jobId === jobFilter) && d >= t.start && d <= t.end)

  const cells = []
  for (let i = 0; i < lead; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(`${month}-${String(d).padStart(2, '0')}`)

  const totals = cells.filter(Boolean).map((d) => (byDay[d] || []).reduce((a, s) => a + shiftTips(s), 0))
  const monthTotal = totals.reduce((a, b) => a + b, 0)
  const maxDay = Math.max(0, ...totals)

  const shift = (n) => {
    const d = new Date(y, m - 1 + n, 1)
    setMonth(toStr(d).slice(0, 7))
    setPicked(null)
  }
  const dayNames = [...WEEKDAYS.slice(weekStart), ...WEEKDAYS.slice(0, weekStart)].map((n) => n.slice(0, 1))

  const jobName = (id) => state.jobs.find((j) => j.id === id)?.name || 'Unknown job'
  const regName = (id) => state.regulars.find((r) => r.id === id)?.name
  const dayShifts = picked ? byDay[picked] || [] : []

  return (
    <div className="card">
      <strong>Calendar</strong>
      <div className="row-between cal-head">
        <button onClick={() => shift(-1)} aria-label="Previous month">‹</button>
        <strong>{first.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</strong>
        <button onClick={() => shift(1)} aria-label="Next month">›</button>
      </div>
      <p className="hint">Month total: <strong>{money(monthTotal)}</strong></p>

      <div className="cal-grid">
        {dayNames.map((n, i) => <div key={i} className="cal-dow">{n}</div>)}
        {cells.map((d, i) => {
          if (!d) return <div key={'e' + i} />
          const total = (byDay[d] || []).reduce((a, s) => a + shiftTips(s), 0)
          const has = (byDay[d] || []).length > 0
          const heat = maxDay > 0 && has ? Math.round(15 + (total / maxDay) * 45) : 0
          return (
            <button
              key={d}
              className={`cal-day${picked === d ? ' on' : ''}${d === today() ? ' today' : ''}`}
              style={has ? { background: `color-mix(in srgb, var(--accent) ${heat}%, var(--card))` } : undefined}
              onClick={() => setPicked(picked === d ? null : d)}
              aria-label={`${prettyDate(d)}${has ? ', ' + money(total) : ''}`}
            >
              <span className="cal-num">{Number(d.slice(8))}</span>
              {has ? <span className="cal-amt">{money(total).replace('.00', '')}</span> : timeOffOn(d) ? <span className="cal-off">off</span> : null}
            </button>
          )
        })}
      </div>

      {/* DAY POP-UP: tap a day to open its shift card(s) */}
      {picked && (
        <div className="modal-back" role="dialog" aria-modal="true" aria-label={prettyDate(picked)} onClick={() => setPicked(null)}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <div className="row-between">
            <h3>{prettyDate(picked)}</h3>
            <button className="ghost" onClick={() => setPicked(null)} aria-label="Close"><Icon name="X" /></button>
          </div>
          {timeOffOn(picked) && <p className="hint">Marked as time off.</p>}
          {dayShifts.length === 0 && <p className="empty">No shifts this day.</p>}
          {dayShifts.length > 1 && (
            <p><strong>Day total: {money(dayShifts.reduce((a, s) => a + shiftTips(s), 0))}</strong></p>
          )}
          {dayShifts.map((s) => <ShiftCard key={s.id} state={state} s={s} onEdit={onEdit} update={update} />)}
        </div>
        </div>
      )}
    </div>
  )
}

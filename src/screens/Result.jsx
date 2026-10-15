import { useState } from 'react'
import Icon from '../Icon.jsx'
import {
  uid, money, num, prettyDate, fmtHours, today, addDays, toDate,
  shiftTips, tipsPerHour, perHourWithWage, weekProgress,
} from '../store.js'
import { shiftWrapped, checkoutCheck } from '../insights.js'

// RESULT SCREEN: shows right after every Submit.
// This shift first, then "How am I doing this week?"
export default function Result({ state, shiftId, update, onAgain, onDone, onFix, onHome }) {
  const [goalText, setGoalText] = useState(null) // null = show the goal saved in Settings
  const [askSave, setAskSave] = useState(false)
  const [justViewing, setJustViewing] = useState(false)
  const [offMsg, setOffMsg] = useState('')
  const shift = state.shifts.find((s) => s.id === shiftId)
  if (!shift) return null
  const job = state.jobs.find((j) => j.id === shift.jobId)
  const wk0 = weekProgress(state, job, shift.date)
  // GOAL FOR THIS VIEW: a goal typed here only changes this screen until you choose "Update my settings".
  const goalShown = goalText ?? (wk0.goal > 0 ? String(wk0.goal) : '')
  const typed = parseFloat(goalShown)
  const viewGoal = justViewing && Number.isFinite(typed) ? typed : wk0.goal
  const wk = { ...wk0, goal: viewGoal }
  const pct = wk.goal > 0 ? Math.min(100, Math.round((wk.tips / wk.goal) * 100)) : 0
  const left = Math.max(0, wk.goal - wk.tips)
  // EDIT: preview a different goal right away, then ask if it should be saved in Settings
  const applyGoal = () => { if (Number.isFinite(typed) && typed >= 0 && typed !== wk0.goal) { setJustViewing(true); setAskSave(true) } }

  // PICK-UP-A-SHIFT NUDGE: last 2 days of the week, goal not met, no time off this week
  const daysLeft = Math.round((toDate(wk.range.end) - toDate(today())) / 86400000)
  const showNudge =
    job.nudge && wk.goal > 0 && left > 0 && wk.off === 0 &&
    daysLeft >= 0 && daysLeft <= 1 && wk.range.end >= today()

  // "I'M OFF THIS WEEK": marks the rest of this week as days off
  const offThisWeek = () => {
    const start = shift.date > today() ? shift.date : addDays(today(), 1)
    if (start > wk.range.end) return
    update((s) => {
      s.timeOff.push({ id: uid(), jobId: job.id, start, end: wk.range.end, type: 'Day off' })
    })
    setOffMsg(`Saved: ${prettyDate(start)} to ${prettyDate(wk.range.end)} marked as days off. You'll see it in Settings under Time off and on your calendar on Home.`)
  }

  return (
    <section className="result">
      <p className="saved"><Icon name="CheckCircle" /> Saved: {job.name} · {shift.roleName} · {prettyDate(shift.date)}</p>

      <h2>This shift</h2>
      <div className="totals">
        <div>
          <span className="label">{shift.useWage ? 'Per hour (tips + hourly wage)' : 'Tips per hour'}</span>
          <strong className="big-num">{money(shift.useWage ? perHourWithWage(shift) : tipsPerHour(shift))}</strong>
        </div>
        <div>
          <span className="label">Total tips this shift</span>
          <strong className="big-num">{money(shiftTips(shift))}</strong>
        </div>
      </div>
      <p className="hint">
        {fmtHours(num(shift.hours), job.hoursFormat)} worked
        {shift.useWage && ` · ${money(num(shift.wage) * num(shift.hours))} hourly wage`}
      </p>

      <CheckoutCheck state={state} shift={shift} onFix={onFix} />

      {/* SHIFT WRAPPED: fun lines about this shift, from your own history */}
      <div className="wrapped">
        {shiftWrapped(state, shift).map((l) => (
          <p key={l.text}><Icon name={l.icon} /> {l.text}</p>
        ))}
      </div>

      <h2>How am I doing this week?</h2>
      <p className="hint">{prettyDate(wk.range.start)} to {prettyDate(wk.range.end)} · {wk.shifts} shift{wk.shifts === 1 ? '' : 's'}</p>
      {/* PROGRESS BAR: always shown, even before you set a goal */}
      <div className="bar"><div style={{ width: `${pct}%` }} /></div>
      {wk.goal > 0 ? (
        <>
          <p>
            <strong>{money(wk.tips)}</strong> of {money(wk.goal)} weekly tip goal
            {left > 0 ? ` · ${money(left)} to go` : <> · Goal reached! <Icon name="Confetti" /></>}
          </p>
        </>
      ) : (
        <p><strong>{money(wk.tips)}</strong> in tips this week. Set a weekly tip goal in Settings to fill the bar.</p>
      )}
      {/* CHANGE GOAL: type a goal; then choose to save it in Settings or just look at it */}
      <label className="field">
        <span>{wk0.goal > 0 ? 'Change this week\'s tip goal ($)' : 'Set a weekly tip goal ($)'}</span>
        <div className="row">
          <input type="number" inputMode="decimal" min="0" value={goalShown} placeholder="e.g. 600" onChange={(e) => { setGoalText(e.target.value); setAskSave(false); setJustViewing(false) }} />
          <button onClick={applyGoal}>Edit</button>
        </div>
        <span className="hint">Hit Edit to see what a different weekly goal would look like. You can then choose to change it permanently.</span>
      </label>
      {askSave && (
        <div className="card">
          <p>Update your weekly tip goal in Settings to {money(typed)}?</p>
          <div className="actions small">
            <button className="primary" onClick={() => {
              update((st) => { st.jobs.find((j) => j.id === job.id).weeklyGoal = typed })
              setAskSave(false); setGoalText(null); setJustViewing(false)
            }}>Update my settings</button>
            <button className="ghost" onClick={() => { setJustViewing(true); setAskSave(false) }}>Just wondering</button>
          </div>
        </div>
      )}
      {showNudge && <p className="nudge">Maybe you should pick up a shift ;)</p>}
      {offMsg && <p className="saved">{offMsg}</p>}

      <div className="actions">
        <button className="primary" onClick={onHome}>Done</button>
        <button className="ghost" onClick={onAgain}>Log another shift</button>
        <button className="ghost" onClick={onFix}>Back: fix a mistake in this shift</button>
        <button className="ghost" onClick={onDone}>See shift list</button>
        {wk.range.end > today() && wk.off === 0 && (
          <button className="ghost" onClick={offThisWeek}>I'm off the rest of this week</button>
        )}
      </div>
    </section>
  )
}

// CHECKOUT DOUBLE-CHECK: tips as a % of sales, and a heads-up when it's far below your usual
function CheckoutCheck({ state, shift, onFix }) {
  const c = checkoutCheck(state, shift)
  if (!c) return null
  const pct = (n) => `${Math.round(n * 10) / 10}%`
  if (!c.low) {
    return <p className="hint"><Icon name="Receipt" /> Tips were {pct(c.pct)} of sales{c.usual != null && ` (you usually make ${pct(c.usual)})`}.</p>
  }
  return (
    <div className="banner warn-box">
      <strong><Icon name="Receipt" /> Double-check your checkout</strong>
      <p>Tips were {pct(c.pct)} of sales. You usually make {pct(c.usual)}.</p>
      <p className="hint">Common causes: a card tip left off, a tip-out taken twice, or a missed auto-gratuity. If it was just a slow table night, ignore this.</p>
      <button className="link" onClick={onFix}>Fix this shift</button>
    </div>
  )
}

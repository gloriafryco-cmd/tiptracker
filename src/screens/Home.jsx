import { useState } from 'react'
import Icon from '../Icon.jsx'
import { today, addDays, money, weekProgress, prettyDate, num, shiftTips } from '../store.js'
import { patterns, PATTERN_MIN, weekForecast, gamePlan } from '../insights.js'
import { Overview } from './History.jsx'

// HOME SCREEN (first draft, we will design it together later).
// Quick Add is a big button here. Below it: this week for each job, and the last shift.
export default function Home({ state, update, onQuickAdd, onEdit }) {
  const jobs = state.jobs.filter((j) => !j.archived)
  const pat = patterns(state)

  return (
    <section className="home">
      <h1>Tip Tracker</h1>
      <p className="lead">How much did I make? How much did I sell? How am I doing this week?</p>
      <button className="primary big" onClick={onQuickAdd}>Quick Add</button>

      <GamePlan state={state} jobs={jobs} />

      <Overview state={state} update={update} onEdit={onEdit} />

      <h2>This week</h2>
      {jobs.map((j) => {
        const wk = weekProgress(state, j, today())
        const pct = wk.goal > 0 ? Math.min(100, Math.round((wk.tips / wk.goal) * 100)) : 0
        const fc = weekForecast(state, j, today())
        return (
          <div className="card" key={j.id}>
            <div className="row-between">
              <strong>{j.name}</strong>
              <span className="hint">{wk.shifts} shift{wk.shifts === 1 ? '' : 's'}</span>
            </div>
            <div className="bar"><div style={{ width: `${pct}%` }} /></div>
            <p>
              <strong>{money(wk.tips)}</strong>
              {wk.goal > 0 ? ` of ${money(wk.goal)} weekly tip goal` : ' in tips. Set a weekly tip goal after your next shift.'}
            </p>
            {/* WEEK FORECAST: where this week is heading, from your usual days */}
            {fc && (
              <p className="hint">
                <Icon name="ChartLineUp" /> On pace for <strong>{money(fc.pace)}</strong> this week
                {wk.goal > 0 && (fc.pace >= wk.goal ? ' · on track for your goal' : ` · about ${money(wk.goal - fc.pace)} short of your goal`)}
                {fc.best && ` · your best day left is usually ${fc.best.day} (${money(fc.best.amount)} when you work it)`}
              </p>
            )}
          </div>
        )
      })}

      {/* YOUR PATTERNS: what makes a good shift, worked out from your shifts */}
      <h2>Your patterns</h2>
      <div className="card">
        {!pat.ready ? (
          <>
            <p><strong>What makes a good shift for you?</strong></p>
            <p className="hint">Log {PATTERN_MIN} shifts to unlock it ({pat.have} of {PATTERN_MIN} so far). Add weather, events and a section on Quick Add screen 3 to get richer answers.</p>
            <div className="bar"><div style={{ width: `${Math.round((pat.have / PATTERN_MIN) * 100)}%` }} /></div>
          </>
        ) : pat.lines.length === 0 ? (
          <p className="hint">Nothing stands out yet. Keep adding weather, events and shift types. Your average is {money(pat.overall)}/hr.</p>
        ) : (
          pat.lines.map((l) => <p key={l.key}><Icon name="Star" /> {l.text}</p>)
        )}
      </div>

    </section>
  )
}

// PRE-SHIFT GAME PLAN: read it before you clock in
function GamePlan({ state, jobs }) {
  const [when, setWhen] = useState(0) // 0 = today, 1 = tomorrow
  const [jobId, setJobId] = useState(state.last.jobId || jobs[0]?.id)
  const job = jobs.find((j) => j.id === jobId) || jobs[0]
  if (!job) return null
  const date = addDays(today(), when)
  const plan = gamePlan(state, job, date)
  return (
    <div className="card">
      <strong><Icon name="ClipboardText" /> Game plan</strong>
      <div className="chips">
        <button className={when === 0 ? 'chip on' : 'chip'} onClick={() => setWhen(0)}>Today</button>
        <button className={when === 1 ? 'chip on' : 'chip'} onClick={() => setWhen(1)}>Tomorrow</button>
        {jobs.length > 1 && jobs.map((j) => (
          <button key={j.id} className={j.id === job.id ? 'chip on' : 'chip'} onClick={() => setJobId(j.id)}>{j.name}</button>
        ))}
      </div>
      {!plan ? (
        <p className="hint">Log 2 {prettyDate(date).slice(0, 3)} shifts at {job.name} and your game plan for that day shows up here.</p>
      ) : (
        <>
          <p>Your usual {plan.day}: <strong>{money(plan.avgTips)}</strong> in tips · {money(plan.avgTph)}/hr <span className="hint">(from {plan.n} shifts)</span></p>
          {plan.section && <p><Icon name="MapPin" /> Best section on {plan.day}s: <strong>{plan.section.name}</strong> ({money(plan.section.tph)}/hr). Ask for it.</p>}
          {plan.regulars.length > 0 && (
            <>
              <p><Icon name="HandWaving" /> Regulars who usually come in on {plan.day}s:</p>
              <ul className="got">
                {plan.regulars.map((r) => (
                  <li key={r.id}><strong>{r.name}</strong>{r.order && ` · ${r.order}`}{r.table && ` · likes ${r.table}`}</li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </div>
  )
}

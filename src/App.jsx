import { useEffect, useState } from 'react'
import { loadState, saveState, newJob } from './store.js'
import Home from './screens/Home.jsx'
import QuickAdd from './screens/QuickAdd.jsx'
import Result from './screens/Result.jsx'
import ShiftList from './screens/History.jsx'
import Regulars from './screens/Regulars.jsx'
import Settings from './screens/Settings.jsx'
import Quiz from './screens/Quiz.jsx'

// APP SHELL: bottom tabs, saving, and which screen is showing.
export default function App() {
  const [state, setState] = useState(loadState)
  const [tab, setTab] = useState('home')
  const [adding, setAdding] = useState(false) // Quick Add is opened from the Home screen
  const [quiz, setQuiz] = useState(null) // { jobId } to redo a job, { jobId: null } for a new job
  const [result, setResult] = useState(null) // id of the shift just saved
  const [editing, setEditing] = useState(null) // { id, from: 'result' | 'shifts' | 'home' } shift being edited
  const [histFilter, setHistFilter] = useState(null) // { kind, value, label } tag filter on the Shift list

  useEffect(() => saveState(state), [state])

  // DISPLAY SETTINGS: dark mode and large text
  useEffect(() => {
    const root = document.documentElement
    if (state.prefs.theme === 'auto') root.removeAttribute('data-theme')
    else root.setAttribute('data-theme', state.prefs.theme)
    root.classList.remove('large-text') // large text is off for now
  }, [state.prefs])

  // ENTER KEY: pressing Enter in a text box presses that box's button
  // (the button beside it, or else the main button of that card or screen).
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Enter' || e.defaultPrevented) return
      const el = e.target
      if (el.tagName !== 'INPUT' || ['checkbox', 'radio', 'file', 'button'].includes(el.type)) return
      const btn = el.closest('.row')?.querySelector('button') ||
        el.closest('.card, .modal, section')?.querySelector('button.primary')
      if (btn) { e.preventDefault(); btn.click() }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  // update(fn): fn gets a copy of the data, changes it, and it is saved.
  const update = (fn) =>
    setState((s) => {
      const copy = structuredClone(s)
      fn(copy)
      return copy
    })

  const activeJobs = state.jobs.filter((j) => !j.archived)

  // FIRST LAUNCH: no jobs yet
  if (state.jobs.length === 0 && !quiz) {
    return (
      <main className="app">
        <section className="welcome">
          <h1>Tip Tracker</h1>
          <p className="lead">How much did I make? How much did I sell? How am I doing this week?</p>
          <p>Answer a few questions so the app works the way your restaurant does. Every question can be skipped.</p>
          <button className="primary big" onClick={() => setQuiz({ jobId: null })}>
            Take 5 min to set up your restaurant
          </button>
          <button
            className="ghost"
            onClick={() => update((s) => { s.jobs.push(newJob('My job')) })}
          >
            Skip for now
          </button>
        </section>
      </main>
    )
  }

  if (quiz) {
    return (
      <main className="app">
        <Quiz
          state={state}
          jobId={quiz.jobId}
          onCancel={() => setQuiz(null)}
          onSave={(job) => {
            update((s) => {
              const i = s.jobs.findIndex((j) => j.id === job.id)
              if (i >= 0) s.jobs[i] = job
              else s.jobs.push(job)
            })
            setQuiz(null)
          }}
        />
      </main>
    )
  }

  let screen
  if (result) {
    screen = (
      <Result
        state={state}
        shiftId={result}
        update={update}
        onFix={() => { setEditing({ id: result, from: 'result' }); setResult(null) }}
        onAgain={() => { setResult(null); setAdding(true) }}
        onHome={() => { setResult(null); setAdding(false); setTab('home') }}
        onDone={() => { setResult(null); setTab('shifts') }}
      />
    )
  } else if (editing) {
    screen = (
      <QuickAdd
        key={editing.id}
        state={state}
        update={update}
        editId={editing.id}
        onSetup={(jobId) => setQuiz({ jobId })}
        onSaved={(id) => { setEditing(null); if (editing.from === 'result') setResult(id); else setTab(editing.from) }}
        onCancel={() => { if (editing.from === 'result') setResult(editing.id); setEditing(null) }}
      />
    )
  } else if (tab === 'home' && adding) {
    screen = (
      <QuickAdd
        key="new"
        state={state}
        update={update}
        onSetup={(jobId) => setQuiz({ jobId })}
        onSaved={(id) => setResult(id)}
        onCancel={() => setAdding(false)}
      />
    )
  } else if (tab === 'home') {
    screen = <Home state={state} update={update} onQuickAdd={() => setAdding(true)} onEdit={(id) => setEditing({ id, from: 'home' })} />
  } else if (tab === 'shifts') {
    screen = <ShiftList state={state} update={update} onEdit={(id) => setEditing({ id, from: 'shifts' })} filter={histFilter} setFilter={setHistFilter} />
  } else if (tab === 'regulars') {
    screen = <Regulars state={state} update={update} onShowShifts={(r) => { setHistFilter({ kind: 'regular', value: r.id, label: r.name }); setTab('shifts') }} />
  } else {
    screen = (
      <Settings
        state={state}
        update={update}
        onRedo={(jobId) => setQuiz({ jobId })}
        onAddJob={() => setQuiz({ jobId: null })}
      />
    )
  }

  const tabs = [
    ['home', 'Home'],
    ['shifts', 'Shift list'],
    ['regulars', 'Regulars'],
    ['settings', 'Settings'],
  ]

  return (
    <div className="app">
      <main className="content">{activeJobs.length || tab === 'settings' ? screen : (
        <section className="card">
          <h2>All your jobs are archived</h2>
          <p>Go to Settings to bring one back or add a new job.</p>
        </section>
      )}</main>
      <nav className="tabs">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            className={tab === id && !result && !editing ? 'on' : ''}
            onClick={() => { setResult(null); setEditing(null); setAdding(false); setHistFilter(null); setTab(id) }}
          >
            {label}
          </button>
        ))}
      </nav>
    </div>
  )
}

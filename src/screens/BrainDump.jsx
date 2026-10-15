import { useState } from 'react'
import Icon from '../Icon.jsx'
import { SHIFT_TYPES, money, num, to12, hoursFromTimes } from '../store.js'
import TimeField from '../TimeField.jsx'
import { Money, TagBox, Totals } from './fields.jsx'

const WEATHER = ['Sunny', 'Cloudy', 'Rainy', 'Snowy', 'Hot', 'Cold']

// BRAIN DUMP POP-UP: first thing you see on Quick Add.
// Type or say everything about the shift, or tap "Enter manually" for the classic screens.
export function BrainDumpModal({ onFill, onManual, onCancel, jobs, job, role, set }) {
  const [text, setText] = useState('')
  const [listening, setListening] = useState(false)
  const [msg, setMsg] = useState('')
  const SpeechRec = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)

  const listen = () => {
    const rec = new SpeechRec()
    rec.lang = 'en-US'
    rec.onresult = (e) => setText((t) => (t ? `${t} ` : '') + e.results[0][0].transcript)
    rec.onerror = () => { setListening(false); setMsg('The microphone did not work. You can type it instead.') }
    rec.onend = () => setListening(false)
    setListening(true)
    rec.start()
  }
  const fill = () => {
    if (!text.trim()) return setMsg('Type or say something about your shift first.')
    if (!onFill(text)) setMsg('I could not pick anything out of that. Try something like: 7-10, 300 card, 20 cash.')
  }

  return (
    <div className="modal-back" role="dialog" aria-modal="true" aria-label="Brain dump about your shift">
      <div className="modal">
        <h2>Brain dump about your shift</h2>
        <p className="hint">Say or type everything you remember, in any order. Example: I worked from 7-10, made 20 cash and 300 credit card tips, saw Roger, sales were 1000, sunny, 5 star shift.</p>
        <textarea rows="5" autoFocus value={text} placeholder="Start typing…" onChange={(e) => setText(e.target.value)} />
        {SpeechRec && (
          <button className="ghost" onClick={listen}><Icon name="Microphone" /> {listening ? 'Listening…' : 'Say it instead'}</button>
        )}
        {msg && <p className="error">{msg}</p>}
        <div className="actions">
          <button className="primary big" onClick={fill}>Fill it in</button>
          <button className="ghost" onClick={onManual}>Manually add shift info instead</button>
          {/* WHICH JOB: confirm the job and position this brain dump is about */}
          <div className="grid2">
            <label className="field"><span>Establishment</span>
              <select value={job.id} onChange={(e) => {
                const j = jobs.find((x) => x.id === e.target.value)
                set({ jobId: j.id, roleId: j.roles[0]?.id })
              }}>
                {jobs.map((j) => <option key={j.id} value={j.id}>{j.name}</option>)}
              </select></label>
            <label className="field"><span>Position</span>
              <select value={role?.id} onChange={(e) => set({ roleId: e.target.value })}>
                {job.roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select></label>
          </div>
          <button className="link" onClick={onCancel}>Cancel</button>
        </div>
        <p className="hint">Note: Only tips and hours are required. All other info is optional.</p>
      </div>
    </div>
  )
}

// WHICH TIPS? Pops up when the brain dump had a tip total with no "card" or "cash".
// "General tips" is only offered here, for when you don't know the split.
export function TipSortModal({ amount, onDone }) {
  const [both, setBoth] = useState(false)
  const [card, setCard] = useState('')
  const [cash, setCash] = useState('')
  const left = Math.round((amount - num(card) - num(cash)) * 100) / 100
  return (
    <div className="modal-back" role="dialog" aria-modal="true" aria-label="Which tips?">
      <div className="modal">
        <h2>Is {money(amount)} credit card tips, cash, or both?</h2>
        {!both ? (
          <div className="actions">
            <button className="primary" onClick={() => onDone({ card: String(amount) })}>Credit card tips</button>
            <button className="primary" onClick={() => onDone({ cash: String(amount) })}>Cash tips</button>
            <button onClick={() => setBoth(true)}>Both</button>
            <button onClick={() => onDone({ general: String(amount) })}>General tips (I don't know the split)</button>
          </div>
        ) : (
          <>
            <p className="hint">Which part was cash and which was card?</p>
            <div className="grid2">
              <Money label="Card tips" value={card} onChange={setCard} />
              <Money label="Cash tips" value={cash} onChange={setCash} />
            </div>
            <p className="hint">{left === 0 ? <><Icon name="Check" /> Adds up</> : left > 0 ? `${money(left)} not split yet` : `${money(-left)} more than ${money(amount)}`}</p>
            <div className="actions">
              <button className="primary big" onClick={() => onDone({ card, cash })}>Done</button>
              <button className="ghost" onClick={() => setBoth(false)}>Back</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// CLARIFY: one pop-up per unclear thing in a brain dump.
// AM/PM missing from times, or a number with no word telling where it goes.
export function ClarifyModal({ q, job, onAnswer }) {
  if (q.type === 'ampm') {
    const { h1, m1, h2, m2 } = q
    const mk = (a, b) => {
      const to24 = (h, ap) => (h % 12) + (ap === 'p' ? 12 : 0)
      const pad = (n) => String(n).padStart(2, '0')
      const start = `${pad(to24(h1, a))}:${pad(m1)}`, end = `${pad(to24(h2, b))}:${pad(m2)}`
      const x = to12(start), y = to12(end)
      return { label: `${x.text} ${x.ap} to ${y.text} ${y.ap}`, start, end }
    }
    const opts = [mk('p', 'p'), mk('a', 'a'), mk('a', 'p'), mk('p', 'a')]
    return (
      <div className="modal-back" role="dialog" aria-modal="true" aria-label="AM or PM?">
        <div className="modal">
          <h2>Was {h1}{m1 ? `:${String(m1).padStart(2, '0')}` : ''} to {h2}{m2 ? `:${String(m2).padStart(2, '0')}` : ''} AM or PM?</h2>
          <div className="actions">
            {opts.map((o) => {
              const h = hoursFromTimes(o.start, o.end)
              return (
                <button key={o.label} onClick={() => onAnswer({ useTimes: true, start: o.start, end: o.end, hours: String(h), hh: String(Math.floor(h)), mm: String(Math.round((h % 1) * 60)) })}>
                  {o.label} ({h} hours)
                </button>
              )
            })}
          </div>
          <p className="hint">Tip: type 7p or 7pm next time and I won't ask.</p>
        </div>
      </div>
    )
  }
  // q.type === 'number'
  const n = q.n
  const s = String(n)
  // Only big numbers get asked about, so the choices are sales or tips.
  const opts = [
    ['Card tips', { card: s }],
    ['Cash tips', { cash: s }],
    ['General tips (split unknown)', { general: s }],
    ['Shift sales', { sales: s }],
    ['Amount I tipped out', { tipOut: s }],
    job.trackAutoGrat && ['Auto-gratuity', { autoGrat: s }],
  ].filter(Boolean)
  return (
    <div className="modal-back" role="dialog" aria-modal="true" aria-label="What is this number?">
      <div className="modal">
        <h2>What is this number: {s}?</h2>
        <p className="hint">From: "…{q.context}…"</p>
        <div className="actions">
          {opts.map(([label, patch]) => <button key={label} onClick={() => onAnswer(patch)}>{label}</button>)}
          <button className="ghost" onClick={() => onAnswer({})}>Ignore it</button>
        </div>
      </div>
    </div>
  )
}

// AFTER THE BRAIN DUMP: the same totals as the end of manual screen 1,
// then "Do you want to add more info to this shift?"
export function TotalsModal({ f, set, hours, wage, role, job, error, onMore, onSubmit }) {
  return (
    <div className="modal-back" role="dialog" aria-modal="true" aria-label="Your shift">
      <div className="modal">
        <h2>How much did I make?</h2>
        {!(hours > 0) && (
          <>
            <p className="error">Add your hours so the app can work out tips per hour.</p>
            <HoursBox f={f} set={set} job={job} />
          </>
        )}
        <Totals f={f} set={set} hours={hours} wage={wage} role={role} />
        {error && hours > 0 && <p className="error">{error}</p>}
        <h3>Do you want to add more info to this shift?</h3>
        <p className="hint">You can edit this shift anytime in the Shift list or on the calendar.</p>
        <div className="actions">
          <button className="primary big" onClick={onMore}>Yes, add more info</button>
          <button className="ghost" onClick={onSubmit}>Submit</button>
        </div>
      </div>
    </div>
  )
}

// HOURS BOX: total hours, or start and end times
function HoursBox({ f, set, job }) {
  return (
    <>
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
    </>
  )
}

// DO YOU WANT TO ADD? Full page after "Yes, add more info".
// Shows every box. Boxes that weren't in the brain dump are tinted red.
// The red list is decided once, so a box stays red while you type in it.
export function DoYouWantToAdd({ ctx, base, guessedTimes, editing, onSave, onSkip, onManual, onCancel }) {
  const { state, job, role, jobs, f, set, hours, savedTags, addTag, addRegular, pickType, toggleIn, error } = ctx
  // Editing a saved shift: same page, no red boxes.
  const [missing] = useState(() => editing ? [] : [
    !(hours > 0) && 'hours',
    f.card === '' && 'card',
    f.cash === '' && 'cash',
    job.trackAutoGrat && f.autoGrat === '' && 'autoGrat',
    f.sales === '' && 'sales',
    f.covers === '' && 'covers',
    f.tipOut === '' && 'tipOut',
    !f.shiftType.length && 'shiftType',
    !f.weather && 'weather',
    !f.events.length && 'events',
    !f.section.length && 'section',
    !f.regularsSeen.length && !(f.newRegulars || []).length && 'regulars',
    !f.vibe && 'vibe',
    !f.note && 'note',
  ].filter(Boolean))
  const [newEvent, setNewEvent] = useState('')
  const [newSection, setNewSection] = useState('')
  const [newRegular, setNewRegular] = useState('')
  const miss = (k) => (missing.includes(k) ? 'missing' : undefined)

  return (
    <section className="review">
      <h2>{editing ? 'Edit shift' : 'Do you want to add?'}</h2>
      {editing
        ? <p className="hint">Change anything, then press Save changes.</p>
        : <p className="hint">Not in your brain dump. Fill in what you want, leave the rest blank. Red boxes were not in your brain dump.</p>}

      {/* JOB AND DATE, and times when AM/PM was a guess */}
      <div className="card">
        <div className="grid2">
          <label className="field"><span>Establishment</span>
            <select value={job.id} onChange={(e) => {
              const j = state.jobs.find((x) => x.id === e.target.value)
              set({ jobId: j.id, roleId: j.roles[0]?.id })
            }}>
              {jobs.map((j) => <option key={j.id} value={j.id}>{j.name}</option>)}
            </select></label>
          <label className="field"><span>Position</span>
            <select value={role?.id} onChange={(e) => set({ roleId: e.target.value })}>
              {job.roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select></label>
        </div>
        <label className="field"><span>Shift date</span>
          <input type="date" value={f.date} onChange={(e) => set({ date: e.target.value })} /></label>
      </div>

      <div className={miss('hours')}>
        <strong>Hours worked (needed)</strong>
        {guessedTimes && f.useTimes && <p className="hint">I guessed AM or PM. Fix them if they're wrong.</p>}
        <HoursBox f={f} set={set} job={job} />
      </div>
      <div className="grid2">
        <div className={miss('card')}><Money label="Card tips" value={f.card} onChange={(v) => set({ card: v })} /></div>
        <div className={miss('cash')}><Money label="Cash tips" value={f.cash} onChange={(v) => set({ cash: v })} /></div>
      </div>
      {(num(base?.general) > 0 || num(f.general) > 0) && <Money label="General tips (split unknown)" value={f.general} onChange={(v) => set({ general: v })} />}
      {job.trackAutoGrat && <div className={miss('autoGrat')}><Money label="Auto-gratuity (counts as tips)" value={f.autoGrat} onChange={(v) => set({ autoGrat: v })} /></div>}
      <div className={miss('sales')}><Money label="Shift sales" value={f.sales} onChange={(v) => set({ sales: v })} /></div>
      <div className={miss('covers')}>
        <label className="field"><span>Covers (guests served)</span>
          <input type="number" inputMode="numeric" min="0" value={f.covers} onChange={(e) => set({ covers: e.target.value })} /></label>
      </div>
      <div className={miss('tipOut')}><Money label="Amount I tipped out" value={f.tipOut} onChange={(v) => set({ tipOut: v })} /></div>
      <div className={miss('shiftType')}>
        <div className="field"><span>Shift type</span>
          <div className="chips">
            {SHIFT_TYPES.map((t) => (
              <button key={t} className={f.shiftType.includes(t) ? 'chip on' : 'chip'} onClick={() => pickType(t)}>{t}</button>
            ))}
          </div>
        </div>
      </div>
      <div className={miss('weather')}>
        <div className="field"><span>Weather</span>
          <div className="chips">
            {WEATHER.map((w) => (
              <button key={w} className={f.weather === w ? 'chip on' : 'chip'} onClick={() => set({ weather: f.weather === w ? '' : w })}>{w}</button>
            ))}
          </div>
        </div>
      </div>
      <div className={miss('events')}>
        <TagBox label="Events (trivia, bingo, the game...)" tags={f.events} suggestions={savedTags('events')}
          value={newEvent} setValue={setNewEvent} onAdd={(v) => addTag('events', v, setNewEvent)}
          onRemove={(t) => set({ events: f.events.filter((x) => x !== t) })} />
      </div>
      <div className={miss('section')}>
        <TagBox label="Section or station" tags={f.section} suggestions={savedTags('section')}
          value={newSection} setValue={setNewSection} onAdd={(v) => addTag('section', v, setNewSection)}
          onRemove={(t) => set({ section: f.section.filter((x) => x !== t) })} />
      </div>
      <div className={miss('regulars')}>
        <div className="field"><span>Regulars I saw</span>
          <div className="chips">
            {state.regulars.map((r) => (
              <button key={r.id} className={f.regularsSeen.includes(r.id) ? 'chip on' : 'chip'} onClick={() => set({ regularsSeen: toggleIn(f.regularsSeen, r.id) })}>{r.name}</button>
            ))}
            {(f.newRegulars || []).map((n) => (
              <button key={n} className="chip on" onClick={() => set({ newRegulars: f.newRegulars.filter((x) => x !== n) })}>{n} (new) <Icon name="X" label="Remove" /></button>
            ))}
          </div>
          <div className="row">
            <input value={newRegular} placeholder="New regular's name" onChange={(e) => setNewRegular(e.target.value)} />
            <button onClick={() => { addRegular(newRegular); setNewRegular('') }}>Add</button>
          </div>
        </div>
      </div>
      <div className={miss('vibe')}>
        <div className="field"><span>Shift vibe</span>
          <div className="chips">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} className={f.vibe === n ? 'chip on' : 'chip'} onClick={() => set({ vibe: f.vibe === n ? 0 : n })}>{n}</button>
            ))}
          </div>
        </div>
      </div>
      <div className={miss('note')}>
        <label className="field"><span>Notes</span>
          <textarea rows="2" value={f.note} onChange={(e) => set({ note: e.target.value })} /></label>
      </div>

      {error && <p className="error">{error}</p>}
      <div className="actions">
        <button className="primary big" onClick={onSave}>{editing ? 'Save changes' : 'Save'}</button>
        {editing
          ? <button className="ghost" onClick={onCancel}>Cancel</button>
          : <button className="ghost" onClick={onSkip}>Skip these for now</button>}
        <button className="link" onClick={onManual}>Open the full Quick Add screens instead</button>
      </div>
    </section>
  )
}

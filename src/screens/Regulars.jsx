import { useState } from 'react'
import Icon from '../Icon.jsx'
import { uid, money } from '../store.js'
import { regularStats } from '../insights.js'

// REGULARS: private guest memory. Name and usual order are the main fields.
export default function Regulars({ state, update, onShowShifts }) {
  const [name, setName] = useState('')
  const [open, setOpen] = useState(null)
  const [search, setSearch] = useState('')

  const add = () => {
    const n = name.trim()
    if (!n) return
    const id = uid()
    update((s) => { s.regulars.push({ id, name: n, order: '', table: '', details: '' }) })
    setName('')
    setOpen(id) // opens the details form right away
  }
  // SEARCH: matches the name or anything typed in the details
  const q = search.trim().toLowerCase()
  const matches = state.regulars.filter((r) =>
    !q || [r.name, r.order, r.table, r.details].some((v) => (v || '').toLowerCase().includes(q)))

  const edit = (id, patch) =>
    update((s) => { Object.assign(s.regulars.find((r) => r.id === id), patch) })

  return (
    <section>
      <h2>Regulars</h2>
      <p className="privacy">
        <strong>Keep it friendly, keep it private.</strong> Save only things that help you give great service.
        Don't store phone numbers, emails, addresses, payment info or health details. These notes stay on this device.
      </p>
      <div className="row">
        <input value={name} placeholder="Name" onChange={(e) => setName(e.target.value)} />
        <button className="primary" onClick={add}>Add</button>
      </div>
      {state.regulars.length === 0 && <p className="empty">No regulars yet. Add a name above.</p>}
      {state.regulars.length > 0 && (
        <label className="field">
          <span>Search names, orders, tables and details</span>
          <input type="search" value={search} placeholder="Try: Miller Lite" onChange={(e) => setSearch(e.target.value)} />
        </label>
      )}
      <ul className="list">
        {matches.map((r) => (
          <li key={r.id} className="stack reg-card" onClick={() => open !== r.id && setOpen(r.id)}>
            {/* tap anywhere on the card to open it; tap the name again to close */}
            <div className="row-between" onClick={(e) => { if (open === r.id) { e.stopPropagation(); setOpen(null) } }}>
              {/* PREVIEW: everything typed on the card */}
              <span><strong>{r.name}</strong>{[r.order, r.table, r.details].filter(Boolean).map((v) => ` · ${v}`).join('')}</span>
            </div>
            <LuckyLine state={state} r={r} onShowShifts={onShowShifts} />
            {open === r.id && (
              <RegularEditor
                r={r}
                onSave={(patch) => { edit(r.id, patch); setOpen(null) }}
                onDelete={() => confirm(`Delete ${r.name}?`) && update((s) => { s.regulars = s.regulars.filter((x) => x.id !== r.id) })}
              />
            )}
          </li>
        ))}
      </ul>
      {q && matches.length === 0 && <p className="empty">No regular matches "{search}".</p>}
    </section>
  )
}

// REGULAR CARD: changes are kept here until you press Save.
function RegularEditor({ r, onSave, onDelete }) {
  const [d, setD] = useState({ name: r.name, order: r.order, table: r.table, details: r.details })
  const set = (patch) => setD((x) => ({ ...x, ...patch }))
  return (
    <div className="card">
      <label className="field"><span>Name</span>
        <input value={d.name} onChange={(e) => set({ name: e.target.value })} /></label>
      <label className="field"><span>Usual order</span>
        <input value={d.order} onChange={(e) => set({ order: e.target.value })} /></label>
      <label className="field"><span>Favorite table</span>
        <input value={d.table} onChange={(e) => set({ table: e.target.value })} /></label>
      <label className="field"><span>Fun details (birthday, dog's name...)</span>
        <input value={d.details} onChange={(e) => set({ details: e.target.value })} /></label>
      <div className="actions small">
        <button className="primary" onClick={() => onSave({ ...d, name: d.name.trim() || r.name })}>Save</button>
        <button className="ghost danger" onClick={onDelete}>Delete</button>
      </div>
    </div>
  )
}

// SERVED ON: how many shifts you served this regular
// Tap it to see every shift this regular was at, in the Shift list.
function LuckyLine({ state, r, onShowShifts }) {
  const st = regularStats(state, r.id)
  if (!st) return <p className="hint">Tap this regular on Quick Add screen 3 when they come in, to see if they bring you luck.</p>
  return (
    <button className="link hint lucky" onClick={(e) => { e.stopPropagation(); onShowShifts(r) }}>
      <Icon name="Clover" /> Served on {st.n} shift{st.n === 1 ? '' : 's'} · see shifts
    </button>
  )
}

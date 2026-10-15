import { money, num, shiftTips, tipsPerHour, perHourWithWage } from '../store.js'
import Icon from '../Icon.jsx'

// SHARED FORM PIECES: used by Quick Add and the brain dump pop-ups and pages.

// TOTALS: hourly wage switch, the math line, tips per hour and total tips.
// Same block on manual Quick Add screen 1 and on the pop-up after a brain dump.
export function Totals({ f, set, hours, wage, role }) {
  const preview = { ...f, hours, wage }
  const total = shiftTips(preview)
  return (
    <>
      <label className="switch">
        <input type="checkbox" checked={f.useWage} onChange={(e) => set({ useWage: e.target.checked })} />
        <span>Include my hourly wage ({money(wage)}/hr as {role?.name})</span>
      </label>
      {hours > 0 && total + (f.useWage ? wage * hours : 0) > 0 && (
        <p className="math">
          {[
            num(f.card) > 0 && `${money(num(f.card) / hours)}/hr card`,
            num(f.cash) > 0 && `${money(num(f.cash) / hours)}/hr cash`,
            num(f.general) > 0 && `${money(num(f.general) / hours)}/hr general tips`,
            num(f.autoGrat) > 0 && `${money(num(f.autoGrat) / hours)}/hr auto-gratuity`,
            f.useWage && `${money(wage)}/hr hourly wage`,
          ].filter(Boolean).join(' + ')}
          {' = '}
          <strong>{money(f.useWage ? perHourWithWage(preview) : tipsPerHour(preview))}/hr</strong>
        </p>
      )}
      <div className="totals">
        <div>
          <span className="label">{f.useWage ? 'Per hour (tips + hourly wage)' : 'Tips per hour'}</span>
          <strong className="big-num">{money(f.useWage ? perHourWithWage(preview) : tipsPerHour(preview))}</strong>
        </div>
        <div>
          <span className="label">Total tips this shift</span>
          <strong className="big-num">{money(total)}</strong>
        </div>
      </div>
    </>
  )
}

export function Money({ label, value, onChange }) {
  return (
    <label className="field">
      <span>{label}</span>
      <div className="money">
        <i>$</i>
        <input type="number" inputMode="decimal" min="0" step="0.01" value={value} onChange={(e) => onChange(e.target.value)} />
      </div>
    </label>
  )
}

// TAG BOX: typed entries become tags. Tags used on past shifts show up as one-tap suggestions.
export function TagBox({ label, tags, suggestions, value, setValue, onAdd, onRemove }) {
  const more = suggestions.filter((t) => !tags.includes(t))
  return (
    <div className="field">
      <span>{label}</span>
      <div className="chips">
        {tags.map((t) => (
          <button key={t} className="chip on" onClick={() => onRemove(t)}>{t} <Icon name="X" label="Remove" /></button>
        ))}
      </div>
      <div className="row">
        <input value={value} placeholder="Type, then press Enter" onChange={(e) => setValue(e.target.value)} />
        <button onClick={() => onAdd(value)}>Add</button>
      </div>
      {more.length > 0 && (
        <div className="chips">
          {more.map((t) => <button key={t} className="chip" onClick={() => onAdd(t)}>{t}</button>)}
        </div>
      )}
    </div>
  )
}

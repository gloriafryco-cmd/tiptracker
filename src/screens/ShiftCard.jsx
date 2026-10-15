import { money, num, fmtHours, shiftTips, tipsPerHour, tagList } from '../store.js'

// SHIFT CARD: every detail of one shift, with Edit and Delete.
// Used in the calendar day pop-up and the shift list pop-up.
export default function ShiftCard({ state, s, onEdit, update, onDeleted }) {
  const jobName = (id) => state.jobs.find((j) => j.id === id)?.name || 'Unknown job'
  const regName = (id) => state.regulars.find((r) => r.id === id)?.name
  const job = state.jobs.find((j) => j.id === s.jobId)
  const rows = [
    ['Establishment', jobName(s.jobId)],
    ['Position', s.roleName],
    (s.shiftType || []).length && ['Shift type', s.shiftType.join(' + ')],
    ['Hours', fmtHours(num(s.hours), job?.hoursFormat)],
    ['Card tips', money(num(s.card))],
    ['Cash tips', money(num(s.cash))],
    ...(num(s.general) > 0 ? [['General tips', money(num(s.general))]] : []),
    num(s.autoGrat) > 0 && ['Auto-gratuity', money(num(s.autoGrat))],
    ['Total tips', money(shiftTips(s))],
    ['Tips per hour', money(tipsPerHour(s))],
    s.useWage && ['Hourly wage', `${money(num(s.wage))}/hr (${money(num(s.wage) * num(s.hours))})`],
    s.sales !== '' && s.sales != null && ['Shift sales', money(num(s.sales))],
    s.covers !== '' && s.covers != null && ['Covers', num(s.covers)],
    s.tipOut !== '' && s.tipOut != null && ['Tipped out', money(num(s.tipOut))],
    s.weather && ['Weather', s.weather],
    tagList(s.events).length && ['Events', tagList(s.events).join(', ')],
    tagList(s.section).length && ['Section', tagList(s.section).join(', ')],
    (s.regularsSeen || []).length && ['Regulars', s.regularsSeen.map(regName).filter(Boolean).join(', ')],
    s.vibe && ['Shift vibe', `${s.vibe} of 5`],
    s.note && ['Notes', s.note],
  ].filter(Boolean)
  return (
    <div className="idea" key={s.id}>
      {rows.map(([k, v]) => (
        <div className="cal-row" key={k}><span>{k}</span><strong>{v}</strong></div>
      ))}
      <div className="row-actions">
        <button className="link" onClick={() => onEdit(s.id)}>Edit this shift</button>
        <button
          className="link danger"
          onClick={() => confirm('Delete this shift? This can\'t be undone.') && (update((st) => { st.shifts = st.shifts.filter((x) => x.id !== s.id) }), onDeleted && onDeleted())}
        >
          Delete
        </button>
      </div>
    </div>
  )
}

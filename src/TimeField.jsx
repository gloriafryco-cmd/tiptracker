import { useEffect, useState } from 'react'
import { parseTime, to12 } from './store.js'

// TIME FIELD: type "9", "930" or "9:30" (no leading zero needed) and pick AM or PM.
// value and onChange use 24-hour "HH:MM" text, or '' when empty.
export default function TimeField({ label, value, onChange }) {
  const [text, setText] = useState(() => to12(value).text)
  const [ap, setAp] = useState(() => to12(value).ap)

  // When a shift type fills the time in, show it here.
  useEffect(() => {
    if (value && value !== parseTime(text, ap)) {
      const t = to12(value)
      setText(t.text)
      setAp(t.ap)
    }
    if (!value && text && !parseTime(text, ap)) return
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  const push = (t, a) => onChange(parseTime(t, a))

  return (
    <label className="field">
      <span>{label}</span>
      <div className="row">
        <input
          inputMode="numeric"
          placeholder="9:30"
          value={text}
          onChange={(e) => { setText(e.target.value); push(e.target.value, ap) }}
        />
        <select style={{ width: '5.5rem' }} value={ap} onChange={(e) => { setAp(e.target.value); push(text, e.target.value) }}>
          <option>AM</option>
          <option>PM</option>
        </select>
      </div>
    </label>
  )
}

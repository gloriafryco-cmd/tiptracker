// STORE: everything the app saves, plus the math.
// Data is saved in this browser only (localStorage). Nothing is sent anywhere.

const KEY = 'tipTracker.v1'

export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36)

// SHIFT TYPE TIMES: tapping a shift type on Quick Add fills these in.
// Always editable per establishment (Settings) and per shift (Quick Add).
export const DEFAULT_SHIFT_TIMES = {
  Breakfast: { start: '07:00', end: '11:00' },
  Lunch: { start: '11:00', end: '16:00' },
  Dinner: { start: '16:00', end: '22:00' },
  'Late night': { start: '22:00', end: '02:00' },
}
export const SHIFT_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Late night', 'Event / private party', 'Double']

// TIME TEXT: turns what you type ("9", "930", "9:30") plus AM/PM into "HH:MM" (24-hour).
export function parseTime(text, ap) {
  const digits = String(text).replace(/[^0-9:]/g, '')
  let h, m
  if (digits.includes(':')) {
    const [a, b] = digits.split(':')
    h = Number(a); m = Number(b || 0)
  } else if (digits.length <= 2) {
    h = Number(digits); m = 0
  } else {
    h = Number(digits.slice(0, digits.length - 2)); m = Number(digits.slice(-2))
  }
  if (!digits || !Number.isFinite(h) || h < 1 || h > 12 || m > 59) return ''
  if (ap === 'AM') h = h === 12 ? 0 : h
  else h = h === 12 ? 12 : h + 12
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

// "13:05" -> { text: '1:05', ap: 'PM' }
export function to12(hhmm) {
  if (!hhmm) return { text: '', ap: 'PM' }
  const [h, m] = hhmm.split(':').map(Number)
  const ap = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return { text: `${h12}:${String(m).padStart(2, '0')}`, ap }
}

// TAGS: events and sections are lists. Old shifts saved them as plain text.
export const tagList = (v) => (Array.isArray(v) ? v : v ? [v] : [])

// JOB DEFAULTS: what "Not sure, use the default" picks.
export function newJob(name = 'My job') {
  return {
    id: uid(),
    name,
    archived: false,
    setupDone: false,
    roles: [
      { id: uid(), name: 'Server', wage: 2.13 },
    ],
    tipsRule: 'cash', // 'cash' = I receive cash at the end of the night for all my credit card tips, 'paycheck' = tips paid on a schedule
    cardTipsRule: 'weekly', // 'weekly' | 'biweekly' | 'semimonthly' | 'monthly' | 'withPaycheck'
    cardTipsStartDate: '',
    cardTipsWeekday: 3, // Wednesday
    cardTipsNote: '',
    hoursFormat: 'decimal', // 'decimal' (6.5) | 'hm' (6 h 30 m)
    weekStart: 1, // Monday
    wageSchedule: 'semimonthly', // 'weekly' | 'biweekly' | 'semimonthly' | 'monthly'
    wageStartDate: '',
    wageLagDays: 0,
    salesType: 'net',
    tipSplit: 'own', // 'own' | 'pool' | 'other'
    weeklyGoal: 0,
    nudge: true,
    trackAutoGrat: false,
    tipOuts: [], // people I tip out: { id, name, method: 'tips' | 'sales' | 'flat', amount }
    shiftTimes: structuredClone(DEFAULT_SHIFT_TIMES),
  }
}

const EMPTY = {
  jobs: [],
  shifts: [],
  regulars: [],
  paychecks: [],
  timeOff: [],
  feedback: {},
  tags: { events: [], section: [] },
  prefs: { theme: 'auto', largeText: false },
  last: { jobId: null, roleId: null, useWage: false },
}

// MIGRATE: fills in anything an older save is missing, so old backups keep working
// as the app grows. Never removes anything.
export function migrate(data) {
  const base = structuredClone(EMPTY)
  const s = { ...base, ...data }
  s.prefs = { ...base.prefs, ...(data.prefs || {}) }
  s.last = { ...base.last, ...(data.last || {}) }
  s.tags = { ...base.tags, ...(data.tags || {}) }
  s.jobs = (data.jobs || []).map((j) => ({ ...newJob(), ...j }))
  return s
}

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return structuredClone(EMPTY)
    return migrate(JSON.parse(raw))
  } catch {
    return structuredClone(EMPTY)
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // Storage full or blocked: the app keeps working for this visit.
  }
}

export function eraseAll() {
  try { localStorage.removeItem(KEY) } catch {}
  return structuredClone(EMPTY)
}

// ---------- DATES (all dates are "YYYY-MM-DD" in your own time zone) ----------

export const toDate = (s) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}
export const toStr = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
export const today = () => toStr(new Date())
export const addDays = (s, n) => {
  const d = toDate(s)
  d.setDate(d.getDate() + n)
  return toStr(d)
}
export const prettyDate = (s) =>
  toDate(s).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })

// WEEK: the 7 days containing a date, using the job's week start day.
export function weekRange(dateStr, weekStart = 1) {
  const day = toDate(dateStr).getDay()
  const back = (day - weekStart + 7) % 7
  const start = addDays(dateStr, -back)
  return { start, end: addDays(start, 6) }
}

export const inRange = (d, r) => d >= r.start && d <= r.end

// PAY PERIOD that contains a date, for any pay schedule.
// anchor = first day of any 2-week period (only used for every 2 weeks).
export function periodFor(schedule, anchor, weekStart, dateStr) {
  const d = toDate(dateStr)
  switch (schedule) {
    case 'weekly':
      return weekRange(dateStr, weekStart)
    case 'biweekly': {
      const a = anchor || '2026-01-05'
      const diff = Math.round((toDate(dateStr) - toDate(a)) / 86400000)
      const k = Math.floor(diff / 14)
      const start = addDays(a, k * 14)
      return { start, end: addDays(start, 13) }
    }
    case 'monthly': {
      const start = toStr(new Date(d.getFullYear(), d.getMonth(), 1))
      const end = toStr(new Date(d.getFullYear(), d.getMonth() + 1, 0))
      return { start, end }
    }
    default: {
      // twice a month: 1st to 15th, 16th to end of month
      if (d.getDate() <= 15) {
        return {
          start: toStr(new Date(d.getFullYear(), d.getMonth(), 1)),
          end: toStr(new Date(d.getFullYear(), d.getMonth(), 15)),
        }
      }
      return {
        start: toStr(new Date(d.getFullYear(), d.getMonth(), 16)),
        end: toStr(new Date(d.getFullYear(), d.getMonth() + 1, 0)),
      }
    }
  }
}

// HOURLY WAGE PAY PERIOD that contains a date.
export const wagePeriod = (job, dateStr) =>
  periodFor(job.wageSchedule, job.wageStartDate, job.weekStart, dateStr)

// PAYCHECK TIP PERIOD: which shifts a paycheck of tips should cover.
// With my hourly wage: the last hourly wage period that ended at least "lag" days before pay day.
// Any other schedule: the last full period (same choices as hourly wage) that ended before pay day.
export function paycheckPeriod(job, payDate) {
  if (job.cardTipsRule === 'withPaycheck') {
    const target = addDays(payDate, -(Number(job.wageLagDays) || 0))
    let p = wagePeriod(job, target)
    if (p.end > target) p = wagePeriod(job, addDays(p.start, -1))
    return p
  }
  const schedule = ['biweekly', 'semimonthly', 'monthly'].includes(job.cardTipsRule) ? job.cardTipsRule : 'weekly'
  const target = addDays(payDate, -1)
  let p = periodFor(schedule, job.cardTipsStartDate, job.weekStart, target)
  if (p.end > target) p = periodFor(schedule, job.cardTipsStartDate, job.weekStart, addDays(p.start, -1))
  return p
}

// ---------- MONEY MATH ----------

export const num = (v) => {
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : 0
}
export const money = (n) =>
  (n < 0 ? '-$' : '$') + Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// General tips = a total from a brain dump when you didn't know the cash/card split.
export const shiftTips = (s) => num(s.cash) + num(s.card) + num(s.autoGrat) + num(s.general)

export const shiftWagePay = (s) => (s.useWage ? num(s.wage) * num(s.hours) : 0)
export const tipsPerHour = (s) => (num(s.hours) > 0 ? shiftTips(s) / num(s.hours) : 0)
export const perHourWithWage = (s) =>
  num(s.hours) > 0 ? (shiftTips(s) + shiftWagePay(s)) / num(s.hours) : 0

// Hours worked from start and end times ("HH:MM"), including past midnight.
export function hoursFromTimes(start, end) {
  if (!start || !end) return 0
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  let mins = eh * 60 + em - (sh * 60 + sm)
  if (mins <= 0) mins += 24 * 60
  return Math.round((mins / 60) * 100) / 100
}

export const fmtHours = (h, format) => {
  if (format === 'hm') {
    const whole = Math.floor(h)
    const mins = Math.round((h - whole) * 60)
    return `${whole}h ${mins}m`
  }
  return `${Math.round(h * 100) / 100}h`
}

// WEEKLY GOAL: shrinks with days off (if the job says so).
export function daysOffIn(state, jobId, range) {
  const days = new Set()
  for (const t of state.timeOff) {
    if (t.jobId !== jobId) continue
    let d = t.start
    while (d <= t.end) {
      if (inRange(d, range)) days.add(d)
      d = addDays(d, 1)
    }
  }
  return days.size
}

export function weekProgress(state, job, dateStr) {
  const range = weekRange(dateStr, job.weekStart)
  const shifts = state.shifts.filter((s) => s.jobId === job.id && inRange(s.date, range))
  const tips = shifts.reduce((a, s) => a + shiftTips(s), 0)
  const off = daysOffIn(state, job.id, range)
  const base = num(job.weeklyGoal)
  const goal = base // time off no longer shrinks the goal
  return { range, tips, goal, off, shifts: shifts.length }
}

// CSV EXPORT
export function toCSV(rows) {
  const esc = (v) => {
    const s = v == null ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return rows.map((r) => r.map(esc).join(',')).join('\n')
}

export function download(filename, text, type = 'text/csv') {
  const blob = new Blob([text], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

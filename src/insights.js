// INSIGHTS: the three "stand out" features, all worked out from your own shifts.
// Nothing leaves this device. Needs no setup.
import { num, tipsPerHour, shiftTips, toDate, weekRange, inRange, addDays, WEEKDAYS, money, tagList } from './store.js'

const avg = (list) => (list.length ? list.reduce((a, b) => a + b, 0) / list.length : 0)

// FEATURE 1: SHIFT WRAPPED. Fun, never shaming lines about the shift you just logged.
export function shiftWrapped(state, shift) {
  const lines = []
  const others = state.shifts.filter((s) => s.id !== shift.id && s.jobId === shift.jobId && num(s.hours) > 0)
  const tph = tipsPerHour(shift)

  if (others.length >= 2) {
    const best = Math.max(...others.map(tipsPerHour))
    if (tph > best) lines.push({ icon: 'Fire', text: `New personal best: ${money(tph)}/hr. Your old best was ${money(best)}/hr.` })
  }

  const day = toDate(shift.date).getDay()
  const sameDay = others.filter((s) => toDate(s.date).getDay() === day).map(tipsPerHour)
  if (sameDay.length >= 2 && tph > avg(sameDay)) {
    lines.push({ icon: 'TrendUp', text: `You beat your usual ${WEEKDAYS[day]} by ${money(tph - avg(sameDay))}/hr.` })
  }

  const wk = weekRange(shift.date, state.jobs.find((j) => j.id === shift.jobId)?.weekStart ?? 1)
  const prev = { start: addDays(wk.start, -7), end: addDays(wk.end, -7) }
  const sum = (r) => state.shifts.filter((s) => s.jobId === shift.jobId && inRange(s.date, r)).reduce((a, s) => a + shiftTips(s), 0)
  const thisWeek = sum(wk)
  const lastWeek = sum(prev)
  if (lastWeek > 0 && thisWeek > lastWeek) {
    lines.push({ icon: 'Rocket', text: `This week is already ${money(thisWeek - lastWeek)} ahead of all of last week.` })
  }

  const month = shift.date.slice(0, 7)
  const n = state.shifts.filter((s) => s.jobId === shift.jobId && s.date.startsWith(month)).length
  lines.push({ icon: 'CheckCircle', text: `Shift #${n} logged this month. Nice work showing up.` })
  return lines.slice(0, 3)
}

// FEATURE 2: YOUR PATTERNS. What makes a good shift, once you have 5 shifts.
export const PATTERN_MIN = 5

export function patterns(state) {
  const shifts = state.shifts.filter((s) => num(s.hours) > 0)
  if (shifts.length < PATTERN_MIN) return { ready: false, have: shifts.length, lines: [] }
  const overall = avg(shifts.map(tipsPerHour))

  const dimensions = [
    ['weekday', (s) => [WEEKDAYS[toDate(s.date).getDay()]], (k) => `${k}s`],
    ['shift type', (s) => s.shiftType || [], (k) => `${k} shifts`],
    ['weather', (s) => (s.weather ? [s.weather] : []), (k) => `${k.toLowerCase()} days`],
    ['event', (s) => tagList(s.events), (k) => `shifts with ${k}`],
    ['section', (s) => tagList(s.section), (k) => `the ${k} section`],
  ]

  const lines = []
  for (const [name, getKeys, label] of dimensions) {
    const groups = {}
    for (const s of shifts) for (const k of getKeys(s)) (groups[k] = groups[k] || []).push(tipsPerHour(s))
    const ranked = Object.entries(groups)
      .filter(([, v]) => v.length >= 2)
      .map(([k, v]) => ({ k, n: v.length, avg: avg(v) }))
      .sort((a, b) => b.avg - a.avg)
    if (ranked.length < 2 && !(ranked.length === 1 && ranked[0].avg > overall)) continue
    const top = ranked[0]
    if (top.avg - overall >= 0.5) {
      lines.push({
        key: name,
        text: `Your best ${name}: ${label(top.k)}. ${money(top.avg)}/hr, which is ${money(top.avg - overall)}/hr above your average (${top.n} shifts).`,
        diff: top.avg - overall,
      })
    }
  }
  lines.sort((a, b) => b.diff - a.diff)
  return { ready: true, have: shifts.length, overall, lines: lines.slice(0, 3) }
}

// FEATURE 3: LUCKY REGULARS. Tips per hour on shifts where you saw each regular.
export function regularStats(state, regularId) {
  const seen = state.shifts.filter((s) => (s.regularsSeen || []).includes(regularId) && num(s.hours) > 0)
  const all = state.shifts.filter((s) => num(s.hours) > 0)
  if (!seen.length) return null
  const mine = avg(seen.map(tipsPerHour))
  const rest = avg(all.filter((s) => !seen.includes(s)).map(tipsPerHour))
  return { n: seen.length, avg: mine, diff: all.length > seen.length ? mine - rest : null }
}

// FEATURE 5: WEEK FORECAST. "On pace for $X this week", from what you made so far plus
// your usual tips on each day left (last 8 weeks, skipping days off).
// Needs 2 past weeks of shifts at this job.
export function weekForecast(state, job, dateStr) {
  const range = weekRange(dateStr, job.weekStart)
  const since = addDays(range.start, -56)
  const past = state.shifts.filter((s) => s.jobId === job.id && s.date < range.start && s.date >= since)
  const weeks = new Set(past.map((s) => weekRange(s.date, job.weekStart).start)).size
  if (weeks < 2) return null
  const mine = state.shifts.filter((s) => s.jobId === job.id && inRange(s.date, range))
  const soFar = mine.reduce((a, s) => a + shiftTips(s), 0)
  const off = (d) => state.timeOff.some((t) => t.jobId === job.id && d >= t.start && d <= t.end)
  let expected = 0
  let best = null
  for (let d = addDays(dateStr, 1); d <= range.end; d = addDays(d, 1)) {
    if (off(d) || mine.some((s) => s.date === d)) continue
    const wd = toDate(d).getDay()
    const same = past.filter((s) => toDate(s.date).getDay() === wd)
    const total = same.reduce((a, s) => a + shiftTips(s), 0)
    expected += total / weeks // pace counts weeks you didn't work that day as $0
    const daysWorked = new Set(same.map((s) => s.date)).size
    const whenWorked = daysWorked ? total / daysWorked : 0 // what that day pays when you do work it
    if (whenWorked > 0 && (!best || whenWorked > best.amount)) best = { day: WEEKDAYS[wd], amount: whenWorked }
  }
  return { pace: soFar + expected, soFar, best }
}

// FEATURE 6: PRE-SHIFT GAME PLAN. Before you clock in: what this weekday usually pays,
// your best section on this day, and which regulars tend to come in (with their usual order).
// Needs 2 past shifts on the same weekday at this job.
export function gamePlan(state, job, dateStr) {
  const wd = toDate(dateStr).getDay()
  const past = state.shifts.filter((s) => s.jobId === job.id && s.date < dateStr && toDate(s.date).getDay() === wd)
  if (past.length < 2) return null
  const worked = past.filter((s) => num(s.hours) > 0)
  const bySection = {}
  for (const s of worked) for (const t of tagList(s.section)) (bySection[t] = bySection[t] || []).push(tipsPerHour(s))
  const sections = Object.entries(bySection).filter(([, v]) => v.length >= 2).map(([name, v]) => ({ name, tph: avg(v) }))
  const section = sections.sort((a, b) => b.tph - a.tph)[0] || null
  const regulars = state.regulars
    .map((r) => ({ ...r, times: past.filter((s) => (s.regularsSeen || []).includes(r.id)).length }))
    .filter((r) => r.times >= 2 && r.times / past.length >= 0.4)
    .sort((a, b) => b.times - a.times)
  return {
    day: WEEKDAYS[wd], n: past.length,
    avgTips: avg(past.map(shiftTips)), avgTph: avg(worked.map(tipsPerHour)),
    section, regulars,
  }
}

// FEATURE 7: CHECKOUT DOUBLE-CHECK. Compares this shift's tips as a % of sales with your usual.
// A big drop often means a card tip left off, a tip-out taken twice or a missed auto-gratuity.
// Needs sales on this shift and on 3 other shifts at this job.
export function checkoutCheck(state, shift) {
  if (!(num(shift.sales) > 0)) return null
  const pct = (shiftTips(shift) / num(shift.sales)) * 100
  const others = state.shifts.filter((s) => s.id !== shift.id && s.jobId === shift.jobId && num(s.sales) > 0)
  if (others.length < 3) return { pct, usual: null, low: false }
  const usual = avg(others.map((s) => (shiftTips(s) / num(s.sales)) * 100))
  return { pct, usual, low: pct < usual - 3 }
}

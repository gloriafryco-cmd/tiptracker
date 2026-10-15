// BRAIN DUMP: turns one messy sentence about a shift into Quick Add fields.
// Example: "I worked from 7-10 made 20 cash and 300 credit card tips I saw Roger
// and my sales were 1000 it was sunny out 5 star shift".
// Works with typing or with the microphone. Nothing is saved from here: it only
// returns what it understood, and the app shows it to you first.
import {
  addDays, today, toDate, prettyDate, hoursFromTimes, to12, tagList, DEFAULT_SHIFT_TIMES,
} from './store.js'

const NUM = '(\\d+(?:\\.\\d+)?)'
const CARD = '(?:credit\\s*card|credit|cards?|cc)'
const CASH = '(?:cash|c(?!c))' // shorthand: c = cash, cc = credit card
const HOURS = '(?:hours?|hrs?)'
const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
const WORD_NUM = { one: 1, two: 2, three: 3, four: 4, five: 5 }
const NOT_NAMES = new Set([
  'the', 'a', 'an', 'my', 'some', 'lots', 'many', 'no', 'nobody', 'everyone', 'all', 'it', 'and',
  'but', 'then', 'a', 'few', 'several', 'two', 'three', 'one', 'sales', 'cash', 'card', 'tips',
])
const EVENT_WORDS = ['trivia', 'bingo', 'karaoke', 'live music', 'happy hour', 'game night', 'the game']

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const hasWord = (t, w) => new RegExp(`(^|[^a-z])${esc(w.toLowerCase())}($|[^a-z])`).test(t)
const hhmm = (h, m) => `${String(h).padStart(2, '0')}:${String(m || 0).padStart(2, '0')}`

// Take a number out of the working text so it can never be used twice.
function take(w, re) {
  const m = w.s.match(re)
  if (!m) return null
  w.s = w.s.slice(0, m.index) + ' '.repeat(m[0].length) + w.s.slice(m.index + m[0].length)
  return Number(m[1])
}
const fwd = (kind) => new RegExp(`${NUM}\\s*(?:dollars?|bucks)?\\s*(?:in|of|on)?\\s*(?:my\\s*)?${kind}\\b`)
const back = (kind) => new RegExp(`\\b${kind}\\s*(?:tips?|total)?\\s*(?:was|were|is|of|at|came\\s*to|:|=)?\\s*${NUM}`)
const either = (w, kind, backFirst) => {
  const a = backFirst ? back(kind) : fwd(kind)
  const b = backFirst ? fwd(kind) : back(kind)
  return take(w, a) ?? take(w, b)
}

// "7-10", "from 7 to 10", "7am-3pm". Guesses AM or PM when you don't say.
const TIME_RANGE = /(?<![\d.:])(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?|a\b|p\b)?\s*(?:-|–|—|to|until|till)\s*(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?|a\b|p\b)?(?![\d:.])(?!\s*(?:hours?|hrs?|dollars|bucks|cash|card|in\b|star))/

// "7a 9p" with only a space between: both times must say a/am or p/pm.
const TIME_PAIR = /(?<![\d.:])(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?|a\b|p\b)\s+(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?|a\b|p\b)/

function resolveTimes(m, hint) {
  const [, h1s, m1, a1, h2s, m2, a2] = m
  const h1 = Number(h1s), h2 = Number(h2s)
  if (h1 > 23 || h2 > 23 || Number(m1 || 0) > 59 || Number(m2 || 0) > 59) return null
  if (h1 > 12 || h2 > 12 || h1 === 0 || h2 === 0) return { start: hhmm(h1, m1), end: hhmm(h2, m2), guessed: false }
  const ap1 = a1 && a1[0], ap2 = a2 && a2[0]
  const mod = (h) => h % 12
  let s, e
  if (ap1 && ap2) { s = ap1; e = ap2 }
  else if (ap2) { e = ap2; s = mod(h1) > mod(h2) ? (ap2 === 'p' ? 'a' : 'p') : ap2 }
  else if (ap1) { s = ap1; e = mod(h2) <= mod(h1) ? (ap1 === 'p' ? 'a' : 'p') : ap1 }
  else if (hint === 'am') { s = 'a'; e = mod(h2) <= mod(h1) ? 'p' : 'a' }
  else if (mod(h1) > mod(h2)) { s = 'a'; e = 'p' } // "7-3" reads as 7 AM to 3 PM
  else { s = 'p'; e = 'p' }
  const to24 = (h, ap) => (h % 12) + (ap === 'p' ? 12 : 0)
  return { start: hhmm(to24(h1, s), m1), end: hhmm(to24(h2, e), m2), guessed: !(ap1 || ap2), raw: { h1, m1: Number(m1 || 0), h2, m2: Number(m2 || 0) } }
}

function findDate(t) {
  if (/\b(yesterday|last night)\b/.test(t)) return addDays(today(), -1)
  const ago = t.match(/\b(\d+)\s+days?\s+ago\b/)
  if (ago) return addDays(today(), -Number(ago[1]))
  const wd = t.match(/\b(last\s+|on\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/)
  if (wd) {
    const diff = (toDate(today()).getDay() - DAYS.indexOf(wd[2]) + 7) % 7
    return addDays(today(), -(diff === 0 && wd[1]?.trim() === 'last' ? 7 : diff))
  }
  const md = t.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/)
  if (md && Number(md[1]) <= 12 && Number(md[2]) <= 31) {
    const y = md[3] ? (md[3].length === 2 ? 2000 + Number(md[3]) : Number(md[3])) : new Date().getFullYear()
    return `${y}-${String(md[1]).padStart(2, '0')}-${String(md[2]).padStart(2, '0')}`
  }
  return null
}

// MAIN: returns { patch, found, guessedTimes, unsorted, ampm, unknown }
//   ampm = times typed without AM/PM (asked in a pop-up), unknown = numbers it couldn't place.
//   unsorted = a tip total that didn't say card or cash.
//   patch = form fields to fill in, found = plain-words list of what was understood.
export function parseShiftDump(input, state, defaultJob) {
  const original = String(input)
  let t = original.toLowerCase().replace(/[$,]/g, '')
  t = t.replace(/(\d+)\s+and\s+a\s+half/g, '$1.5')
  const patch = {}
  const found = []
  let guessedTimes = false

  // JOB AND POSITION (only when you have a choice)
  let job = defaultJob
  const jobs = state.jobs.filter((j) => !j.archived)
  const jobHit = jobs.length > 1 && jobs.find((j) => hasWord(t, j.name))
  if (jobHit) { job = jobHit; patch.jobId = jobHit.id; patch.roleId = jobHit.roles[0]?.id; found.push(`Job: ${jobHit.name}`) }
  if (job && job.roles.length > 1) {
    const r = job.roles.find((x) => hasWord(t, x.name))
    if (r) { patch.roleId = r.id; found.push(`Position: ${r.name}`) }
  }

  // DATE
  const date = findDate(t)
  if (date) { patch.date = date; found.push(`Date: ${prettyDate(date)}`) }

  // SHIFT TYPE
  const types = []
  if (/\b(breakfast|brunch)\b/.test(t)) types.push('Breakfast')
  if (/\blunch\b/.test(t)) types.push('Lunch')
  if (/\b(dinner|supper)\b/.test(t)) types.push('Dinner')
  if (/\blate[ -]night\b/.test(t)) types.push('Late night')
  if (/\b(private party|banquet|wedding|event shift)\b/.test(t)) types.push('Event / private party')
  if (/\bdouble\b/.test(t)) types.push('Double')
  if (types.length) { patch.shiftType = types; found.push(`Shift type: ${types.join(', ')}`) }

  const w = { s: t }
  // Numbers that belong to dates and sections are used up first, so they never get asked about.
  for (const re of [/\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/g, /\b\d+\s+days?\s+ago\b/g, /\b(?:section|station)\s+\w+/g]) {
    w.s = w.s.replace(re, (m) => ' '.repeat(m.length))
  }

  // TIMES
  const hint = types.includes('Breakfast') ? 'am' : ''
  const tm = w.s.match(TIME_RANGE) || w.s.match(TIME_PAIR)
  const times = tm && resolveTimes(tm, hint)
  if (times) {
    w.s = w.s.slice(0, tm.index) + ' '.repeat(tm[0].length) + w.s.slice(tm.index + tm[0].length)
    Object.assign(patch, { useTimes: true, start: times.start, end: times.end })
    guessedTimes = times.guessed
  }

  // VIBE: "5 star shift", "four stars", "vibe 4", "4 out of 5"
  let vibe = take(w, /\b([1-5])\s*[- ]?stars?\b/) ?? take(w, /\b([1-5])\s*(?:out of|\/)\s*5\b/) ?? take(w, /\bvibe\s*(?:was|of|:)?\s*([1-5])\b/)
  if (vibe == null) {
    const m = w.s.match(/\b(one|two|three|four|five)[- ]stars?\b/)
    if (m) vibe = WORD_NUM[m[1]]
  }
  if (vibe != null) { patch.vibe = vibe; found.push(`Shift vibe: ${vibe} of 5`) }

  // MONEY AND COUNTS (tip out and sales first, so their numbers are used up)
  const tipOut = take(w, new RegExp(`(?:tipped\\s*out|tip\\s*out|tipout|tips?\\s*out)\\s*(?:was|were|is|of|at|:)?\\s*(?:about\\s*)?${NUM}`))
    ?? take(w, new RegExp(`${NUM}\\s*(?:dollars?|bucks)?\\s*(?:in|for)?\\s*(?:tip\\s*out|tipout|tipped\\s*out)`))
  const sales = either(w, '(?:sales|sold|revenue)', true)
  const covers = take(w, new RegExp(`${NUM}\\s*(?:covers|guests|customers|tables)\\b`)) ?? take(w, new RegExp(`\\bcovers\\s*(?:was|were|is|:)?\\s*${NUM}`))

  // WORD-FIRST ("card 100, cash 50") or NUMBER-FIRST ("100 card, 50 cash"): decided once.
  const digit = w.s.search(/\d/)
  const word = w.s.search(/card|credit|cc|cash|hour|hrs?/)
  const backFirst = word !== -1 && digit !== -1 && word < digit
  const card = either(w, CARD, backFirst)
  const cash = either(w, CASH, backFirst)
  // A total with no card or cash word ("I made 250.23") is asked about after the brain dump.
  const unsorted = card == null && cash == null
    ? take(w, new RegExp(`\\b(?:made|make|got|earned|pulled|walked\\s*(?:out|away)\\s*with|took\\s*home)\\s*(?:about\\s*|like\\s*)?${NUM}`))
      ?? take(w, new RegExp(`${NUM}\\s*(?:dollars?|bucks)?\\s*(?:in\\s*)?tips?\\b`))
    : null
  let hours = times ? null : either(w, HOURS, backFirst)
  if (hours == null && !times) hours = take(w, new RegExp(`\\bworked\\s+${NUM}\\b(?!\\s*(?:am|pm|:))`))

  if (card != null) { patch.card = String(card); found.push(`Card tips: $${card}`) }
  if (cash != null) { patch.cash = String(cash); found.push(`Cash tips: $${cash}`) }
  if (sales != null) { patch.sales = String(sales); found.push(`Sales: $${sales}`) }
  if (covers != null) { patch.covers = String(covers); found.push(`Covers: ${covers}`) }
  if (tipOut != null) { patch.tipOut = String(tipOut); found.push(`Tipped out: $${tipOut}`) }

  // HOURS: from the times, from a number, or (as a guess) from the shift type's usual hours
  if (times) {
    const h = hoursFromTimes(times.start, times.end)
    const a = to12(times.start), b = to12(times.end)
    found.push(`Hours: ${h} (${a.text} ${a.ap} to ${b.text} ${b.ap}${times.guessed ? ', AM/PM guessed' : ''})`)
    patch.hours = String(h)
  } else if (hours != null) {
    patch.hours = String(hours)
    found.push(`Hours: ${hours}`)
  } else if (types.length && job) {
    const tt = types.map((x) => (job.shiftTimes || DEFAULT_SHIFT_TIMES)[x]).find(Boolean)
    if (tt) {
      Object.assign(patch, { useTimes: true, start: tt.start, end: tt.end })
      guessedTimes = true
      const a = to12(tt.start), b = to12(tt.end)
      found.push(`Hours: ${hoursFromTimes(tt.start, tt.end)} (usual ${types[0]} hours, ${a.text} ${a.ap} to ${b.text} ${b.ap})`)
    }
  }
  if (patch.hours != null) {
    const h = Number(patch.hours)
    Object.assign(patch, { hh: String(Math.floor(h)), mm: String(Math.round((h % 1) * 60)) })
  }

  // WEATHER
  const weather = /\b(sunny|sun)\b/.test(t) ? 'Sunny'
    : /\bcloud/.test(t) ? 'Cloudy'
    : /\b(rain|rainy|raining|stormy)\b/.test(t) ? 'Rainy'
    : /\bsnow/.test(t) ? 'Snowy'
    : /\b(hot|heat wave|scorching)\b/.test(t) ? 'Hot'
    : /\b(cold|freezing|chilly)\b/.test(t) ? 'Cold' : ''
  if (weather) { patch.weather = weather; found.push(`Weather: ${weather}`) }

  // EVENTS AND SECTION: tags you already use, plus a few common ones
  const savedEvents = [...new Set([...(state.tags?.events || []), ...state.shifts.flatMap((s) => tagList(s.events))])]
  const events = [...new Set([...savedEvents, ...EVENT_WORDS.map((e) => e[0].toUpperCase() + e.slice(1))])].filter((e) => hasWord(t, e))
  if (events.length) { patch.events = events; found.push(`Events: ${events.join(', ')}`) }
  const savedSections = [...new Set([...(state.tags?.section || []), ...state.shifts.flatMap((s) => tagList(s.section))])]
  const sections = savedSections.filter((e) => hasWord(t, e))
  const sm = t.match(/\b(?:section|station)\s+(\w+)/)
  if (sm) { const label = `Section ${sm[1]}`; if (!sections.some((x) => x.toLowerCase() === label.toLowerCase())) sections.push(label) }
  if (sections.length) { patch.section = sections; found.push(`Section: ${sections.join(', ')}`) }

  // REGULARS: names you already saved, plus "saw Roger" for new ones
  const seen = state.regulars.filter((r) => hasWord(t, r.name))
  const newNames = []
  const sawRe = /\b(?:saw|seen|had|came in)\s+((?:[A-Z][a-z]+)(?:\s*(?:,|and|&)\s*(?:[A-Z][a-z]+))*)/g
  for (const m of original.matchAll(sawRe)) {
    for (const n of m[1].split(/\s*(?:,|and|&)\s*/)) {
      const name = n.trim()
      if (!name || NOT_NAMES.has(name.toLowerCase())) continue
      if (!state.regulars.some((r) => r.name.toLowerCase() === name.toLowerCase()) && !newNames.includes(name)) newNames.push(name)
    }
  }
  if (seen.length || newNames.length) {
    patch.regularsSeen = seen.map((r) => r.id)
    patch.newRegulars = newNames
    found.push(`Regulars: ${[...seen.map((r) => r.name), ...newNames.map((n) => `${n} (new)`)].join(', ')}`)
  }

  // AM/PM not said: ask. A big leftover number (20 or more) could be sales or tips: ask.
  // Small leftovers are skipped quietly.
  const ampm = times && times.guessed ? times.raw : null
  const unknown = [...w.s.matchAll(/(?<![\w.])\d+(?:\.\d+)?/g)].filter((m) => Number(m[0]) >= 20).map((m) => ({
    n: Number(m[0]),
    context: t.slice(Math.max(0, m.index - 25), m.index + m[0].length + 25).trim(),
  }))
  return { patch, found, guessedTimes: guessedTimes && !ampm, unsorted, ampm, unknown }
}

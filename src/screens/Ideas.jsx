import { useState } from 'react'

// IDEAS TAB: every new idea as a card, with a reaction and a feedback box.
// Cards marked "Preview" are NOT working features. They only show the idea.
// Your reactions and notes save in this browser (state.feedback).

const IDEAS = [
  // ---------- IN THE APP / V1 ----------
  { id: 'S6', group: 'v1', status: 'In the app', title: 'Export for pay disputes',
    text: 'Download your shifts for any date range as a spreadsheet, to show a manager. Try it: History tab, "Export shifts (tip proof)".' },
  { id: 'W1', group: 'v1', status: 'In the app', title: 'Start and end times, hours worked out for you',
    text: 'Works past midnight. Try it: Quick Add screen 1, "Use start and end times instead".' },
  { id: 'J6a', group: 'v1', status: 'In the app', title: 'Shifts with $0 tips still count',
    text: 'Hourly-only and manager shifts save fine. Enter hours, leave tips empty. Other apps got this wrong.' },
  { id: 'NOTE', group: 'v1', status: 'In the app', title: 'Plain text note on a shift',
    text: 'Quick Add screen 3 has a note box. Question: keep it there, or does it need to be faster to reach?' },
  { id: 'S3', group: 'v1', status: 'Planned for v1', title: 'Smart reminders',
    text: 'Daily reminder off by default, skips days you logged or marked off, with "Log tips" and "Day off" buttons. Needs the phone app, so it is not in this web version.' },
  { id: 'J5', group: 'v1', status: 'Planned for v1', title: 'How your tip-out was calculated, plus manual override',
    text: 'One plain line explaining the math, and a way to type your own number. Lives in the Toolbox, which is on hold.' },
  { id: 'W6', group: 'v1', status: 'Decided', title: 'Basic logging free forever',
    text: 'Free = up to 2 workplaces plus full shift logging, tip-out math, Regulars and basic History export.' },

  // ---------- AFTER V1 ----------
  { id: 'T1', group: 'later', status: 'Preview, not built', title: 'Import from other apps, with undo',
    text: 'Switching from another tip app? Bring your shifts over in one step, and undo it if it looks wrong. Decided: this is FREE.' },
  { id: 'T3', group: 'later', status: 'Preview, not built', title: 'Yearly report (PDF or spreadsheet)',
    text: 'One file with your whole year by workplace. Paid keeper tool.' },
  { id: 'PHOTO', group: 'later', status: 'Preview, not built', title: 'Photos: pay stub, checkout slip, shift memo',
    text: 'Attach a photo to a paycheck or a shift. Waits on the storage decision near launch.' },
  { id: 'S1', group: 'later', status: 'Preview, not built', title: 'Projected month so far',
    text: 'Based on your own history: "On track for about $X this month." Needs a few weeks of real shifts.' },
  { id: 'S2', group: 'later', status: 'Preview, not built', title: 'What an extra shift is worth',
    text: 'Pairs with the pick-up-a-shift nudge: "A Friday dinner usually adds about $X for you."' },
  { id: 'S5', group: 'later', status: 'Preview, not built', title: 'Compare shift vs shift, role vs role',
    text: 'Side by side: lunch vs dinner, server vs bartender.' },
  { id: 'W2', group: 'later', status: 'Preview, not built', title: 'Smart shift times',
    text: 'Default start and end per workplace, and suggestions from your recent shifts. (Merges two of your ideas.)' },
  { id: 'J1', group: 'later', status: 'Preview, not built', title: 'Best day and AM vs PM report',
    text: 'Which weekday and which half of the day pays you best. Needs shift types plus history.' },
  { id: 'J2', group: 'later', status: 'Preview, not built', title: 'Section heat map',
    text: 'Which section or station earns the most. Uses the section box on Quick Add screen 3.' },
  { id: 'J3', group: 'later', status: 'Preview, not built', title: 'Search past shifts',
    text: 'Find a shift by note, event, regular or section.' },
  { id: 'W3', group: 'later', status: 'Preview, not built', title: 'App lock (Face ID)',
    text: 'Not possible on the web version. Comes with the phone app.' },
  { id: 'J6b', group: 'later', status: 'Preview, not built', title: 'Backup and restore point',
    text: 'Must be done before launch. Basic backup and restore stays free.' },

  // ---------- PAID KEEPER TOOLS ----------
  { id: 'P1', group: 'paid', status: 'Preview, not built', title: 'What makes a good shift',
    text: 'Links weather, weekday, shift type, events, vibe and regulars to tips per hour. Example: "Friday dinners with a game on average $8/hr more." Nobody else has this.' },
  { id: 'P2', group: 'paid', status: 'Preview, not built', title: 'Was I paid right? (wage check)',
    text: 'Hours times each role\'s rate for the pay period, compared with your check. Difference shown with no judgment, plus a note box.' },
  { id: 'P3', group: 'paid', status: 'Preview, not built', title: 'Pick-up-a-shift coach',
    text: 'Which weekday and shift type pays best for you, and how many shifts hit your goal.' },
  { id: 'P4', group: 'paid', status: 'Preview, not built', title: 'Menu Master and Study',
    text: 'Flashcards for your restaurant\'s menu, specials and wine list.' },
  { id: 'P5', group: 'paid', status: 'Preview, not built', title: 'Bills and goal jars',
    text: '"Tips to rent": jars for rent, a trip, bills, and expected tips vs what is due.' },
  { id: 'P6', group: 'paid', status: 'Preview, not built', title: 'Tax-time pack',
    text: 'Yearly tips summary by workplace and the No Tax on Tips total. Facts only, no tax advice.' },
  { id: 'P7', group: 'paid', status: 'Preview, not built', title: 'Widget, lock screen and Apple Watch quick add',
    text: 'Phone app only.' },
  { id: 'P8', group: 'paid', status: 'Preview, not built', title: 'Sync across devices',
    text: 'Phone and iPad stay in step. Backup stays free; syncing is paid.' },
  { id: 'P9', group: 'paid', status: 'Preview, not built', title: 'Regulars Pro',
    text: '"Who might come in this week": birthdays and usual shifts as a private reminder. Needs a privacy check first.' },

  // ---------- DECISIONS TO REACT TO ----------
  { id: 'D1', group: 'decide', status: 'Decided', title: 'Free tier: 2 workplaces',
    text: 'Free forever: 2 workplaces and full logging. A 3rd active workplace asks "upgrade, or archive one?" Nothing is ever deleted or hidden.' },
  { id: 'D2', group: 'decide', status: 'Decided', title: 'Price: $29.99/yr or $3.99/mo',
    text: 'Plus a one-time lifetime plan around $59.99 at launch only. All prices are guesses to test in your coworker talks.' },
  { id: 'D3', group: 'decide', status: 'Decided', title: '14 days of paid extras free',
    text: 'After 14 days only the extras lock. Everything you logged stays visible.' },
  { id: 'D4', group: 'decide', status: 'Decided', title: 'No ads at launch',
    text: 'Promise: no ads, no selling data. Revisit only after real user numbers.' },
  { id: 'D5', group: 'decide', status: 'Decided', title: 'Free weekly recap',
    text: '"Your week: $X, $Y/hr" on a day you pick.' },
  { id: 'D6', group: 'decide', status: 'Decided', title: '"Report a problem" button',
    text: 'Emails you. Data-loss reports answered the same day.' },
]

const GROUPS = [
  ['v1', 'In the app or planned for v1'],
  ['later', 'After v1 (previews)'],
  ['paid', 'Paid keeper tools (previews)'],
  ['decide', 'Decisions to react to'],
]

const VOTES = [['like', 'Like'], ['maybe', 'Maybe'], ['no', 'No']]

export default function Ideas({ state, update }) {
  const [copied, setCopied] = useState('')
  const fb = state.feedback || {}
  const done = IDEAS.filter((i) => fb[i.id]?.vote || fb[i.id]?.text).length

  const save = (id, patch) =>
    update((s) => {
      s.feedback = s.feedback || {}
      s.feedback[id] = { ...(s.feedback[id] || {}), ...patch }
    })

  // COPY MY FEEDBACK: builds one text block you can paste into the chat.
  const copyAll = async () => {
    const lines = IDEAS.filter((i) => fb[i.id]?.vote || fb[i.id]?.text).map((i) => {
      const f = fb[i.id]
      return `- ${i.title} [${i.id}]: ${f.vote ? f.vote.toUpperCase() : 'no vote'}${f.text ? ' | ' + f.text : ''}`
    })
    const general = fb.GENERAL?.text ? `\nGeneral: ${fb.GENERAL.text}` : ''
    const text = `My feedback on the ideas:\n${lines.join('\n')}${general}`
    try {
      await navigator.clipboard.writeText(text)
      setCopied('Copied! Paste it into the chat.')
    } catch {
      setCopied('Copy was blocked. Select the text in the box below and copy it.')
    }
  }

  return (
    <section className="ideas">
      <h2>Ideas</h2>
      <p className="hint">
        Cards marked "Preview" show an idea only. They are not working features yet.
        Tap Like, Maybe or No and type anything you want. It saves as you type.
      </p>
      <p><strong>{done}</strong> of {IDEAS.length} reacted to.</p>
      <button className="primary" onClick={copyAll}>Copy my feedback</button>
      {copied && <p className="hint">{copied}</p>}

      {GROUPS.map(([g, label]) => (
        <div key={g}>
          <h3>{label}</h3>
          {IDEAS.filter((i) => i.group === g).map((i) => (
            <div className="idea" key={i.id}>
              <div className="row-between">
                <strong>{i.title}</strong>
                <span className={i.status === 'In the app' ? 'tag live' : 'tag'}>{i.status}</span>
              </div>
              <p className="hint">{i.text}</p>
              <div className="chips">
                {VOTES.map(([v, l]) => (
                  <button
                    key={v}
                    className={fb[i.id]?.vote === v ? 'chip on' : 'chip'}
                    onClick={() => save(i.id, { vote: fb[i.id]?.vote === v ? '' : v })}
                  >
                    {l}
                  </button>
                ))}
              </div>
              <textarea
                rows="2"
                placeholder="Your feedback (optional)"
                value={fb[i.id]?.text || ''}
                onChange={(e) => save(i.id, { text: e.target.value })}
              />
            </div>
          ))}
        </div>
      ))}

      <h3>Anything else?</h3>
      <textarea
        rows="4"
        placeholder="General feedback on the whole app"
        value={fb.GENERAL?.text || ''}
        onChange={(e) => save('GENERAL', { text: e.target.value })}
      />
    </section>
  )
}

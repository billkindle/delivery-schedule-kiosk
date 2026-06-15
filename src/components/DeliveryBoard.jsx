import { useRef, useEffect, useState } from 'react'
import EventCard, { getPalette } from './EventCard.jsx'

const SCROLL_INTERVAL_MS = 15_000

function TodayScroller({ eventsWithPalettes }) {
  const scrollRef = useRef(null)
  const [tickKey, setTickKey] = useState(0)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    const advance = () => {
      const maxScroll = el.scrollWidth - el.clientWidth
      if (maxScroll <= 0) return // all cards visible, nothing to scroll
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 2
      el.scrollTo({ left: atEnd ? 0 : el.scrollLeft + el.clientWidth, behavior: 'smooth' })
      setTickKey(k => k + 1)
    }

    const id = setInterval(advance, SCROLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [eventsWithPalettes])

  return (
    <div className="flex flex-col gap-2">
      <div ref={scrollRef} className="today-scroller flex gap-4 pb-1">
        {eventsWithPalettes.map(({ ev, palette }) => (
          <EventCard key={ev.id} event={ev} palette={palette} large />
        ))}
      </div>
      {/* 15-second progress bar — resets on each scroll tick */}
      <div className="h-0.5 bg-cs-border rounded-full overflow-hidden">
        <div
          key={tickKey}
          className="h-full bg-cs-blue rounded-full"
          style={{ animation: `scroll-progress ${SCROLL_INTERVAL_MS}ms linear forwards` }}
        />
      </div>
    </div>
  )
}

function todayDateStr() {
  return new Date().toLocaleDateString('en-CA') // YYYY-MM-DD in local time
}

function utcDateToLocalDateStr(utcDateStr) {
  // Graph returns UTC datetimes; map to local calendar date for grouping
  const d = new Date(utcDateStr)
  return d.toLocaleDateString('en-CA')
}

function groupByDate(events) {
  const map = new Map()
  for (const ev of events) {
    const key = ev.isAllDay
      ? ev.start.dateTime.split('T')[0]
      : utcDateToLocalDateStr(ev.start.dateTime)
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(ev)
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
}

function formatDayHeader(dateStr) {
  const d = new Date(dateStr + 'T12:00:00') // noon avoids DST edge cases
  return {
    weekday: d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
    monthDay: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }
}

// Assign palette indices globally so colors don't restart per day
function assignPalettes(groups) {
  let i = 0
  return groups.map(([date, events]) => [
    date,
    events.map(ev => ({ ev, palette: getPalette(ev, i++) })),
  ])
}

function EmptyState({ message }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-cs-border">
      <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
      <div className="text-xl font-light">{message}</div>
    </div>
  )
}

export default function DeliveryBoard({ events, loading, error }) {
  if (loading) return <EmptyState message="Loading schedule…" />

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2">
        <div className="text-red-400 text-xl font-medium">Could not load schedule</div>
        <div className="text-cs-subtle text-sm font-light max-w-md text-center">{error}</div>
      </div>
    )
  }

  if (events.length === 0) return <EmptyState message="No deliveries scheduled" />

  const today = todayDateStr()
  const groups = groupByDate(events)
  const withPalettes = assignPalettes(groups)

  const todayGroup = withPalettes.find(([d]) => d === today)
  const upcomingGroups = withPalettes.filter(([d]) => d > today)

  return (
    <div className="flex-1 flex flex-col overflow-hidden px-6 py-5 gap-6 min-h-0">

      {/* ── TODAY ── */}
      <section className="flex flex-col gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-medium text-white tracking-tight">Today's Deliveries</h2>
          {todayGroup && (
            <span className="bg-cs-blue text-white text-sm font-medium px-3 py-0.5 rounded-full">
              {todayGroup[1].length} {todayGroup[1].length === 1 ? 'event' : 'events'}
            </span>
          )}
        </div>

        {todayGroup ? (
          <TodayScroller eventsWithPalettes={todayGroup[1]} />
        ) : (
          <div className="text-cs-subtle text-base font-light py-2">No deliveries scheduled for today</div>
        )}
      </section>

      {/* ── UPCOMING ── */}
      {upcomingGroups.length > 0 && (
        <section className="flex flex-col gap-3 flex-1 min-h-0">
          <div className="border-t border-cs-border pt-4">
            <h2 className="text-lg font-medium text-cs-muted uppercase tracking-widest">Upcoming</h2>
          </div>
          <div className="flex flex-col gap-5 overflow-y-auto events-scroll pb-2">
            {upcomingGroups.map(([date, eventsWithPalette]) => {
              const { weekday, monthDay } = formatDayHeader(date)
              return (
                <div key={date} className="flex items-start gap-5">
                  <div className="w-24 shrink-0 pt-1">
                    <div className="text-xs font-medium text-cs-subtle tracking-widest">{weekday}</div>
                    <div className="text-lg font-medium text-white leading-tight">{monthDay}</div>
                  </div>
                  <div className="flex gap-3 flex-wrap">
                    {eventsWithPalette.map(({ ev, palette }) => (
                      <EventCard key={ev.id} event={ev} palette={palette} />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

    </div>
  )
}

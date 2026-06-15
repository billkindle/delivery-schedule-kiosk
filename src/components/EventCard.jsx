// Three palettes — one per ChemStation brand primary. Full class strings required so Tailwind includes them at build time.
const PALETTES = [
  { border: 'border-cs-blue',   bg: 'bg-[#0363C9]/10', text: 'text-[#117EE2]', badge: 'bg-[#0363C9]/20 text-[#117EE2]' }, // blue-005
  { border: 'border-cs-green',  bg: 'bg-[#79B701]/10', text: 'text-[#79B701]', badge: 'bg-[#79B701]/20 text-[#79B701]' }, // green-005
  { border: 'border-cs-orange', bg: 'bg-[#F75805]/10', text: 'text-[#F75805]', badge: 'bg-[#F75805]/20 text-[#FDCBB2]' }, // orange-005
]

function hashStr(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) h = Math.imul(31, h) + str.charCodeAt(i) | 0
  return Math.abs(h)
}

export function getPalette(event, fallbackIndex = 0) {
  if (event.categories?.length > 0) {
    return PALETTES[hashStr(event.categories[0]) % PALETTES.length]
  }
  return PALETTES[fallbackIndex % PALETTES.length]
}

function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'UTC',
  })
}

export default function EventCard({ event, palette, large = false }) {
  const timeLabel = event.isAllDay
    ? 'All Day'
    : `${formatTime(event.start.dateTime)} – ${formatTime(event.end.dateTime)}`

  const location = event.location?.displayName || ''
  const preview = (event.bodyPreview || '').replace(/\s+/g, ' ').trim()

  if (large) {
    return (
      <div className={`
        rounded-xl border-l-4 p-5 flex flex-col gap-2 shrink-0
        bg-cs-card ${palette.border} ${palette.bg}
        w-72 min-h-[160px]
      `}>
        <div className={`text-sm font-semibold tabular-nums ${palette.text}`}>{timeLabel}</div>
        <div className="text-lg font-medium text-white leading-snug line-clamp-2">{event.subject || '(No title)'}</div>
        {location && (
          <div className="flex items-start gap-1.5 text-cs-muted text-sm font-light">
            <svg className="w-3.5 h-3.5 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="line-clamp-2">{location}</span>
          </div>
        )}
        {preview && !location && (
          <div className="text-cs-subtle text-xs font-light line-clamp-2">{preview}</div>
        )}
        {event.categories?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-auto pt-1">
            {event.categories.map(cat => (
              <span key={cat} className={`text-xs px-2 py-0.5 rounded-full font-medium ${palette.badge}`}>
                {cat}
              </span>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Compact card for upcoming section
  return (
    <div className={`
      rounded-lg border-l-4 px-4 py-3 flex flex-col gap-1 shrink-0
      bg-cs-card/60 ${palette.border} ${palette.bg}
      w-56
    `}>
      <div className={`text-xs font-semibold tabular-nums ${palette.text}`}>{timeLabel}</div>
      <div className="text-sm font-medium text-white leading-snug line-clamp-2">{event.subject || '(No title)'}</div>
      {location && (
        <div className="text-cs-subtle text-xs font-light truncate">{location}</div>
      )}
    </div>
  )
}

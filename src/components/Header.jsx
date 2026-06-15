import { useState, useEffect } from 'react'

function LiveClock() {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const date = now.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })
  const time = now.toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true,
  })

  return (
    <div className="text-right">
      <div className="text-3xl font-medium tabular-nums tracking-tight text-white">{time}</div>
      <div className="text-sm font-light text-cs-muted mt-0.5">{date}</div>
    </div>
  )
}

export default function Header({ lastFetch, hasError }) {
  const statusText = hasError
    ? 'Connection error — retrying'
    : lastFetch
    ? `Updated ${lastFetch.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`
    : 'Loading…'

  return (
    <header className="flex items-center justify-between px-8 py-4 bg-cs-card border-b border-cs-border shrink-0">
      <div className="flex items-center gap-4">
        {/* ChemStation brand blue icon */}
        <div className="w-12 h-12 bg-cs-blue rounded-xl flex items-center justify-center shrink-0">
          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <div>
          <div className="text-xl font-medium text-white leading-tight tracking-tight">Delivery Schedule</div>
          <div className="flex items-center gap-2 mt-0.5">
            {/* Green-005 for live status — brand accent */}
            <span className={`w-2 h-2 rounded-full shrink-0 ${hasError ? 'bg-red-500' : 'bg-cs-green animate-pulse'}`} />
            <span className={`text-xs font-light ${hasError ? 'text-red-400' : 'text-cs-muted'}`}>{statusText}</span>
          </div>
        </div>
      </div>
      <LiveClock />
    </header>
  )
}

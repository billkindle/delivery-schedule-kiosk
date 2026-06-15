import { useState, useEffect, useCallback } from 'react'
import Header from './components/Header.jsx'
import DeliveryBoard from './components/DeliveryBoard.jsx'

const REFRESH_MS = 5 * 60 * 1000

export default function App() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastFetch, setLastFetch] = useState(null)

  const demo = new URLSearchParams(window.location.search).get('demo') === '1'

  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch(`/api/events${demo ? '?demo=1' : ''}`)
      if (!res.ok) throw new Error(`Server returned ${res.status}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setEvents(data.events ?? [])
      setLastFetch(new Date())
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEvents()
    const id = setInterval(fetchEvents, REFRESH_MS)
    return () => clearInterval(id)
  }, [fetchEvents])

  return (
    <div className="h-full flex flex-col bg-slate-900">
      <Header lastFetch={lastFetch} hasError={!!error} />
      <DeliveryBoard events={events} loading={loading} error={error} />
      <footer className="shrink-0 flex items-center justify-center py-3 border-t border-cs-border">
        <img src="/logo.png" alt="Company logo" className="h-8 opacity-60" />
      </footer>
    </div>
  )
}

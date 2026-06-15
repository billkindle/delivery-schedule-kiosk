import 'dotenv/config'

const { TENANT_ID, CLIENT_ID, CLIENT_SECRET, MAILBOX_UPN, LOOKAHEAD_DAYS = '14' } = process.env

let tokenCache = null

async function getAccessToken() {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) {
    return tokenCache.token
  }

  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials',
  })

  const res = await fetch(
    `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`,
    { method: 'POST', body }
  )

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Token request failed (${res.status}): ${text}`)
  }

  const data = await res.json()
  tokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  }

  return tokenCache.token
}

export async function getCalendarEvents() {
  const missing = ['TENANT_ID', 'CLIENT_ID', 'CLIENT_SECRET', 'MAILBOX_UPN'].filter(k => !process.env[k])
  if (missing.length) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`)
  }

  const token = await getAccessToken()

  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)

  const endOfWindow = new Date(startOfToday)
  endOfWindow.setDate(endOfWindow.getDate() + parseInt(LOOKAHEAD_DAYS, 10))
  endOfWindow.setHours(23, 59, 59, 999)

  // Use calendarView so recurring events are properly expanded into instances
  const params = new URLSearchParams({
    startDateTime: startOfToday.toISOString(),
    endDateTime: endOfWindow.toISOString(),
    $select: 'id,subject,start,end,location,bodyPreview,categories,organizer,isAllDay',
    $orderby: 'start/dateTime',
    $top: '150',
  })

  const url = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(MAILBOX_UPN)}/calendarView?${params}`

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Prefer: 'outlook.timezone="UTC"',
    },
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Graph API error (${res.status}): ${text}`)
  }

  const data = await res.json()
  return data.value ?? []
}

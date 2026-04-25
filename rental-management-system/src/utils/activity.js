import dayjs from 'dayjs'

const readList = (key) => {
  const stored = localStorage.getItem(key)
  return stored ? JSON.parse(stored) : []
}

const writeList = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value))
}

export const addLog = (log) => {
  const newLog = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    timestamp: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    user: JSON.parse(localStorage.getItem('user_info') || '{}').username || 'admin',
    ip: '127.0.0.1',
    ...log
  }

  const logs = readList('operation_logs')
  logs.unshift(newLog)
  if (logs.length > 1000) {
    logs.length = 1000
  }
  writeList('operation_logs', logs)
  return newLog
}

export const addNotification = (notification) => {
  const notifications = readList('notifications')
  const dedupeKey = notification.dedupe_key || `${notification.category}:${notification.title}:${notification.message}`
  const exists = notifications.find((item) => item.dedupe_key === dedupeKey)

  if (exists) {
    return exists
  }

  const newNotification = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    read: false,
    created_at: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    ...notification,
    dedupe_key: dedupeKey
  }

  notifications.unshift(newNotification)
  writeList('notifications', notifications)
  return newNotification
}

export const markNotificationAsRead = (id) => {
  const notifications = readList('notifications')
  const next = notifications.map((item) => item.id === id ? { ...item, read: true } : item)
  writeList('notifications', next)
}

export const markAllNotificationsAsRead = () => {
  const notifications = readList('notifications')
  writeList('notifications', notifications.map((item) => ({ ...item, read: true })))
}

export const addBusinessEvent = (event) => {
  const events = readList('business_events')
  events.unshift({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    created_at: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    operator: JSON.parse(localStorage.getItem('user_info') || '{}').username || 'admin',
    ...event
  })
  if (events.length > 2000) {
    events.length = 2000
  }
  writeList('business_events', events)
}

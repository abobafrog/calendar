import { Bell, Check, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useMarkNotificationRead, useMeetings, useNotifications } from '../api/hooks'
import type { SiteNotification } from '../lib/types'

const notificationText: Record<string, { title: string; message: string }> = {
  friend_request_created: { title: 'Новая заявка', message: 'Вам отправили заявку в друзья.' },
  friend_request_accepted: {
    title: 'Заявка принята',
    message: 'Теперь вы можете сравнивать календари.',
  },
  meeting_proposed: { title: 'Новая встреча', message: 'Вам предложили время для встречи.' },
  meeting_declined: { title: 'Ответ на встречу', message: 'Участник отклонил предложение.' },
  meeting_confirmed: { title: 'Встреча подтверждена', message: 'Все участники приняли встречу.' },
  meeting_cancelled: { title: 'Встреча отменена', message: 'Организатор отменил встречу.' },
}

function describe(notification: SiteNotification) {
  return (
    notificationText[notification.type] ?? {
      title: 'Время вместе',
      message: 'У вас новое уведомление.',
    }
  )
}

export function SiteNotifications() {
  const notifications = useNotifications()
  const meetings = useMeetings()
  const markRead = useMarkNotificationRead()
  const queryClient = useQueryClient()
  const announced = useRef(new Set<number>())
  const [visible, setVisible] = useState<SiteNotification | null>(null)

  useEffect(() => {
    const next = notifications.data?.find((item) => !announced.current.has(item.id))
    if (!next) return
    announced.current.add(next.id)
    setVisible(next)
    const text = describe(next)
    if ('Notification' in window && window.Notification.permission === 'granted') {
      if ('serviceWorker' in navigator) {
        void navigator.serviceWorker.ready.then((registration) =>
          registration.showNotification(text.title, {
            body: text.message,
            tag: `timetogether-${next.id}`,
            icon: '/icon.svg',
            data: { url: next.payload.meeting_id ? `/meetings/${next.payload.meeting_id}` : '/' },
          }),
        )
      } else
        new window.Notification(text.title, { body: text.message, tag: `timetogether-${next.id}` })
    }
  }, [notifications.data])

  useEffect(() => {
    if (
      !meetings.data ||
      !('Notification' in window) ||
      window.Notification.permission !== 'granted'
    )
      return
    const now = Date.now()
    for (const meeting of meetings.data) {
      if (meeting.status === 'cancelled' || !meeting.reminder_minutes) continue
      const startsIn = new Date(meeting.start_at).getTime() - now
      const threshold = meeting.reminder_minutes * 60_000
      const key = `timetogether:reminder:${meeting.id}:${meeting.start_at}`
      if (startsIn > 0 && startsIn <= threshold && !localStorage.getItem(key)) {
        localStorage.setItem(key, 'shown')
        const body = `Начало в ${new Date(meeting.start_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`
        if ('serviceWorker' in navigator)
          void navigator.serviceWorker.ready.then((registration) =>
            registration.showNotification(meeting.title, {
              body,
              tag: key,
              icon: '/icon.svg',
              data: { url: `/meetings/${meeting.id}` },
            }),
          )
        else new window.Notification(meeting.title, { body, tag: key })
      }
    }
  }, [meetings.data])

  async function dismiss(notification: SiteNotification) {
    setVisible(null)
    await markRead.mutateAsync(notification.id)
    await queryClient.invalidateQueries({ queryKey: ['notifications'] })
  }

  if (!visible) return null
  const text = describe(visible)
  return (
    <aside className="site-notification" role="status" aria-live="polite">
      <span className="site-notification__icon">
        <Bell size={18} />
      </span>
      <div>
        <strong>{text.title}</strong>
        <p>{text.message}</p>
      </div>
      <button type="button" onClick={() => void dismiss(visible)} aria-label="Прочитано">
        <Check size={18} />
      </button>
      <button type="button" onClick={() => setVisible(null)} aria-label="Скрыть">
        <X size={18} />
      </button>
    </aside>
  )
}

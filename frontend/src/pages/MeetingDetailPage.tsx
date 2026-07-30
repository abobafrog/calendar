import { AlertTriangle, ArrowLeft, Check, Download, Link2, MapPin, X } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { GlassButton } from '../components/GlassButton'
import { GlassPanel } from '../components/GlassPanel'
import { Toast } from '../components/Toast'
import { UserAvatar } from '../components/UserAvatar'
import { useMeeting, useMeetingResponse } from '../api/hooks'

export function MeetingDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const meetingQuery = useMeeting(Number(id))
  const responseMutation = useMeetingResponse()
  const [toast, setToast] = useState<string | null>(null)
  const meeting = meetingQuery.data
  if (!meeting) return <div className="page loading-state">Загружаем встречу…</div>
  const start = new Date(meeting.start_at)
  const end = new Date(meeting.end_at)
  return (
    <div className="page detail-page">
      <header className="subpage-header">
        <GlassButton variant="icon" onClick={() => navigate(-1)} aria-label="Назад">
          <ArrowLeft size={21} />
        </GlassButton>
        <h1>Детали встречи</h1>
        <a
          className="glass-button glass-button--icon"
          href={`/api/v1/meetings/${meeting.id}/calendar.ics`}
          download
          aria-label="Добавить в календарь"
        >
          <Download size={18} />
        </a>
      </header>
      <GlassPanel className="meeting-hero">
        <span>
          {start.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}
        </span>
        <h2>{meeting.title}</h2>
        <strong>
          {start.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })} —{' '}
          {end.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
        </strong>
        {meeting.description && <p>{meeting.description}</p>}
        {meeting.location && (
          <p className="meeting-meta">
            <MapPin size={15} /> {meeting.location}
          </p>
        )}
        {meeting.meeting_url && (
          <a className="meeting-meta" href={meeting.meeting_url} target="_blank" rel="noreferrer">
            <Link2 size={15} /> Подключиться к встрече
          </a>
        )}
        <p className="meeting-meta">
          Напоминание:{' '}
          {meeting.reminder_minutes ? `за ${meeting.reminder_minutes} мин` : 'выключено'}
        </p>
      </GlassPanel>
      {meeting.has_conflict && (
        <div className="conflict-banner">
          <AlertTriangle size={19} />
          <span>
            В вашем календаре появился конфликт. Встреча не будет подтверждена автоматически.
          </span>
        </div>
      )}
      <section className="list-section">
        <h2>Участники</h2>
        <div className="people-list">
          {meeting.participants.map((participant) => (
            <article key={participant.id} className="person-row">
              <UserAvatar user={participant.user} />
              <div>
                <strong>
                  {participant.user.first_name} {participant.user.last_name}
                </strong>
                <span>
                  {participant.user.id === meeting.creator_id
                    ? 'Организатор'
                    : `@${participant.user.username}`}
                </span>
              </div>
              <span className={`response-pill response-pill--${participant.response}`}>
                {participant.response === 'accepted'
                  ? 'Принял'
                  : participant.response === 'declined'
                    ? 'Отклонил'
                    : 'Ожидает'}
              </span>
            </article>
          ))}
        </div>
      </section>
      {meeting.status === 'pending' && (
        <div className="detail-actions">
          <GlassButton
            variant="danger"
            onClick={async () => {
              try {
                await responseMutation.mutateAsync({ id: meeting.id, action: 'decline' })
                setToast('Встреча отклонена')
              } catch (error) {
                setToast(error instanceof Error ? error.message : 'Не удалось отклонить встречу')
              }
            }}
          >
            <X size={18} />
            Отклонить
          </GlassButton>
          <GlassButton
            variant="primary"
            onClick={async () => {
              try {
                await responseMutation.mutateAsync({ id: meeting.id, action: 'accept' })
                setToast('Встреча принята')
              } catch (error) {
                setToast(error instanceof Error ? error.message : 'Не удалось принять встречу')
              }
            }}
          >
            <Check size={18} />
            Принять
          </GlassButton>
        </div>
      )}
      <Toast message={toast} onClose={() => setToast(null)} />
    </div>
  )
}

import { AlertTriangle, CheckCircle2, ChevronRight, Clock3 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useCurrentUser } from '../api/hooks'
import type { Meeting } from '../lib/types'
import { formatDateInZone, formatTimeInZone } from '../lib/time'
import { AvatarStack } from './UserAvatar'

const statusLabel = { pending: 'Ждём ответов', confirmed: 'Подтверждена', cancelled: 'Отменена' }

export function MeetingCard({ meeting }: { meeting: Meeting }) {
  const currentUserQuery = useCurrentUser()
  const timezone = currentUserQuery.data?.timezone ?? 'Europe/Moscow'
  const timeFormat = currentUserQuery.data?.time_format ?? '24h'
  const accepted = meeting.participants.filter((item) => item.response === 'accepted').length
  return (
    <Link to={`/meetings/${meeting.id}`} className="meeting-card">
      <div className="meeting-card__top">
        <span className={`meeting-status meeting-status--${meeting.status}`}>
          {meeting.has_conflict ? (
            <AlertTriangle size={14} />
          ) : meeting.status === 'confirmed' ? (
            <CheckCircle2 size={14} />
          ) : (
            <Clock3 size={14} />
          )}
          {meeting.has_conflict ? 'Есть конфликт' : statusLabel[meeting.status]}
        </span>
        <ChevronRight size={18} />
      </div>
      <strong>{meeting.title}</strong>
      <time>
        {formatDateInZone(meeting.start_at, timezone)},{' '}
        {formatTimeInZone(meeting.start_at, timezone, timeFormat)}–
        {formatTimeInZone(meeting.end_at, timezone, timeFormat)}
      </time>
      <div className="meeting-card__people">
        <AvatarStack users={meeting.participants.map((item) => item.user)} />
        <span>
          {accepted}/{meeting.participants.length} приняли
        </span>
      </div>
    </Link>
  )
}

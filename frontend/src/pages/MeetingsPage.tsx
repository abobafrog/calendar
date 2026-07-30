import { Clock3, Link2, Plus, Sparkles, UsersRound } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { MeetingCard } from '../components/MeetingCard'
import { useGroups, useGroupSuggestions, useMeetings } from '../api/hooks'
import { formatDateInZone, formatTimeInZone } from '../lib/time'

export function MeetingsPage() {
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming')
  const meetingsQuery = useMeetings()
  const groupsQuery = useGroups()
  const suggestionQuery = useGroupSuggestions(groupsQuery.data?.[0]?.id ?? null)
  const visibleMeetings = meetingsQuery.data ?? []
  const suggestedSlot = suggestionQuery.data?.suggestions[0]
  const suggestedGroup = suggestionQuery.data?.group
  return (
    <div className="page">
      <header className="page-header">
        <div>
          <span className="eyebrow">Командные планы</span>
          <h1>Встречи</h1>
        </div>
        <div className="calendar-header-actions">
          <Link to="/groups" className="header-action" aria-label="Постоянные группы">
            <UsersRound size={19} />
          </Link>
          <Link
            to="/scheduling-links"
            className="header-action"
            aria-label="Ссылка без регистрации"
          >
            <Link2 size={19} />
          </Link>
          <Link to="/availability" className="header-action" aria-label="Новая встреча">
            <Plus size={21} />
          </Link>
        </div>
      </header>
      <div className="segmented-control segmented-control--wide">
        <button
          type="button"
          className={tab === 'upcoming' ? 'is-active' : ''}
          onClick={() => setTab('upcoming')}
        >
          Предстоящие
        </button>
        <button
          type="button"
          className={tab === 'past' ? 'is-active' : ''}
          onClick={() => setTab('past')}
        >
          Прошедшие
        </button>
      </div>
      {tab === 'upcoming' && suggestedSlot && suggestedGroup && (
        <Link
          to="/availability"
          state={{
            participantIds: suggestedGroup.members.map((member) => member.id),
            slot: suggestedSlot,
            title: suggestedGroup.name,
          }}
          className="smart-suggestion-card"
        >
          <span>
            <Sparkles size={19} />
          </span>
          <div>
            <small>Готовое предложение · {suggestedGroup.name}</small>
            <strong>
              {formatDateInZone(suggestedSlot.start_at)}, {formatTimeInZone(suggestedSlot.start_at)}
              –{formatTimeInZone(suggestedSlot.end_at)}
            </strong>
          </div>
          <b>Выбрать</b>
        </Link>
      )}
      {tab === 'upcoming' ? (
        visibleMeetings.length ? (
          <div className="meeting-list">
            {visibleMeetings.map((meeting) => (
              <MeetingCard key={meeting.id} meeting={meeting} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div>
              <Clock3 size={26} />
            </div>
            <h2>Встреч пока нет</h2>
            <p>Предложите встречу принятому друну.</p>
          </div>
        )
      ) : (
        <div className="empty-state">
          <div>
            <span>✓</span>
          </div>
          <h2>Прошедших встреч нет</h2>
          <p>Завершённые встречи появятся здесь.</p>
        </div>
      )}
    </div>
  )
}

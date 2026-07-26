import { Clock3, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { MeetingCard } from '../components/MeetingCard'
import { useMeetings } from '../api/hooks'

export function MeetingsPage() {
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming')
  const meetingsQuery = useMeetings()
  const visibleMeetings = meetingsQuery.data ?? []
  return (
    <div className="page">
      <header className="page-header">
        <div>
          <span className="eyebrow">Командные планы</span>
          <h1>Встречи</h1>
        </div>
        <Link to="/availability" className="header-action" aria-label="Новая встреча">
          <Plus size={21} />
        </Link>
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
      {tab === 'upcoming' ? (
        visibleMeetings.length ? (
          <div className="meeting-list">
            {visibleMeetings.map((meeting) => (
              <MeetingCard key={meeting.id} meeting={meeting} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div><Clock3 size={26} /></div>
            <h2>Встреч пока нет</h2>
            <p>Предложите встречу принятому другу.</p>
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

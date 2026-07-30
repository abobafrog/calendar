import { ArrowLeft, Check, Copy, Link2, Plus, Trophy } from 'lucide-react'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { apiRequest } from '../api/client'
import { useCreateSchedulingLink, useCurrentUser, useSchedulingLinks } from '../api/hooks'
import { GlassButton } from '../components/GlassButton'
import { GlassPanel } from '../components/GlassPanel'
import { ModalSheet } from '../components/ModalSheet'
import { Toast } from '../components/Toast'
import { toLocalDateKey } from '../lib/time'
import type { PollOption, SchedulingPoll } from '../lib/types'

export function SchedulingLinksPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const currentUser = useCurrentUser()
  const links = useSchedulingLinks()
  const createLink = useCreateSchedulingLink()
  const [creating, setCreating] = useState(false)
  const [finalizing, setFinalizing] = useState<{ poll: SchedulingPoll; option: PollOption } | null>(
    null,
  )
  const [title, setTitle] = useState('')
  const [dateFrom, setDateFrom] = useState(toLocalDateKey(new Date()))
  const [dateTo, setDateTo] = useState(() => {
    const day = new Date()
    day.setDate(day.getDate() + 6)
    return toLocalDateKey(day)
  })
  const [duration, setDuration] = useState(60)
  const [dailyStart, setDailyStart] = useState('18:00')
  const [dailyEnd, setDailyEnd] = useState('22:00')
  const [location, setLocation] = useState('')
  const [meetingUrl, setMeetingUrl] = useState('')
  const [reminder, setReminder] = useState(30)
  const [toast, setToast] = useState<string | null>(null)

  const share = async (poll: SchedulingPoll) => {
    const url = `${window.location.origin}/join/${poll.token}`
    if (navigator.share)
      await navigator.share({ title: poll.title, text: 'Отметьте удобное время', url })
    else await navigator.clipboard.writeText(url)
    setToast('Ссылка готова — регистрация участникам не нужна')
  }

  return (
    <div className="page scheduling-page">
      <header className="subpage-header">
        <GlassButton variant="icon" onClick={() => navigate(-1)} aria-label="Назад">
          <ArrowLeft size={21} />
        </GlassButton>
        <h1>Ссылки на встречу</h1>
        <GlassButton variant="icon" onClick={() => setCreating(true)} aria-label="Новая ссылка">
          <Plus size={19} />
        </GlassButton>
      </header>
      <p className="page-intro">
        Задайте период, отправьте ссылку и получите лучшие окна по ответам «да / возможно / нет».
      </p>
      <div className="poll-owner-list">
        {links.data?.map((poll) => {
          const best = poll.options[0]
          return (
            <GlassPanel key={poll.id} className="poll-owner-card">
              <div className="poll-owner-card__head">
                <span>
                  <Link2 size={19} />
                </span>
                <div>
                  <strong>{poll.title}</strong>
                  <small>
                    {poll.voters.length ? `${poll.voters.length} ответили` : 'Ответов пока нет'}
                  </small>
                </div>
                <span
                  className={`meeting-status meeting-status--${poll.status === 'finalized' ? 'confirmed' : 'pending'}`}
                >
                  {poll.status === 'finalized' ? 'Выбрано' : 'Открыто'}
                </span>
              </div>
              {best && (
                <div className="poll-best">
                  <Trophy size={17} />
                  <span>
                    <strong>
                      {new Date(best.start_at).toLocaleString('ru-RU', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </strong>
                    <small>
                      {best.yes} да · {best.maybe} возможно · {best.no} нет
                    </small>
                  </span>
                </div>
              )}
              <div className="poll-owner-card__actions">
                <GlassButton onClick={() => void share(poll)}>
                  <Copy size={16} />
                  Поделиться
                </GlassButton>
                {poll.status === 'open' && best && (
                  <GlassButton
                    variant="primary"
                    onClick={() => {
                      setTitle(poll.title)
                      setFinalizing({ poll, option: best })
                    }}
                  >
                    <Check size={16} />
                    Выбрать
                  </GlassButton>
                )}
              </div>
            </GlassPanel>
          )
        })}
      </div>
      {!links.isLoading && !links.data?.length && (
        <div className="empty-state">
          <div>
            <Link2 size={25} />
          </div>
          <h2>Создайте первую ссылку</h2>
          <p>Участники смогут ответить даже без аккаунта.</p>
        </div>
      )}

      <ModalSheet open={creating} title="Ссылка без регистрации" onClose={() => setCreating(false)}>
        <div className="sheet-form">
          <label className="field">
            <span>Что планируем</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Ужин вместе"
            />
          </label>
          <div className="field-row field-row--two">
            <label className="field">
              <span>С даты</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(event) => setDateFrom(event.target.value)}
              />
            </label>
            <label className="field">
              <span>По дату</span>
              <input
                type="date"
                value={dateTo}
                onChange={(event) => setDateTo(event.target.value)}
              />
            </label>
          </div>
          <div className="field-row field-row--three">
            <label className="field">
              <span>Длительность</span>
              <select
                value={duration}
                onChange={(event) => setDuration(Number(event.target.value))}
              >
                <option value="30">30 мин</option>
                <option value="60">1 час</option>
                <option value="90">1,5 часа</option>
                <option value="120">2 часа</option>
              </select>
            </label>
            <label className="field">
              <span>От</span>
              <input
                type="time"
                value={dailyStart}
                onChange={(event) => setDailyStart(event.target.value)}
              />
            </label>
            <label className="field">
              <span>До</span>
              <input
                type="time"
                value={dailyEnd}
                onChange={(event) => setDailyEnd(event.target.value)}
              />
            </label>
          </div>
          <GlassButton
            variant="primary"
            disabled={!title.trim() || createLink.isPending}
            onClick={async () => {
              try {
                const poll = await createLink.mutateAsync({
                  title: title.trim(),
                  date_from: dateFrom,
                  date_to: dateTo,
                  timezone: currentUser.data?.timezone ?? 'UTC',
                  duration_minutes: duration,
                  daily_start: dailyStart,
                  daily_end: dailyEnd,
                })
                await queryClient.invalidateQueries({ queryKey: ['scheduling-links'] })
                setCreating(false)
                await share(poll)
              } catch (error) {
                setToast(error instanceof Error ? error.message : 'Не удалось создать ссылку')
              }
            }}
          >
            Создать и поделиться
          </GlassButton>
        </div>
      </ModalSheet>

      <ModalSheet
        open={Boolean(finalizing)}
        title="Превратить окно во встречу"
        onClose={() => setFinalizing(null)}
      >
        <div className="sheet-form">
          <label className="field">
            <span>Название</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>
          <label className="field">
            <span>Место</span>
            <input
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder="Кафе или переговорная"
            />
          </label>
          <label className="field">
            <span>Ссылка</span>
            <input
              type="url"
              value={meetingUrl}
              onChange={(event) => setMeetingUrl(event.target.value)}
              placeholder="https://meet…"
            />
          </label>
          <label className="field">
            <span>Напомнить</span>
            <select value={reminder} onChange={(event) => setReminder(Number(event.target.value))}>
              <option value="0">Не напоминать</option>
              <option value="10">За 10 минут</option>
              <option value="30">За 30 минут</option>
              <option value="60">За час</option>
              <option value="1440">За день</option>
            </select>
          </label>
          <GlassButton
            variant="primary"
            onClick={async () => {
              if (!finalizing) return
              try {
                const result = await apiRequest<{ meeting: { id: number } }>(
                  `/scheduling-links/${finalizing.poll.id}/finalize`,
                  {
                    method: 'POST',
                    body: JSON.stringify({
                      option_id: finalizing.option.id,
                      title,
                      location: location || undefined,
                      meeting_url: meetingUrl || undefined,
                      reminder_minutes: reminder,
                    }),
                  },
                )
                setFinalizing(null)
                await queryClient.invalidateQueries({ queryKey: ['scheduling-links'] })
                navigate(`/meetings/${result.meeting.id}`)
              } catch (error) {
                setToast(error instanceof Error ? error.message : 'Не удалось создать встречу')
              }
            }}
          >
            Подтвердить встречу
          </GlassButton>
        </div>
      </ModalSheet>
      <Toast message={toast} onClose={() => setToast(null)} />
    </div>
  )
}

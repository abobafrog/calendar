import { Check, Clock3, HelpCircle, Sparkles, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { apiRequest } from '../api/client'
import { ThemeBackground } from '../components/ThemeBackground'
import type { SchedulingPoll } from '../lib/types'

type Vote = 'yes' | 'maybe' | 'no'

export function PublicPollPage() {
  const { token = '' } = useParams()
  const [poll, setPoll] = useState<SchedulingPoll | null>(null)
  const [name, setName] = useState(() => localStorage.getItem('timetogether:guest-name') ?? '')
  const [votes, setVotes] = useState<Record<number, Vote>>({})
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const voterKey = useMemo(() => localStorage.getItem(`timetogether:poll:${token}`), [token])

  useEffect(() => {
    void apiRequest<SchedulingPoll>(`/public/scheduling-links/${token}`)
      .then(setPoll)
      .catch((error) => setMessage(error instanceof Error ? error.message : 'Ссылка недоступна'))
  }, [token])

  return (
    <main className="public-poll-page">
      <div className="login-background" aria-hidden="true">
        <ThemeBackground />
      </div>
      <section className="public-poll-shell">
        <header>
          <span>
            <Sparkles size={20} /> Время вместе
          </span>
          <h1>{poll?.title ?? 'Выбор времени'}</h1>
          {poll && (
            <p>
              {poll.creator.first_name} приглашает выбрать удобные варианты. Регистрация не нужна.
            </p>
          )}
        </header>
        {message && <div className="public-poll-message">{message}</div>}
        {poll && (
          <>
            {poll.status === 'finalized' && (
              <div className="public-poll-final">
                <Check size={20} />
                <span>
                  Время выбрано:{' '}
                  {new Date(
                    poll.options.find((option) => option.id === poll.finalized_option_id)
                      ?.start_at ?? '',
                  ).toLocaleString('ru-RU', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            )}
            <label className="public-name">
              <span>Ваше имя</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Как вас представить"
                disabled={poll.status !== 'open'}
              />
            </label>
            <div className="public-options">
              {poll.options.map((option, index) => (
                <article key={option.id} className={index < 3 ? 'is-best' : ''}>
                  <div>
                    <Clock3 size={17} />
                    <span>
                      <strong>
                        {new Date(option.start_at).toLocaleDateString('ru-RU', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                        })}
                      </strong>
                      <small>
                        {new Date(option.start_at).toLocaleTimeString('ru-RU', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        —{' '}
                        {new Date(option.end_at).toLocaleTimeString('ru-RU', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </small>
                    </span>
                  </div>
                  <div className="vote-buttons">
                    {(
                      [
                        ['yes', Check, 'Да'],
                        ['maybe', HelpCircle, 'Возможно'],
                        ['no', X, 'Нет'],
                      ] as const
                    ).map(([value, Icon, label]) => (
                      <button
                        key={value}
                        type="button"
                        className={votes[option.id] === value ? `is-active vote-${value}` : ''}
                        aria-label={label}
                        title={label}
                        disabled={poll.status !== 'open'}
                        onClick={() => setVotes((current) => ({ ...current, [option.id]: value }))}
                      >
                        <Icon size={16} />
                      </button>
                    ))}
                  </div>
                  <small className="vote-counts">
                    {option.yes} да · {option.maybe} возможно · {option.no} нет
                  </small>
                </article>
              ))}
            </div>
            {poll.status === 'open' && (
              <button
                className="public-submit"
                type="button"
                disabled={!name.trim() || !Object.keys(votes).length || busy}
                onClick={async () => {
                  try {
                    setBusy(true)
                    const receipt = await apiRequest<{ voter_key: string; poll: SchedulingPoll }>(
                      `/public/scheduling-links/${token}/responses`,
                      {
                        method: 'POST',
                        body: JSON.stringify({
                          voter_name: name.trim(),
                          voter_key: voterKey,
                          votes: Object.entries(votes).map(([option_id, response]) => ({
                            option_id: Number(option_id),
                            response,
                          })),
                        }),
                      },
                    )
                    localStorage.setItem('timetogether:guest-name', name.trim())
                    localStorage.setItem(`timetogether:poll:${token}`, receipt.voter_key)
                    setPoll(receipt.poll)
                    setMessage('Ответ сохранён. Можно вернуться и изменить его позже.')
                  } catch (error) {
                    setMessage(
                      error instanceof Error ? error.message : 'Не удалось сохранить ответ',
                    )
                  } finally {
                    setBusy(false)
                  }
                }}
              >
                {busy ? 'Сохраняем…' : 'Отправить ответ'}
              </button>
            )}
            {poll.voters.length > 0 && (
              <p className="public-voters">Уже ответили: {poll.voters.join(', ')}</p>
            )}
          </>
        )}
      </section>
    </main>
  )
}

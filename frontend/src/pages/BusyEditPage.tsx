import { useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Check, Clock3, Eye, LockKeyhole, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { apiRequest } from '../api/client'
import { useBusyInterval } from '../api/hooks'
import { GlassButton } from '../components/GlassButton'
import { GlassPanel } from '../components/GlassPanel'
import { Toast } from '../components/Toast'
import { toLocalDateKey } from '../lib/time'
import type { BusyInterval, Visibility } from '../lib/types'

const toTime = (value: string) => {
  const date = new Date(value)
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function dateTime(date: string, time: string) {
  const [year, month, day] = date.split('-').map(Number)
  const [hours, minutes] = time.split(':').map(Number)
  return new Date(year, month - 1, day, hours, minutes)
}

export function BusyEditPage() {
  const id = Number(useParams().id)
  const intervalQuery = useBusyInterval(id)

  if (intervalQuery.isLoading) return <div className="page loading-state">Загружаем дело…</div>
  if (!intervalQuery.data) return <div className="page loading-state">Дело не найдено</div>

  return <BusyEditForm key={intervalQuery.data.id} interval={intervalQuery.data} />
}

function BusyEditForm({ interval }: { interval: BusyInterval }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [title, setTitle] = useState(interval.title ?? '')
  const [date, setDate] = useState(toLocalDateKey(new Date(interval.start_at)))
  const [start, setStart] = useState(toTime(interval.start_at))
  const [end, setEnd] = useState(toTime(interval.end_at))
  const [visibility, setVisibility] = useState<Visibility>(interval.visibility)
  const [toast, setToast] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['calendar'], refetchType: 'all' })
  }

  const patchInterval = async (payload: Partial<BusyInterval>, message: string) => {
    if (saving) return
    try {
      setSaving(true)
      await apiRequest<BusyInterval>(`/calendar/intervals/${interval.id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      })
      await invalidate()
      setToast(message)
      window.setTimeout(() => navigate('/', { replace: true }), 400)
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Не удалось обновить дело')
      setSaving(false)
    }
  }

  const startAt = dateTime(date, start)
  const endAt = dateTime(date, end)
  const canSave = startAt < endAt && !saving && !interval.meeting_id
  const currentTime = new Date()
  const canFinishNow = startAt < currentTime && currentTime < endAt && !interval.meeting_id

  return (
    <div className="page form-page">
      <header className="subpage-header">
        <GlassButton variant="icon" onClick={() => navigate(-1)} aria-label="Назад">
          <ArrowLeft size={21} />
        </GlassButton>
        <h1>Редактировать дело</h1>
        <GlassButton
          variant="icon"
          disabled={!canSave}
          aria-label="Сохранить дело"
          onClick={() =>
            void patchInterval(
              {
                title: title.trim() || null,
                start_at: startAt.toISOString(),
                end_at: endAt.toISOString(),
                visibility,
              },
              'Изменения сохранены',
            )
          }
        >
          <Check size={19} />
        </GlassButton>
      </header>

      {interval.meeting_id ? (
        <GlassPanel className="form-section edit-note">
          Это время создано встречей. Изменить его можно на странице встречи.
        </GlassPanel>
      ) : (
        <>
          <GlassPanel className="form-section">
            <label className="field">
              <span>Название</span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Например, фокус-время"
                maxLength={200}
              />
            </label>
            <label className="field">
              <span>Дата</span>
              <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            </label>
            <div className="field-row field-row--two">
              <label className="field">
                <span>Начало</span>
                <input
                  type="time"
                  value={start}
                  onChange={(event) => setStart(event.target.value)}
                />
              </label>
              <label className="field">
                <span>Конец</span>
                <input type="time" value={end} onChange={(event) => setEnd(event.target.value)} />
              </label>
            </div>
          </GlassPanel>

          <GlassPanel className="form-section">
            <div className="form-label">
              <span>Если планы изменились</span>
            </div>
            <div className="quick-time-actions">
              <GlassButton
                disabled={!canFinishNow || saving}
                onClick={() =>
                  void patchInterval({ end_at: new Date().toISOString() }, 'Дело завершено раньше')
                }
              >
                <Check size={17} />
                Завершить сейчас
              </GlassButton>
              <GlassButton
                disabled={saving}
                onClick={() => {
                  const extended = new Date(interval.end_at)
                  extended.setMinutes(extended.getMinutes() + 30)
                  void patchInterval(
                    { end_at: extended.toISOString() },
                    'Дело продлено на 30 минут',
                  )
                }}
              >
                <Clock3 size={17} />
                Продлить на 30 мин
              </GlassButton>
            </div>
          </GlassPanel>

          <GlassPanel className="form-section">
            <div className="form-label">
              <span>Показывать друзьям</span>
            </div>
            <div className="visibility-options">
              <button
                type="button"
                className={visibility === 'open' ? 'is-active' : ''}
                onClick={() => setVisibility('open')}
              >
                <Eye size={19} />
                <span>
                  <strong>Да, показать дело</strong>
                  <small>Друзья увидят название и время</small>
                </span>
              </button>
              <button
                type="button"
                className={visibility === 'closed' ? 'is-active' : ''}
                onClick={() => setVisibility('closed')}
              >
                <LockKeyhole size={19} />
                <span>
                  <strong>Нет, скрыть детали</strong>
                  <small>Друзья увидят только «Занят»</small>
                </span>
              </button>
            </div>
          </GlassPanel>

          <GlassButton
            variant="primary"
            className="sticky-submit"
            disabled={!canSave}
            onClick={() =>
              void patchInterval(
                {
                  title: title.trim() || null,
                  start_at: startAt.toISOString(),
                  end_at: endAt.toISOString(),
                  visibility,
                },
                'Изменения сохранены',
              )
            }
          >
            {saving ? 'Сохраняем…' : 'Сохранить изменения'}
          </GlassButton>
          <GlassButton
            variant="danger"
            className="delete-interval-button"
            disabled={saving}
            onClick={async () => {
              if (!window.confirm('Удалить это дело из календаря?')) return
              try {
                setSaving(true)
                await apiRequest(`/calendar/intervals/${interval.id}`, { method: 'DELETE' })
                await invalidate()
                navigate('/', { replace: true })
              } catch (error) {
                setToast(error instanceof Error ? error.message : 'Не удалось удалить дело')
                setSaving(false)
              }
            }}
          >
            <Trash2 size={18} />
            Удалить дело
          </GlassButton>
        </>
      )}
      <Toast message={toast} onClose={() => setToast(null)} />
    </div>
  )
}

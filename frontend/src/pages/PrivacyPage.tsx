import { ArrowLeft, Clock3, Eye, EyeOff, LockKeyhole, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useCurrentUser, useUpdateCurrentUser } from '../api/hooks'
import { GlassButton } from '../components/GlassButton'
import { GlassPanel } from '../components/GlassPanel'
import { Toast } from '../components/Toast'

export function PrivacyPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const user = useCurrentUser()
  const update = useUpdateCurrentUser()
  const [toast, setToast] = useState<string | null>(null)
  if (!user.data) return <div className="page loading-state">Загружаем настройки…</div>
  const save = async (payload: Parameters<typeof update.mutateAsync>[0], message: string) => {
    try {
      const result = await update.mutateAsync(payload)
      queryClient.setQueryData(['me'], result)
      setToast(message)
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Не удалось сохранить')
    }
  }
  const temporaryActive = Boolean(
    user.data.details_access_until && new Date(user.data.details_access_until) > new Date(),
  )
  return (
    <div className="page privacy-page">
      <header className="subpage-header">
        <GlassButton variant="icon" onClick={() => navigate(-1)} aria-label="Назад">
          <ArrowLeft size={21} />
        </GlassButton>
        <h1>Центр приватности</h1>
        <span />
      </header>
      <GlassPanel className="privacy-explainer">
        <ShieldCheck size={24} />
        <div>
          <strong>Время видно, детали — по вашему выбору</strong>
          <p>
            Принятые друзья всегда видят только занятость. Название события показывается лишь когда
            это разрешено здесь и у самого события.
          </p>
        </div>
      </GlassPanel>
      <section className="settings-section">
        <h2>Кто что видит</h2>
        <GlassPanel className="privacy-matrix">
          <div>
            <span>
              <Eye size={17} /> Вы
            </span>
            <strong>Время, название и детали</strong>
          </div>
          <div>
            <span>
              <EyeOff size={17} /> Принятые друзья
            </span>
            <strong>
              {user.data.share_details_with_friends || temporaryActive
                ? 'Названия открытых событий'
                : 'Только «Занят»'}
            </strong>
          </div>
          <div>
            <span>
              <LockKeyhole size={17} /> Остальные
            </span>
            <strong>Ничего</strong>
          </div>
        </GlassPanel>
      </section>
      <section className="settings-section">
        <h2>Детали событий</h2>
        <GlassPanel className="settings-list">
          <label className="toggle-row">
            <Eye size={19} />
            <span>
              <strong>Показывать постоянно</strong>
              <small>Только для событий с открытыми деталями</small>
            </span>
            <input
              type="checkbox"
              checked={user.data.share_details_with_friends ?? true}
              onChange={(event) =>
                void save(
                  { share_details_with_friends: event.target.checked },
                  'Доступ к деталям обновлён',
                )
              }
            />
            <i />
          </label>
          <button
            type="button"
            onClick={() => {
              const until = new Date()
              until.setHours(until.getHours() + 24)
              void save(
                { share_details_with_friends: false, details_access_until: until.toISOString() },
                'Детали открыты на 24 часа',
              )
            }}
          >
            <Clock3 size={19} />
            <span>
              <strong>Временный доступ на 24 часа</strong>
              <small>
                {temporaryActive
                  ? `Активен до ${new Date(user.data.details_access_until!).toLocaleString('ru-RU')}`
                  : 'Автоматически закроется'}
              </small>
            </span>
          </button>
        </GlassPanel>
      </section>
      <section className="settings-section">
        <h2>Новые события</h2>
        <div className="visibility-options">
          <button
            type="button"
            className={user.data.default_visibility === 'open' ? 'is-active' : ''}
            onClick={() => void save({ default_visibility: 'open' }, 'Новые события будут открыты')}
          >
            <Eye size={19} />
            <span>
              <strong>Показывать название</strong>
              <small>Можно изменить для отдельного события</small>
            </span>
          </button>
          <button
            type="button"
            className={user.data.default_visibility !== 'open' ? 'is-active' : ''}
            onClick={() =>
              void save({ default_visibility: 'closed' }, 'Новые события будут скрыты')
            }
          >
            <LockKeyhole size={19} />
            <span>
              <strong>Только «Занят»</strong>
              <small>Безопасный вариант по умолчанию</small>
            </span>
          </button>
        </div>
      </section>
      <Toast message={toast} onClose={() => setToast(null)} />
    </div>
  )
}

import { useMemo, useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CalendarDays,
  Clock3,
  LockKeyhole,
  LogIn,
  PartyPopper,
  SearchCheck,
  UserPlus,
  UsersRound,
  WalletCards,
} from 'lucide-react'
import { apiRequest } from '../api/client'
import { ThemeBackground } from '../components/ThemeBackground'
import { timezoneOptionsWithCurrent } from '../lib/timezones'
import type { AuthResponse } from '../lib/types'

type AuthMode = 'login' | 'register'

type PreviewBlockStyle = CSSProperties & {
  '--top': string
  '--height': string
  '--tone': string
}

interface LoginPageProps {
  onAuthenticated: (auth: AuthResponse) => void
}

export function LoginPage({ onAuthenticated }: LoginPageProps) {
  const navigate = useNavigate()
  const [mode, setMode] = useState<AuthMode>('login')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [username, setUsername] = useState('')
  const [timezone, setTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  )
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const title = mode === 'login' ? 'Войти в календарь' : 'Создать аккаунт'
  const actionText = mode === 'login' ? 'Войти' : 'Зарегистрироваться'
  const subtitle = useMemo(
    () =>
      mode === 'login'
        ? 'Продолжайте планировать общее время с друнами.'
        : 'Нужны только имя, логин и пароль. Друны увидят календарь после взаимной связи.',
    [mode],
  )

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const payload =
        mode === 'login'
          ? { username, password }
          : {
              password,
              first_name: firstName,
              last_name: lastName || undefined,
              username,
              timezone,
            }
      const auth = await apiRequest<AuthResponse>(
        mode === 'login' ? '/auth/login' : '/auth/register',
        {
          method: 'POST',
          body: JSON.stringify(payload),
        },
      )
      onAuthenticated(auth)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось авторизоваться')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="login-page">
      <div className="login-background" aria-hidden="true">
        <ThemeBackground />
      </div>
      <section className="public-hero" aria-label="О проекте «Время вместе»">
        <div className="login-hero__badge">
          <CalendarDays size={22} />
          <span>Время вместе</span>
        </div>
        <h1>Общий календарь для встреч без переписок на весь день</h1>
        <p>
          «Время вместе» помогает друнам и небольшим командам видеть только взаимную занятость,
          находить общие свободные окна и договариваться о встречах без раскрытия личных деталей.
        </p>
        <div className="public-hero__actions">
          <button type="button" onClick={() => setMode('register')}>
            <UserPlus size={19} />
            Создать аккаунт
          </button>
          <button type="button" onClick={() => setMode('login')}>
            <LogIn size={19} />
            Войти
          </button>
        </div>
      </section>

      <section className="public-story" aria-label="Возможности проекта">
        <article>
          <span>
            <UsersRound size={20} />
          </span>
          <h2>Только принятые друны</h2>
          <p>
            Календарь и связи закрыты от посторонних. Доступ появляется только после взаимного
            принятия.
          </p>
        </article>
        <article>
          <span>
            <SearchCheck size={20} />
          </span>
          <h2>Поиск общего времени</h2>
          <p>
            Выбираете участников, даты, часы и минимальную длительность, а система предлагает
            свободные интервалы.
          </p>
        </article>
        <article>
          <span>
            <LockKeyhole size={20} />
          </span>
          <h2>Приватность событий</h2>
          <p>
            Для личной занятости можно показывать друнам только статус «занят», без названия и
            деталей.
          </p>
        </article>
        <article>
          <span>
            <PartyPopper size={20} />
          </span>
          <h2>Праздники и открытки</h2>
          <p>
            Календарь отмечает праздник дня и открывает поздравительную карточку. В профиле можно
            выбрать категории или полностью скрыть праздники.
          </p>
        </article>
        <article>
          <span>
            <WalletCards size={20} />
          </span>
          <h2>Оплата и поддержка</h2>
          <p>
            Создание занятости сопровождается демонстрационной оплатой. Пожертвования и вся история
            расходов доступны в профиле.
          </p>
        </article>
      </section>

      <section className="public-preview" aria-label="Как выглядит планирование">
        <div className="mini-calendar-preview">
          <div>
            <strong>Июль</strong>
            <span>общее окно найдено</span>
          </div>
          <div className="preview-week">
            {['Пн', 'Вт', 'Ср', 'Чт', 'Пт'].map((day, index) => (
              <i key={day} className={index === 3 ? 'active' : ''}>
                {day}
              </i>
            ))}
          </div>
          <div className="preview-timeline">
            <b
              style={
                {
                  '--top': '18%',
                  '--height': '24%',
                  '--tone': 'var(--accent)',
                } as PreviewBlockStyle
              }
            >
              10:00
            </b>
            <b
              style={
                { '--top': '48%', '--height': '18%', '--tone': '#61d2c7' } as PreviewBlockStyle
              }
            >
              14:00
            </b>
            <em>16:00 — 17:30 свободно для всех</em>
          </div>
        </div>
        <div>
          <Clock3 size={26} />
          <h2>Сначала отметьте занятость, затем приглашайте людей</h2>
          <p>
            Доступны регистрация, друны, личные интервалы, общий поиск времени, предложения встреч,
            праздники с открытками и гибкие настройки профиля.
          </p>
        </div>
      </section>

      <section className="login-panel" aria-label={title}>
        <span className="auth-anchor">Авторизация</span>
        <div className="auth-tabs">
          <button
            className={mode === 'login' ? 'active' : ''}
            type="button"
            onClick={() => setMode('login')}
          >
            Вход
          </button>
          <button
            className={mode === 'register' ? 'active' : ''}
            type="button"
            onClick={() => setMode('register')}
          >
            Регистрация
          </button>
        </div>

        <header>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </header>

        <form className="auth-form" onSubmit={submit}>
          {mode === 'register' && (
            <>
              <label>
                Имя
                <input
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  placeholder="Тимофей"
                  required
                />
              </label>
              <label>
                Фамилия
                <input
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  placeholder="Иванов"
                />
              </label>
              <label>
                Часовой пояс
                <select value={timezone} onChange={(event) => setTimezone(event.target.value)}>
                  {timezoneOptionsWithCurrent(timezone).map((zone) => (
                    <option key={zone.value} value={zone.value}>
                      {zone.label}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
          <label>
            Логин
            <input
              autoCapitalize="none"
              autoComplete="username"
              spellCheck={false}
              placeholder="frokla"
              value={username}
              onChange={(event) => setUsername(event.target.value.replace(/^@/, ''))}
              minLength={3}
              pattern="[a-zA-Z0-9_.-]+"
              required
            />
          </label>
          <label>
            Пароль
            <input
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={mode === 'register' ? 4 : 1}
              required
            />
          </label>

          {mode === 'register' && (
            <p className="auth-hint">Пароль — от 4 символов. Пример логина: «tima_schedule».</p>
          )}

          {error && <p className="auth-error">{error}</p>}

          <button className="auth-submit" disabled={busy} type="submit">
            {mode === 'login' ? <LogIn size={20} /> : <UserPlus size={20} />}
            {busy ? 'Подождите…' : actionText}
          </button>
        </form>
      </section>
    </main>
  )
}

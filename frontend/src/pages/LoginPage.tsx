import { Suspense, lazy, useMemo, useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, Clock3, LockKeyhole, LogIn, SearchCheck, UserPlus, UsersRound } from 'lucide-react'
import { apiRequest } from '../api/client'
import type { AuthResponse } from '../lib/types'

type AuthMode = 'login' | 'register'
const TIMEZONE_OPTIONS = [
  'UTC',
  'Europe/Moscow',
  'Europe/Kaliningrad',
  'Europe/Amsterdam',
  'Europe/Berlin',
  'Europe/London',
  'Asia/Tbilisi',
  'Asia/Dubai',
  'Asia/Almaty',
  'Asia/Yekaterinburg',
  'Asia/Novosibirsk',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
]

type PreviewBlockStyle = CSSProperties & {
  '--top': string
  '--height': string
  '--tone': string
}

const PixelBlast = lazy(() => import('../components/PixelBlast').then((module) => ({ default: module.PixelBlast })))

interface LoginPageProps {
  onAuthenticated: (auth: AuthResponse) => void
}

export function LoginPage({ onAuthenticated }: LoginPageProps) {
  const navigate = useNavigate()
  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [username, setUsername] = useState('')
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const title = mode === 'login' ? 'Войти в календарь' : 'Создать аккаунт'
  const actionText = mode === 'login' ? 'Войти' : 'Зарегистрироваться'
  const subtitle = useMemo(
    () =>
      mode === 'login'
        ? 'Продолжайте планировать общее время с друзьями.'
        : 'Нужны только имя, email и пароль. Друзья увидят календарь после взаимной связи.',
    [mode],
  )

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const payload =
        mode === 'login'
          ? { email, password }
          : {
              email,
              password,
              first_name: firstName,
              last_name: lastName || undefined,
              username: username || undefined,
              timezone,
            }
      const auth = await apiRequest<AuthResponse>(mode === 'login' ? '/auth/login' : '/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
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
        <Suspense fallback={null}>
          <PixelBlast
            variant="circle"
            pixelSize={6}
            color="#8b7dff"
            patternScale={2.5}
            patternDensity={1.1}
            pixelSizeJitter={0.5}
            enableRipples
            rippleSpeed={0.4}
            rippleThickness={0.12}
            rippleIntensityScale={1.5}
            liquid
            liquidStrength={0.12}
            liquidRadius={1.2}
            liquidWobbleSpeed={5}
            speed={0.6}
            edgeFade={0.22}
            transparent
          />
        </Suspense>
      </div>
      <section className="public-hero" aria-label="О проекте TimeTogether">
        <div className="login-hero__badge">
          <CalendarDays size={22} />
          <span>TimeTogether</span>
        </div>
        <h1>Общий календарь для встреч без переписок на весь день</h1>
        <p>
          TimeTogether помогает друзьям и небольшим командам видеть только взаимную занятость,
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
          <h2>Только принятые друзья</h2>
          <p>Календарь и связи закрыты от посторонних. Доступ появляется только после взаимного принятия.</p>
        </article>
        <article>
          <span>
            <SearchCheck size={20} />
          </span>
          <h2>Поиск общего времени</h2>
          <p>Выбираете участников, даты, часы и минимальную длительность, а система предлагает свободные интервалы.</p>
        </article>
        <article>
          <span>
            <LockKeyhole size={20} />
          </span>
          <h2>Приватность событий</h2>
          <p>Для личной занятости можно показывать друзьям только статус «занят», без названия и деталей.</p>
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
            <b style={{ '--top': '18%', '--height': '24%', '--tone': 'var(--accent)' } as PreviewBlockStyle}>
              10:00
            </b>
            <b style={{ '--top': '48%', '--height': '18%', '--tone': '#61d2c7' } as PreviewBlockStyle}>
              14:00
            </b>
            <em>16:00 — 17:30 свободно для всех</em>
          </div>
        </div>
        <div>
          <Clock3 size={26} />
          <h2>Сначала отметьте занятость, затем приглашайте людей</h2>
          <p>
            Для MVP доступны регистрация, друзья, личные интервалы, общий поиск времени,
            предложения встреч и настройки профиля.
          </p>
        </div>
      </section>

      <section className="login-panel" aria-label={title}>
        <span className="auth-anchor">Авторизация</span>
        <div className="auth-tabs">
          <button className={mode === 'login' ? 'active' : ''} type="button" onClick={() => setMode('login')}>
            Вход
          </button>
          <button className={mode === 'register' ? 'active' : ''} type="button" onClick={() => setMode('register')}>
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
                @username
                <input
                  autoCapitalize="none"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="frokla"
                />
              </label>
              <label>
                Часовой пояс
                <select value={timezone} onChange={(event) => setTimezone(event.target.value)}>
                  {TIMEZONE_OPTIONS.map((zone) => (
                    <option key={zone} value={zone}>
                      {zone}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
          <label>
            Email
            <input
              autoCapitalize="none"
              autoComplete="email"
              inputMode="email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
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
              minLength={mode === 'register' ? 8 : 1}
              required
            />
          </label>

          {mode === 'register' && (
            <p className="auth-hint">
              Примеры: имя «Тимофей», username «tima_schedule», email «name@example.com».
            </p>
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

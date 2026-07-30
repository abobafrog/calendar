import { useMemo, useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CalendarDays,
  Check,
  Clock3,
  LockKeyhole,
  LogIn,
  PartyPopper,
  SearchCheck,
  Sparkles,
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
  const [demoPeople, setDemoPeople] = useState([1, 2, 3])
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

      <section className="public-demo" aria-label="Интерактивное демо поиска времени">
        <div className="public-demo__copy">
          <span>
            <Sparkles size={17} /> Демо без регистрации
          </span>
          <h2>Выберите участников — окно найдётся сразу</h2>
          <p>
            Попробуйте убрать кого-нибудь из компании: результат пересчитается прямо на странице.
          </p>
        </div>
        <div className="demo-people">
          {[
            ['А', 'Аня', 1],
            ['М', 'Миша', 2],
            ['Л', 'Лена', 3],
          ].map(([letter, name, rawId]) => {
            const id = Number(rawId)
            const active = demoPeople.includes(id)
            return (
              <button
                key={id}
                type="button"
                className={active ? 'is-active' : ''}
                onClick={() =>
                  setDemoPeople((items) =>
                    active ? items.filter((item) => item !== id) : [...items, id],
                  )
                }
              >
                <i>{letter}</i>
                <span>{name}</span>
                {active && <Check size={14} />}
              </button>
            )
          })}
        </div>
        <div className="demo-result">
          <div className="demo-result__days">
            {['Пн', 'Вт', 'Ср', 'Чт', 'Пт'].map((day) => (
              <span
                key={day}
                className={
                  day === (demoPeople.length === 3 ? 'Чт' : demoPeople.length === 2 ? 'Ср' : 'Вт')
                    ? 'is-active'
                    : ''
                }
              >
                {day}
              </span>
            ))}
          </div>
          {demoPeople.length ? (
            <div className="demo-result__slot">
              <span>
                <strong>
                  {demoPeople.length === 3
                    ? 'Четверг, 19:00–21:00'
                    : demoPeople.length === 2
                      ? 'Среда, 18:30–21:00'
                      : 'Вторник, 18:00–22:00'}
                </strong>
                <small>
                  {demoPeople.length === 3
                    ? 'Все трое свободны'
                    : `${demoPeople.length} участника свободны`}
                </small>
              </span>
              <b>Лучшее окно</b>
            </div>
          ) : (
            <div className="demo-result__empty">Выберите хотя бы одного участника</div>
          )}
        </div>
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

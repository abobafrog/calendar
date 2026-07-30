import { Check, Copy, Pencil, Search, ShieldBan, UserMinus, UserPlus, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { GlassButton } from '../components/GlassButton'
import { GlassPanel } from '../components/GlassPanel'
import { Toast } from '../components/Toast'
import { ModalSheet } from '../components/ModalSheet'
import { UserAvatar } from '../components/UserAvatar'
import {
  useCreateFriendRequest,
  useCancelFriendRequest,
  useCurrentUser,
  useFriendAction,
  useFriendInvitePreview,
  useFriendRequestResponse,
  useFriends,
  useIncomingFriendRequests,
  useOutgoingFriendRequests,
  useRenameFriend,
  useUserSearch,
} from '../api/hooks'

export function FriendsPage() {
  const [tab, setTab] = useState<'friends' | 'incoming' | 'outgoing'>('friends')
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const currentUserQuery = useCurrentUser()
  const friendsQuery = useFriends()
  const incomingQuery = useIncomingFriendRequests()
  const outgoingQuery = useOutgoingFriendRequests()
  const createRequest = useCreateFriendRequest()
  const cancelRequest = useCancelFriendRequest()
  const requestResponse = useFriendRequestResponse()
  const friendAction = useFriendAction()
  const renameFriend = useRenameFriend()
  const userSearch = useUserSearch(debouncedQuery)
  const visibleFriends = friendsQuery.data ?? []
  const incomingRequests = incomingQuery.data ?? []
  const outgoingRequests = outgoingQuery.data ?? []
  const inviteCode = currentUserQuery.data?.invite_code ?? ''
  const inviterName = currentUserQuery.data?.first_name ?? ''
  const inviteParams = new URLSearchParams({ invite: inviteCode })
  const inviteLink = `${window.location.origin}/friends?${inviteParams.toString()}`
  const receivedInviteCode = searchParams.get('invite') ?? ''
  const invitePreview = useFriendInvitePreview(receivedInviteCode)
  const normalizedQuery = query.trim().replace(/^@/, '').toLowerCase()
  const showError = useCallback(
    (error: unknown) => setToast(error instanceof Error ? error.message : 'Операция не выполнена'),
    [],
  )
  const invalidateSocialData = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['friends'], refetchType: 'active' })
    await queryClient.invalidateQueries({ queryKey: ['friend-requests'], refetchType: 'active' })
  }, [queryClient])

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(normalizedQuery), 350)
    return () => window.clearTimeout(timer)
  }, [normalizedQuery])
  return (
    <div className="page">
      <header className="page-header">
        <div>
          <span className="eyebrow">Связи</span>
          <h1>Друны</h1>
        </div>
        <span className="number-badge">{visibleFriends.length}</span>
      </header>
      <div className="segmented-control segmented-control--wide">
        <button
          type="button"
          className={tab === 'friends' ? 'is-active' : ''}
          onClick={() => setTab('friends')}
        >
          Мои
        </button>
        <button
          type="button"
          className={tab === 'incoming' ? 'is-active' : ''}
          onClick={() => setTab('incoming')}
        >
          Входящие <i>{incomingRequests.length}</i>
        </button>
        <button
          type="button"
          className={tab === 'outgoing' ? 'is-active' : ''}
          onClick={() => setTab('outgoing')}
        >
          Исходящие <i>{outgoingRequests.length}</i>
        </button>
      </div>
      {tab === 'friends' && (
        <>
          <GlassPanel className="search-panel">
            <Search size={19} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              name="exact-username"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              inputMode="text"
              placeholder="Точный логин"
              aria-label="Поиск по точному логину"
            />
            <GlassButton
              variant="primary"
              disabled={!normalizedQuery}
              onClick={() => setDebouncedQuery(normalizedQuery)}
            >
              Найти
            </GlassButton>
          </GlassPanel>
          {normalizedQuery && (
            <div className="user-search-results" aria-live="polite">
              {userSearch.isFetching && <p className="search-hint">Ищем пользователей…</p>}
              {!userSearch.isFetching && debouncedQuery && userSearch.data?.length === 0 && (
                <p className="search-hint">Совпадений не найдено.</p>
              )}
              {userSearch.data?.map((user) => (
                <article key={user.id} className="person-row user-search-result">
                  <UserAvatar user={user} />
                  <div>
                    <strong>{`${user.first_name} ${user.last_name ?? ''}`.trim()}</strong>
                    <span>@{user.username}</span>
                  </div>
                  <button
                    type="button"
                    className="search-add-button"
                    aria-label={`Добавить @${user.username}`}
                    disabled={createRequest.isPending}
                    onClick={async () => {
                      try {
                        await createRequest.mutateAsync({ username: user.username ?? undefined })
                        setQuery('')
                        setDebouncedQuery('')
                        setToast('Приглашение отправлено')
                        await invalidateSocialData()
                      } catch (error) {
                        showError(error)
                      }
                    }}
                  >
                    <UserPlus size={18} />
                    <span>Добавить</span>
                  </button>
                </article>
              ))}
            </div>
          )}
          <section className="list-section">
            <h2>Мои друны</h2>
            <div className="people-list">
              {visibleFriends.map((friend) => (
                <article key={friend.id} className="person-row">
                  <UserAvatar user={friend} status />
                  <div>
                    <strong>
                      {friend.alias || `${friend.first_name} ${friend.last_name ?? ''}`.trim()}
                    </strong>
                    <span>@{friend.username}</span>
                  </div>
                  <div className="row-actions">
                    <button
                      type="button"
                      aria-label="Переименовать друна"
                      onClick={async () => {
                        const next = window.prompt(
                          'Имя друна только для вас',
                          friend.alias ?? friend.first_name,
                        )
                        if (next === null) return
                        try {
                          await renameFriend.mutateAsync({
                            userId: friend.id,
                            alias: next.trim() || null,
                          })
                          setToast('Имя сохранено только у вас')
                          await invalidateSocialData()
                        } catch (error) {
                          showError(error)
                        }
                      }}
                    >
                      <Pencil size={17} />
                    </button>
                    <button
                      type="button"
                      aria-label="Удалить из друнов"
                      onClick={async () => {
                        try {
                          await friendAction.mutateAsync({ userId: friend.id, action: 'remove' })
                          setToast('Друн удалён')
                          await invalidateSocialData()
                        } catch (error) {
                          showError(error)
                        }
                      }}
                    >
                      <UserMinus size={18} />
                    </button>
                    <button
                      type="button"
                      aria-label="Заблокировать"
                      onClick={async () => {
                        try {
                          await friendAction.mutateAsync({ userId: friend.id, action: 'block' })
                          setToast('Пользователь заблокирован')
                          await invalidateSocialData()
                        } catch (error) {
                          showError(error)
                        }
                      }}
                    >
                      <ShieldBan size={18} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
          <GlassPanel className="invite-panel">
            <div>
              <span>Персональная ссылка</span>
              <strong>Приглашает {inviterName || 'пользователь'}</strong>
            </div>
            <GlassButton
              variant="icon"
              aria-label="Скопировать ссылку"
              onClick={() => {
                void navigator.clipboard?.writeText(inviteLink)
                setToast('Ссылка скопирована')
              }}
            >
              <Copy size={19} />
            </GlassButton>
          </GlassPanel>
        </>
      )}
      {tab === 'incoming' && (
        <section className="list-section">
          <h2>Новые приглашения</h2>
          {incomingRequests.length ? (
            <div className="people-list">
              {incomingRequests.map((request) => (
                <article key={request.id} className="person-row">
                  <UserAvatar user={request.user} />
                  <div>
                    <strong>{request.user.first_name}</strong>
                    <span>@{request.user.username}</span>
                  </div>
                  <div className="row-actions">
                    <button
                      type="button"
                      className="accept"
                      aria-label="Принять"
                      onClick={async () => {
                        try {
                          await requestResponse.mutateAsync({ id: request.id, action: 'accept' })
                          setToast('Приглашение принято')
                          await invalidateSocialData()
                        } catch (error) {
                          showError(error)
                        }
                      }}
                    >
                      <Check size={19} />
                    </button>
                    <button
                      type="button"
                      className="reject"
                      aria-label="Отклонить"
                      onClick={async () => {
                        try {
                          await requestResponse.mutateAsync({ id: request.id, action: 'reject' })
                          setToast('Приглашение отклонено')
                          await invalidateSocialData()
                        } catch (error) {
                          showError(error)
                        }
                      }}
                    >
                      <X size={19} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state empty-state--requests">
              <div>
                <UserPlus size={26} />
              </div>
              <h2>Пока нет приглашений</h2>
              <p>Новые входящие приглашения появятся здесь.</p>
            </div>
          )}
        </section>
      )}
      {tab === 'outgoing' && (
        <section className="list-section outgoing-requests">
          <h2>Отправленные приглашения</h2>
          {outgoingRequests.length ? (
            <div className="people-list">
              {outgoingRequests.map((request) => (
                <article key={request.id} className="person-row">
                  <UserAvatar user={request.user} />
                  <div>
                    <strong>
                      {`${request.user.first_name} ${request.user.last_name ?? ''}`.trim()}
                    </strong>
                    <span>@{request.user.username}</span>
                  </div>
                  <div className="outgoing-request-actions">
                    <span className="request-status">Ожидает ответа</span>
                    <button
                      type="button"
                      className="cancel-request-button"
                      disabled={cancelRequest.isPending}
                      onClick={async () => {
                        try {
                          await cancelRequest.mutateAsync(request.id)
                          setToast('Приглашение отменено')
                          await invalidateSocialData()
                        } catch (error) {
                          showError(error)
                        }
                      }}
                    >
                      <X size={16} />
                      Отменить
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div>
                <Search size={26} />
              </div>
              <h2>Нет ожидающих запросов</h2>
              <p>Отправленные приглашения появятся здесь.</p>
            </div>
          )}
        </section>
      )}
      <Toast message={toast} onClose={() => setToast(null)} />
      <ModalSheet
        open={Boolean(receivedInviteCode)}
        title="Приглашение в друны"
        onClose={() => setSearchParams({})}
      >
        <div className="invite-confirmation">
          {invitePreview.isLoading ? (
            <p>Проверяем приглашение…</p>
          ) : invitePreview.data ? (
            <>
              <UserAvatar user={invitePreview.data} size="lg" />
              <div>
                <strong>{invitePreview.data.first_name} приглашает вас</strong>
                <span>@{invitePreview.data.username}</span>
              </div>
              <GlassButton
                variant="primary"
                disabled={createRequest.isPending}
                onClick={async () => {
                  try {
                    await createRequest.mutateAsync({ invite_code: receivedInviteCode })
                    setSearchParams({})
                    setToast('Запрос в друны отправлен')
                    await invalidateSocialData()
                  } catch (error) {
                    showError(error)
                  }
                }}
              >
                <UserPlus size={18} />
                Отправить запрос
              </GlassButton>
            </>
          ) : (
            <>
              <strong>Приглашение недействительно</strong>
              <GlassButton onClick={() => setSearchParams({})}>Закрыть</GlassButton>
            </>
          )}
        </div>
      </ModalSheet>
    </div>
  )
}

import { Check, Copy, Search, ShieldBan, UserMinus, X } from 'lucide-react'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { GlassButton } from '../components/GlassButton'
import { GlassPanel } from '../components/GlassPanel'
import { Toast } from '../components/Toast'
import { UserAvatar } from '../components/UserAvatar'
import {
  useCreateFriendRequest,
  useCurrentUser,
  useFriendAction,
  useFriendRequestResponse,
  useFriends,
  useIncomingFriendRequests,
  useOutgoingFriendRequests,
} from '../api/hooks'

export function FriendsPage() {
  const [tab, setTab] = useState<'friends' | 'incoming' | 'outgoing'>('friends')
  const [query, setQuery] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const queryClient = useQueryClient()
  const currentUserQuery = useCurrentUser()
  const friendsQuery = useFriends()
  const incomingQuery = useIncomingFriendRequests()
  const outgoingQuery = useOutgoingFriendRequests()
  const createRequest = useCreateFriendRequest()
  const requestResponse = useFriendRequestResponse()
  const friendAction = useFriendAction()
  const visibleFriends = friendsQuery.data ?? []
  const incomingRequests = incomingQuery.data ?? []
  const outgoingRequests = outgoingQuery.data ?? []
  const inviteLink = `https://t.me/${import.meta.env.VITE_BOT_USERNAME ?? 'lloooooo_bot'}?start=invite_${currentUserQuery.data?.invite_code ?? ''}`

  const showError = (error: unknown) => setToast(error instanceof Error ? error.message : 'Операция не выполнена')
  return (
    <div className="page">
      <header className="page-header">
        <div>
          <span className="eyebrow">Связи</span>
          <h1>Друзья</h1>
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
          Исходящие
        </button>
      </div>
      {tab === 'friends' && (
        <>
          <GlassPanel className="search-panel">
            <Search size={19} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Точный @username"
              aria-label="Поиск по точному username"
            />
            <GlassButton
              variant="primary"
              onClick={async () => {
                if (!query.trim()) {
                  setToast('Введите точный username')
                  return
                }
                try {
                  await createRequest.mutateAsync({ username: query.trim().replace(/^@/, '') })
                  setQuery('')
                  setToast('Приглашение отправлено')
                  await queryClient.invalidateQueries({ queryKey: ['friend-requests'] })
                } catch (error) {
                  showError(error)
                }
              }}
            >
              Найти
            </GlassButton>
          </GlassPanel>
          <section className="list-section">
            <h2>Мои друзья</h2>
            <div className="people-list">
              {visibleFriends.map((friend) => (
                <article key={friend.id} className="person-row">
                  <UserAvatar user={friend} status />
                  <div>
                    <strong>
                      {friend.first_name} {friend.last_name}
                    </strong>
                    <span>@{friend.username}</span>
                  </div>
                  <div className="row-actions">
                    <button
                      type="button"
                      aria-label="Удалить из друзей"
                      onClick={async () => {
                        try {
                          await friendAction.mutateAsync({ userId: friend.id, action: 'remove' })
                          setToast('Друг удалён')
                          await queryClient.invalidateQueries({ queryKey: ['friends'] })
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
                          await queryClient.invalidateQueries({ queryKey: ['friends'] })
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
              <strong>Пригласить через Telegram</strong>
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
                        await queryClient.invalidateQueries({ queryKey: ['friends'] })
                        await queryClient.invalidateQueries({ queryKey: ['friend-requests'] })
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
                        await queryClient.invalidateQueries({ queryKey: ['friend-requests'] })
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
        </section>
      )}
      {tab === 'outgoing' && (
        <div className="empty-state">
          <div>
            <Search size={26} />
          </div>
          <h2>{outgoingRequests.length ? `Ожидающих запросов: ${outgoingRequests.length}` : 'Нет ожидающих запросов'}</h2>
          <p>Для приватности поиск работает только по точному username или ссылке.</p>
        </div>
      )}
      <Toast message={toast} onClose={() => setToast(null)} />
    </div>
  )
}

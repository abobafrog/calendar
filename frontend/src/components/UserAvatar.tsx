import type { User } from '../lib/types'

const palettes = [
  'avatar--violet',
  'avatar--rose',
  'avatar--amber',
  'avatar--green',
  'avatar--cyan',
]

export function UserAvatar({
  user,
  size = 'md',
  status,
}: {
  user: User
  size?: 'sm' | 'md' | 'lg'
  status?: boolean
}) {
  const initials = `${user.first_name[0] ?? ''}${user.last_name?.[0] ?? ''}`
  return (
    <span
      className={`avatar avatar--${size} ${palettes[user.id % palettes.length]}`}
      aria-label={`${user.first_name} ${user.last_name ?? ''}`}
    >
      {user.photo_url ? <img src={user.photo_url} alt="" /> : <span>{initials}</span>}
      {status !== undefined && <i className={status ? 'status-online' : 'status-offline'} />}
    </span>
  )
}

export function AvatarStack({ users, limit = 4 }: { users: User[]; limit?: number }) {
  const visible = users.slice(0, limit)
  return (
    <div className="avatar-stack" aria-label={`Участников: ${users.length}`}>
      {visible.map((user) => (
        <UserAvatar key={user.id} user={user} size="sm" />
      ))}
      {users.length > limit && (
        <span className="avatar avatar--sm avatar--more">+{users.length - limit}</span>
      )}
    </div>
  )
}

import { Check } from 'lucide-react'
import type { Friend } from '../lib/types'
import { UserAvatar } from './UserAvatar'

export function FriendSelector({
  friends,
  selected,
  onChange,
}: {
  friends: Friend[]
  selected: number[]
  onChange: (ids: number[]) => void
}) {
  const toggle = (id: number) =>
    onChange(selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id])
  return (
    <div className="friend-selector" aria-label="Выбор друнов">
      {friends.map((friend) => {
        const active = selected.includes(friend.id)
        return (
          <button
            key={friend.id}
            type="button"
            className={active ? 'friend-chip is-active' : 'friend-chip'}
            onClick={() => toggle(friend.id)}
            aria-pressed={active}
          >
            <span className="friend-chip__avatar">
              <UserAvatar user={friend} size="md" />
              {active && (
                <i>
                  <Check size={11} strokeWidth={3} />
                </i>
              )}
            </span>
            <span>{friend.alias || friend.first_name}</span>
          </button>
        )
      })}
    </div>
  )
}

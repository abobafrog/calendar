import { ArrowLeft, Clock3, Plus, Sparkles, Trash2, UsersRound } from 'lucide-react'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { apiRequest } from '../api/client'
import { useCreateGroup, useFriends, useGroupSuggestions, useGroups } from '../api/hooks'
import { FriendSelector } from '../components/FriendSelector'
import { GlassButton } from '../components/GlassButton'
import { GlassPanel } from '../components/GlassPanel'
import { ModalSheet } from '../components/ModalSheet'
import { Toast } from '../components/Toast'
import { AvatarStack } from '../components/UserAvatar'
import { formatDateInZone, formatTimeInZone } from '../lib/time'

export function GroupsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const groups = useGroups()
  const friends = useFriends()
  const createGroup = useCreateGroup()
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [members, setMembers] = useState<number[]>([])
  const [duration, setDuration] = useState(60)
  const [start, setStart] = useState('18:00')
  const [end, setEnd] = useState('22:00')
  const [activeGroup, setActiveGroup] = useState<number | null>(null)
  const suggestions = useGroupSuggestions(activeGroup)
  const [toast, setToast] = useState<string | null>(null)
  const currentGroup = groups.data?.find((group) => group.id === activeGroup)

  return (
    <div className="page groups-page">
      <header className="subpage-header">
        <GlassButton variant="icon" onClick={() => navigate(-1)} aria-label="Назад">
          <ArrowLeft size={21} />
        </GlassButton>
        <h1>Постоянные группы</h1>
        <GlassButton variant="icon" onClick={() => setCreating(true)} aria-label="Новая группа">
          <Plus size={19} />
        </GlassButton>
      </header>

      <p className="page-intro">
        Сохраните состав, обычную длительность и удобные часы — следующий поиск займёт одно касание.
      </p>
      <div className="group-list">
        {groups.data?.map((group) => (
          <GlassPanel key={group.id} className="group-card">
            <div className="group-card__head">
              <span>
                <UsersRound size={19} />
              </span>
              <div>
                <strong>{group.name}</strong>
                <small>
                  {group.duration_minutes} мин · {group.preferred_start.slice(0, 5)}–
                  {group.preferred_end.slice(0, 5)}
                </small>
              </div>
              <button
                type="button"
                aria-label="Удалить группу"
                onClick={async () => {
                  if (!window.confirm(`Удалить группу «${group.name}»?`)) return
                  await apiRequest(`/groups/${group.id}`, { method: 'DELETE' })
                  await queryClient.invalidateQueries({ queryKey: ['groups'] })
                }}
              >
                <Trash2 size={16} />
              </button>
            </div>
            <div className="group-card__people">
              <AvatarStack users={group.members} />
              <span>{group.members.length} участников</span>
            </div>
            <GlassButton variant="primary" onClick={() => setActiveGroup(group.id)}>
              <Sparkles size={17} />
              Предложить лучшее время
            </GlassButton>
          </GlassPanel>
        ))}
      </div>
      {!groups.isLoading && !groups.data?.length && (
        <div className="empty-state">
          <div>
            <UsersRound size={26} />
          </div>
          <h2>Соберите первую группу</h2>
          <p>Например, «Семья», «Настолки» или «Команда проекта».</p>
        </div>
      )}

      <ModalSheet open={creating} title="Новая группа" onClose={() => setCreating(false)}>
        <div className="sheet-form">
          <label className="field">
            <span>Название</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Настолки"
            />
          </label>
          <div className="form-label">
            <span>Участники</span>
            <small>{members.length} выбрано</small>
          </div>
          <FriendSelector friends={friends.data ?? []} selected={members} onChange={setMembers} />
          <div className="field-row field-row--three">
            <label className="field">
              <span>Длительность</span>
              <select
                value={duration}
                onChange={(event) => setDuration(Number(event.target.value))}
              >
                <option value="30">30 мин</option>
                <option value="60">1 час</option>
                <option value="90">1,5 часа</option>
                <option value="120">2 часа</option>
              </select>
            </label>
            <label className="field">
              <span>От</span>
              <input type="time" value={start} onChange={(event) => setStart(event.target.value)} />
            </label>
            <label className="field">
              <span>До</span>
              <input type="time" value={end} onChange={(event) => setEnd(event.target.value)} />
            </label>
          </div>
          <GlassButton
            variant="primary"
            disabled={!name.trim() || !members.length || createGroup.isPending}
            onClick={async () => {
              try {
                await createGroup.mutateAsync({
                  name: name.trim(),
                  member_ids: members,
                  duration_minutes: duration,
                  preferred_start: start,
                  preferred_end: end,
                })
                await queryClient.invalidateQueries({ queryKey: ['groups'] })
                setCreating(false)
                setName('')
                setMembers([])
                setToast('Группа сохранена')
              } catch (error) {
                setToast(error instanceof Error ? error.message : 'Не удалось создать группу')
              }
            }}
          >
            Сохранить группу
          </GlassButton>
        </div>
      </ModalSheet>

      <ModalSheet
        open={activeGroup !== null}
        title={`Умные предложения${currentGroup ? ` · ${currentGroup.name}` : ''}`}
        onClose={() => setActiveGroup(null)}
      >
        <div className="suggestion-list">
          {suggestions.isLoading && (
            <p className="page-intro">Сверяем календари и комфортное время…</p>
          )}
          {suggestions.data?.suggestions.map((slot, index) => (
            <button
              key={slot.start_at}
              type="button"
              onClick={() =>
                navigate('/availability', {
                  state: {
                    participantIds: currentGroup?.members
                      .map((member) => member.id)
                      .filter(Boolean),
                    slot,
                    title: currentGroup?.name,
                  },
                })
              }
            >
              <span>{index + 1}</span>
              <div>
                <strong>{formatDateInZone(slot.start_at)}</strong>
                <small>
                  {formatTimeInZone(slot.start_at)} — {formatTimeInZone(slot.end_at)}
                </small>
              </div>
              <Clock3 size={18} />
            </button>
          ))}
          {!suggestions.isLoading && !suggestions.data?.suggestions.length && (
            <p className="page-intro">
              На ближайшей неделе комфортных окон нет. Измените часы группы или обычный поиск.
            </p>
          )}
        </div>
      </ModalSheet>
      <Toast message={toast} onClose={() => setToast(null)} />
    </div>
  )
}

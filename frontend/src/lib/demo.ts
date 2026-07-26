import type { BusyInterval, Friend, FriendRequest, FreeSlotData, Meeting, User } from './types'

export const currentUser: User = {
  id: 1,
  telegram_id: 900000001,
  username: 'daria_demo',
  first_name: 'Дарья',
  last_name: 'Орлова',
  photo_url: null,
  timezone: 'Europe/Moscow',
  invite_code: 'demo-daria-2026',
}

export const friends: Friend[] = [
  {
    id: 2,
    username: 'alex_demo',
    first_name: 'Алексей',
    last_name: 'Смирнов',
    photo_url: null,
    friendship_id: 1,
    friends_since: '2026-07-01T12:00:00Z',
  },
  {
    id: 3,
    username: 'maria_demo',
    first_name: 'Мария',
    last_name: 'Ким',
    photo_url: null,
    friendship_id: 2,
    friends_since: '2026-07-04T12:00:00Z',
  },
  {
    id: 4,
    username: 'ivan_demo',
    first_name: 'Иван',
    last_name: 'Петров',
    photo_url: null,
    friendship_id: 3,
    friends_since: '2026-07-10T12:00:00Z',
  },
  {
    id: 5,
    username: 'katya_demo',
    first_name: 'Екатерина',
    last_name: 'Волкова',
    photo_url: null,
    friendship_id: 4,
    friends_since: '2026-07-13T12:00:00Z',
  },
]

const at = (dayDelta: number, hour: number, minute = 0) => {
  const date = new Date()
  date.setDate(date.getDate() + dayDelta)
  date.setHours(hour, minute, 0, 0)
  return date.toISOString()
}

export const intervals: BusyInterval[] = [
  {
    id: 1,
    user_id: 1,
    start_at: at(0, 9),
    end_at: at(0, 10, 30),
    title: 'Планирование',
    visibility: 'private',
  },
  {
    id: 2,
    user_id: 1,
    start_at: at(0, 12),
    end_at: at(0, 13),
    title: 'Обед',
    visibility: 'friends',
  },
  {
    id: 3,
    user_id: 1,
    start_at: at(0, 15),
    end_at: at(0, 16, 30),
    title: 'Работа над проектом',
    visibility: 'private',
  },
  {
    id: 4,
    user_id: 2,
    start_at: at(0, 10),
    end_at: at(0, 12),
    title: 'Занят',
    visibility: 'private',
  },
  {
    id: 5,
    user_id: 3,
    start_at: at(0, 13),
    end_at: at(0, 14, 30),
    title: 'Дизайн-ревью',
    visibility: 'friends',
  },
  { id: 6, user_id: 4, start_at: at(0, 16), end_at: at(0, 18), title: null, visibility: 'private' },
  {
    id: 7,
    user_id: 2,
    start_at: at(1, 11),
    end_at: at(1, 12, 30),
    title: 'Занят',
    visibility: 'private',
  },
]

export const incomingRequests: FriendRequest[] = [
  {
    id: 14,
    status: 'pending',
    user: { id: 8, username: 'dmitry', first_name: 'Дмитрий', last_name: null, photo_url: null },
  },
  {
    id: 15,
    status: 'pending',
    user: { id: 9, username: 'anna', first_name: 'Анна', last_name: null, photo_url: null },
  },
]

export const freeSlots: FreeSlotData[] = [
  { start_at: at(1, 10), end_at: at(1, 11), duration_minutes: 60 },
  { start_at: at(1, 12, 30), end_at: at(1, 14), duration_minutes: 90 },
  { start_at: at(2, 10), end_at: at(2, 11, 30), duration_minutes: 90 },
  { start_at: at(3, 15), end_at: at(3, 16), duration_minutes: 60 },
]

export const meetings: Meeting[] = [
  {
    id: 10,
    creator_id: 1,
    title: 'Обсуждение проекта',
    description: 'Сверим план и ближайшие задачи',
    start_at: at(1, 10),
    end_at: at(1, 11),
    status: 'pending',
    has_conflict: false,
    participants: [
      { id: 1, user: currentUser, response: 'accepted', responded_at: at(0, 8) },
      { id: 2, user: friends[0], response: 'accepted', responded_at: at(0, 9) },
      { id: 3, user: friends[1], response: 'pending', responded_at: null },
    ],
  },
  {
    id: 11,
    creator_id: 2,
    title: 'Планирование спринта',
    description: null,
    start_at: at(3, 15),
    end_at: at(3, 16),
    status: 'confirmed',
    has_conflict: false,
    participants: [
      { id: 4, user: currentUser, response: 'accepted', responded_at: at(0, 8) },
      { id: 5, user: friends[0], response: 'accepted', responded_at: at(0, 8) },
    ],
  },
]

export const userColors: Record<number, string> = {
  1: '#6657f5',
  2: '#ef7399',
  3: '#f39b4a',
  4: '#35aa78',
  5: '#24aeb5',
}

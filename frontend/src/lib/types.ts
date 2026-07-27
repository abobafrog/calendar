export type ThemeMode = 'light' | 'dark' | 'contrast'
export type Visibility = 'private' | 'friends' | 'hidden'
export type MeetingStatus = 'pending' | 'confirmed' | 'cancelled'
export type ResponseStatus = 'pending' | 'accepted' | 'declined'

export interface User {
  id: number
  telegram_id?: number
  username: string | null
  first_name: string
  last_name: string | null
  photo_url: string | null
  timezone?: string
  invite_code?: string
  week_starts_on?: number
  time_format?: '12h' | '24h'
  workday_start?: string
  workday_end?: string
  notifications_enabled?: boolean
}

export interface BusyInterval {
  id: number
  user_id: number
  meeting_id?: number | null
  start_at: string
  end_at: string
  title: string | null
  visibility: Visibility
}

export interface Friend extends User {
  friendship_id: number
  friends_since: string
}

export interface FriendRequest {
  id: number
  status: 'pending' | 'accepted' | 'rejected' | 'blocked'
  user: User
}

export interface UserCalendar {
  user: User
  intervals: BusyInterval[]
}

export interface MeetingParticipant {
  id: number
  user: User
  response: ResponseStatus
  responded_at: string | null
}

export interface Meeting {
  id: number
  creator_id: number
  title: string
  description: string | null
  start_at: string
  end_at: string
  status: MeetingStatus
  participants: MeetingParticipant[]
  has_conflict: boolean
}

export interface FreeSlotData {
  start_at: string
  end_at: string
  duration_minutes: number
}

export interface AuthResponse {
  access_token: string
  token_type: 'bearer'
  expires_at: string
  user: User
}

export interface SiteNotification {
  id: number
  user_id: number
  type: string
  payload: Record<string, unknown>
  read_at: string | null
  created_at: string
}

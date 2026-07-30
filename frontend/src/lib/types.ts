export type ThemeMode = 'light' | 'dark' | 'contrast'
export type Visibility = 'open' | 'closed'
export type MeetingStatus = 'pending' | 'confirmed' | 'cancelled'
export type ResponseStatus = 'pending' | 'accepted' | 'declined'
export type HolidayCategory =
  'Всемирный' | 'Международный' | 'Национальный' | 'Религиозный' | 'Необычный'

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
  sleep_start?: string
  sleep_end?: string
  minimum_break_minutes?: number
  undesirable_weekdays?: number[]
  default_visibility?: Visibility
  share_details_with_friends?: boolean
  details_access_until?: string | null
  notifications_enabled?: boolean
  holiday_categories?: HolidayCategory[]
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
  alias?: string | null
}

export interface FriendRequest {
  id: number
  status: 'pending' | 'accepted' | 'rejected' | 'blocked'
  user: User
}

export interface Holiday {
  title: string
  category: HolidayCategory
  date: string
  source_url: string
}

export type PaymentMethod = 'visa' | 'sbp' | 'mir_pay'
export type PaymentPurpose = 'busy_interval' | 'donation'

export interface PaymentRecord {
  id: number
  amount: number
  purpose: PaymentPurpose
  method: PaymentMethod
  created_at: string
}

export interface PaymentSummary {
  total_amount: number
  payments: PaymentRecord[]
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
  location: string | null
  meeting_url: string | null
  reminder_minutes: number
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

export interface PlanningGroup {
  id: number
  owner_id: number
  name: string
  duration_minutes: number
  preferred_start: string
  preferred_end: string
  members: User[]
  created_at: string
}

export interface PollOption {
  id: number
  start_at: string
  end_at: string
  yes: number
  maybe: number
  no: number
  score: number
}

export interface SchedulingPoll {
  id: number
  token: string
  title: string
  creator: User
  timezone: string
  duration_minutes: number
  status: 'open' | 'finalized'
  finalized_option_id: number | null
  voters: string[]
  options: PollOption[]
  created_at: string
}

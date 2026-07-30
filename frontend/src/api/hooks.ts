import { useMutation, useQuery } from '@tanstack/react-query'
import { apiRequest } from './client'
import type {
  BusyInterval,
  Friend,
  FriendRequest,
  FreeSlotData,
  Holiday,
  Meeting,
  PaymentRecord,
  PaymentSummary,
  SiteNotification,
  User,
  UserCalendar,
} from '../lib/types'

export function useCurrentUser() {
  return useQuery({
    queryKey: ['me'],
    queryFn: () => apiRequest<User>('/users/me'),
  })
}

export function useUpdateCurrentUser() {
  return useMutation({
    mutationFn: (payload: Partial<User>) =>
      apiRequest<User>('/users/me', { method: 'PATCH', body: JSON.stringify(payload) }),
  })
}

export function useFriends() {
  return useQuery({
    queryKey: ['friends'],
    queryFn: () => apiRequest<Friend[]>('/friends'),
    refetchInterval: 10_000,
  })
}

export function useIncomingFriendRequests() {
  return useQuery({
    queryKey: ['friend-requests', 'incoming'],
    queryFn: () => apiRequest<FriendRequest[]>('/friend-requests/incoming'),
    refetchInterval: 10_000,
  })
}

export function useOutgoingFriendRequests() {
  return useQuery({
    queryKey: ['friend-requests', 'outgoing'],
    queryFn: () => apiRequest<FriendRequest[]>('/friend-requests/outgoing'),
    refetchInterval: 10_000,
  })
}

export function useUserSearch(query: string) {
  return useQuery({
    enabled: query.length > 0,
    queryKey: ['users', 'search', query],
    queryFn: () => apiRequest<User[]>(`/users/search?query=${encodeURIComponent(query)}`),
    staleTime: 30_000,
  })
}

export function useCreateFriendRequest() {
  return useMutation({
    mutationFn: (payload: { username?: string; invite_code?: string }) =>
      apiRequest<FriendRequest>('/friend-requests', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  })
}

export function useFriendInvitePreview(inviteCode: string) {
  return useQuery({
    enabled: inviteCode.length >= 8,
    queryKey: ['friend-invite', inviteCode],
    queryFn: () => apiRequest<User>(`/friend-invites/${encodeURIComponent(inviteCode)}`),
    retry: false,
  })
}

export function useFriendRequestResponse() {
  return useMutation({
    mutationFn: ({ id, action }: { id: number; action: 'accept' | 'reject' }) =>
      apiRequest<FriendRequest>(`/friend-requests/${id}/${action}`, { method: 'POST' }),
  })
}

export function useCancelFriendRequest() {
  return useMutation({
    mutationFn: (id: number) => apiRequest<void>(`/friend-requests/${id}`, { method: 'DELETE' }),
  })
}

export function useTodayHoliday() {
  return useQuery({
    queryKey: ['holidays', 'today'],
    queryFn: () => apiRequest<Holiday | null>('/holidays/today'),
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    retry: 1,
  })
}

export function usePaymentSummary() {
  return useQuery({
    queryKey: ['payments', 'summary'],
    queryFn: () => apiRequest<PaymentSummary>('/payments/summary'),
  })
}

export function useCreateDonation() {
  return useMutation({
    mutationFn: (payload: { amount: number; method: PaymentRecord['method'] }) =>
      apiRequest<PaymentRecord>('/payments/donations', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  })
}

export function useFriendAction() {
  return useMutation({
    mutationFn: ({ userId, action }: { userId: number; action: 'remove' | 'block' }) =>
      apiRequest<void>(action === 'remove' ? `/friends/${userId}` : `/users/${userId}/block`, {
        method: action === 'remove' ? 'DELETE' : 'POST',
      }),
  })
}

export function useRenameFriend() {
  return useMutation({
    mutationFn: ({ userId, alias }: { userId: number; alias: string | null }) =>
      apiRequest<Friend>(`/friends/${userId}/alias`, {
        method: 'PATCH',
        body: JSON.stringify({ alias }),
      }),
  })
}

export function useCalendarRange(start: Date, end: Date) {
  const from = start.toISOString()
  const to = end.toISOString()
  return useQuery({
    queryKey: ['calendar', from, to],
    queryFn: () =>
      apiRequest<BusyInterval[]>(
        `/calendar/me?start_at=${encodeURIComponent(from)}&end_at=${encodeURIComponent(to)}`,
      ),
  })
}

export function useBusyInterval(id: number) {
  return useQuery({
    enabled: Number.isInteger(id) && id > 0,
    queryKey: ['calendar', 'interval', id],
    queryFn: () => apiRequest<BusyInterval>(`/calendar/intervals/${id}`),
  })
}

export function useFriendCalendarRange(start: Date, end: Date, userIds: number[]) {
  const from = start.toISOString()
  const to = end.toISOString()
  const sortedIds = [...userIds].sort((left, right) => left - right)
  const params = new URLSearchParams({ start_at: from, end_at: to })
  sortedIds.forEach((id) => params.append('user_ids', String(id)))
  return useQuery({
    enabled: sortedIds.length > 0,
    queryKey: ['calendar', 'friends', from, to, sortedIds],
    queryFn: () => apiRequest<UserCalendar[]>(`/calendar/friends?${params.toString()}`),
  })
}

export function useMeetings() {
  return useQuery({ queryKey: ['meetings'], queryFn: () => apiRequest<Meeting[]>('/meetings') })
}

export function useMeeting(id: number) {
  return useQuery({
    queryKey: ['meetings', id],
    queryFn: () => apiRequest<Meeting>(`/meetings/${id}`),
  })
}

export function useAvailabilitySearch() {
  return useMutation({
    mutationFn: (payload: {
      participant_ids: number[]
      date_from: string
      date_to: string
      daily_start: string
      daily_end: string
      minimum_duration_minutes: number
      weekdays: number[]
      include_weekends: boolean
      timezone: string
    }) =>
      apiRequest<{ slots: FreeSlotData[] }>('/availability/search', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  })
}

export function useCreateMeeting() {
  return useMutation({
    mutationFn: (payload: {
      title: string
      description?: string
      start_at: string
      end_at: string
      participant_ids: number[]
    }) => apiRequest<Meeting>('/meetings', { method: 'POST', body: JSON.stringify(payload) }),
  })
}

export function useMeetingResponse() {
  return useMutation({
    mutationFn: ({ id, action }: { id: number; action: 'accept' | 'decline' }) =>
      apiRequest<Meeting>(`/meetings/${id}/${action}`, { method: 'POST' }),
  })
}

export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: () => apiRequest<SiteNotification[]>('/notifications?unread_only=true&limit=50'),
    refetchInterval: 15_000,
  })
}

export function useMarkNotificationRead() {
  return useMutation({
    mutationFn: (id: number) =>
      apiRequest<SiteNotification>(`/notifications/${id}/read`, { method: 'POST' }),
  })
}

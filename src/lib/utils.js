import { format, differenceInCalendarDays, parseISO } from 'date-fns'

export function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}

export function formatCurrency(value, currency = 'USD') {
  const n = Number(value || 0)
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(n)
}

export function formatDate(value, fmt = 'MMM d, yyyy') {
  if (!value) return '—'
  const d = typeof value === 'string' ? parseISO(value) : value
  return format(d, fmt)
}

export function nights(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0
  const a = typeof checkIn === 'string' ? parseISO(checkIn) : checkIn
  const b = typeof checkOut === 'string' ? parseISO(checkOut) : checkOut
  return Math.max(0, differenceInCalendarDays(b, a))
}

export function initials(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('')
}

export const RESERVATION_STATUS = {
  pending: { label: 'Pending', tone: 'amber' },
  confirmed: { label: 'Confirmed', tone: 'blue' },
  checked_in: { label: 'Checked In', tone: 'green' },
  checked_out: { label: 'Checked Out', tone: 'gray' },
  cancelled: { label: 'Cancelled', tone: 'red' },
  no_show: { label: 'No Show', tone: 'red' },
}

export const ROOM_STATUS = {
  available: { label: 'Available', tone: 'green' },
  occupied: { label: 'Occupied', tone: 'blue' },
  dirty: { label: 'Needs Cleaning', tone: 'amber' },
  maintenance: { label: 'Maintenance', tone: 'red' },
}

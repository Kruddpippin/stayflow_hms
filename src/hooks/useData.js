import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import * as api from '@/services/api'

export const useRoomTypes = () => useQuery({ queryKey: ['room_types'], queryFn: api.getRoomTypes })
export const useRooms = () => useQuery({ queryKey: ['rooms'], queryFn: api.getRooms })
export const useGuests = () => useQuery({ queryKey: ['guests'], queryFn: api.getGuests })
export const useReservations = () => useQuery({ queryKey: ['reservations'], queryFn: api.getReservations })
export const useFolios = () => useQuery({ queryKey: ['folios'], queryFn: api.getFolios })

export function useMutate(fn, { invalidate = [], success } = {}) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      invalidate.forEach((key) => qc.invalidateQueries({ queryKey: [key] }))
      if (success) toast.success(success)
    },
    onError: (e) => toast.error(e?.message || 'Something went wrong'),
  })
}

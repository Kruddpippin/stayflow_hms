import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import * as api from '@/services/api'

let _propertyId = null
export function setActivePropertyId(id) { _propertyId = id }
export function getActivePropertyId() { return _propertyId }

export const useRoomTypes = () => useQuery({ queryKey: ['room_types', _propertyId], queryFn: () => api.getRoomTypes(_propertyId) })
export const useRooms = () => useQuery({ queryKey: ['rooms', _propertyId], queryFn: () => api.getRooms(_propertyId), refetchInterval: 30_000 })
export const useGuests = () => useQuery({ queryKey: ['guests', _propertyId], queryFn: () => api.getGuests(_propertyId) })
export const useReservations = () => useQuery({ queryKey: ['reservations', _propertyId], queryFn: () => api.getReservations(_propertyId), refetchInterval: 30_000 })
export const useFolios = () => useQuery({ queryKey: ['folios', _propertyId], queryFn: () => api.getFolios(_propertyId), refetchInterval: 30_000 })

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

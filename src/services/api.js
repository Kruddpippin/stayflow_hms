import { supabase } from './supabase'

const unwrap = ({ data, error }) => { if (error) throw error; return data }

/* ---------- Room Types ---------- */
export const getRoomTypes = () =>
  supabase.from('room_types').select('*').order('base_rate').then(unwrap)

/* ---------- Rooms ---------- */
export const getRooms = () =>
  supabase.from('rooms').select('*, room_type:room_types(*)').order('room_number').then(unwrap)
export const createRoom = (payload) => supabase.from('rooms').insert(payload).select().single().then(unwrap)
export const updateRoom = (id, payload) => supabase.from('rooms').update(payload).eq('id', id).select().single().then(unwrap)
export const deleteRoom = (id) => supabase.from('rooms').delete().eq('id', id).then(unwrap)

/* ---------- Guests ---------- */
export const getGuests = () => supabase.from('guests').select('*').order('full_name').then(unwrap)
export const createGuest = (payload) => supabase.from('guests').insert(payload).select().single().then(unwrap)
export const updateGuest = (id, payload) => supabase.from('guests').update(payload).eq('id', id).select().single().then(unwrap)
export const deleteGuest = (id) => supabase.from('guests').delete().eq('id', id).then(unwrap)

/* ---------- Reservations ---------- */
const RES_SELECT = '*, guest:guests(*), room:rooms(*), room_type:room_types(*)'
export const getReservations = () =>
  supabase.from('reservations').select(RES_SELECT).order('check_in', { ascending: false }).then(unwrap)
export const createReservation = (payload) =>
  supabase.from('reservations').insert(payload).select(RES_SELECT).single().then(unwrap)
export const updateReservation = (id, payload) =>
  supabase.from('reservations').update(payload).eq('id', id).select(RES_SELECT).single().then(unwrap)
export const deleteReservation = (id) => supabase.from('reservations').delete().eq('id', id).then(unwrap)

/* ---------- Billing: folios, charges, payments ---------- */
export const getFolios = () =>
  supabase.from('folios')
    .select('*, reservation:reservations(*, guest:guests(*), room:rooms(*)), charges(*), payments(*)')
    .order('created_at', { ascending: false }).then(unwrap)
export const addCharge = (payload) => supabase.from('charges').insert(payload).select().single().then(unwrap)
export const deleteCharge = (id) => supabase.from('charges').delete().eq('id', id).then(unwrap)
export const addPayment = (payload) => supabase.from('payments').insert(payload).select().single().then(unwrap)
export const closeFolio = (id) => supabase.from('folios').update({ status: 'closed' }).eq('id', id).then(unwrap)

/* ---------- Guest portal ---------- */
export const getMyGuestRecord = (profileId) =>
  supabase.from('guests').select('*').eq('profile_id', profileId).maybeSingle().then(unwrap)
export const ensureGuestRecord = async (profile) => {
  const existing = await getMyGuestRecord(profile.id)
  if (existing) return existing
  return supabase.from('guests')
    .insert({ profile_id: profile.id, full_name: profile.full_name, email: profile.email })
    .select().single().then(unwrap)
}
export const getMyReservations = (guestId) =>
  supabase.from('reservations').select(RES_SELECT).eq('guest_id', guestId)
    .order('check_in', { ascending: false }).then(unwrap)

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Hotel, Home, ChevronRight, Eye, EyeOff, ArrowRight } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/services/supabase'
import { Input, Select } from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import toast from 'react-hot-toast'

const FACILITY_TYPES = [
  'Hotel', 'Bed and Breakfast', 'Apartment', 'Resort', 'Villa',
  'Ryokan', 'Boutique', 'Hostel', 'Motel', 'Guest House', 'Lodge', 'Inn',
]
const COUNTRIES = [
  'Nigeria', 'Ghana', 'Kenya', 'South Africa', 'Tanzania', 'Uganda',
  'Rwanda', 'Ethiopia', 'Cameroon', 'Senegal', 'Egypt', 'Morocco',
  'United Kingdom', 'United States', 'Canada', 'Other',
]
const PHONE_CODES = [
  { code: '+234', country: 'NG' }, { code: '+233', country: 'GH' },
  { code: '+254', country: 'KE' }, { code: '+27', country: 'ZA' },
  { code: '+255', country: 'TZ' }, { code: '+256', country: 'UG' },
  { code: '+250', country: 'RW' }, { code: '+251', country: 'ET' },
  { code: '+237', country: 'CM' }, { code: '+221', country: 'SN' },
  { code: '+20', country: 'EG' }, { code: '+212', country: 'MA' },
  { code: '+44', country: 'UK' }, { code: '+1', country: 'US/CA' },
]
const TIMEZONES = [
  'Africa/Lagos', 'Africa/Accra', 'Africa/Nairobi', 'Africa/Johannesburg',
  'Africa/Cairo', 'Africa/Casablanca', 'Europe/London', 'America/New_York',
  'America/Chicago', 'America/Los_Angeles', 'America/Toronto',
]
const CURRENCIES = ['NGN', 'GHS', 'KES', 'ZAR', 'TZS', 'UGX', 'RWF', 'USD', 'GBP', 'EUR']
const SOCIAL_TYPES = ['Instagram', 'Facebook', 'Twitter/X', 'WhatsApp', 'LinkedIn', 'TikTok', 'Website']

export default function Signup() {
  const { signUp, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [userId, setUserId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showPw, setShowPw] = useState(false)

  const [account, setAccount] = useState({ fullName: '', email: '', password: '' })
  const [form, setForm] = useState({
    name: '', facility_type: 'Hotel', country: 'Nigeria', city: '', address: '',
    contact_name: '', phone_code: '+234', contact_phone: '',
    social_media_type: '', social_media_handle: '',
    timezone: 'Africa/Lagos', currency: 'NGN',
  })

  const setAcc = (k) => (e) => setAccount((f) => ({ ...f, [k]: e.target.value }))
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function handleAccountSubmit(e) {
    e.preventDefault()
    if (account.password.length < 6) return toast.error('Password must be at least 6 characters.')
    setLoading(true)
    try {
      const { data, error } = await signUp(account.email, account.password, account.fullName)
      if (error) throw error
      const uid = data.user?.id
      if (!uid) throw new Error('Account creation failed.')

      for (let i = 0; i < 15; i++) {
        const { data: p } = await supabase.from('profiles').select('id').eq('id', uid).single()
        if (p) break
        await new Promise((r) => setTimeout(r, 400))
      }

      await supabase.from('profiles').update({ role: 'admin' }).eq('id', uid)

      setUserId(uid)
      setForm((f) => ({ ...f, contact_name: account.fullName }))
      setStep(2)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handlePropertySubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) return toast.error('Property name is required.')
    if (!form.city.trim()) return toast.error('City is required.')
    if (!form.contact_name.trim()) return toast.error('Contact name is required.')
    if (!form.contact_phone.trim()) return toast.error('Phone number is required.')

    setLoading(true)
    try {
      const fullPhone = `${form.phone_code} ${form.contact_phone}`
      const { data: property, error: propErr } = await supabase.from('properties').insert({
        name: form.name, facility_type: form.facility_type.toLowerCase(),
        country: form.country, city: form.city, address: form.address || null,
        contact_name: form.contact_name, contact_phone: fullPhone,
        social_media_type: form.social_media_type || null,
        social_media_handle: form.social_media_handle || null,
        timezone: form.timezone, currency: form.currency, created_by: userId,
      }).select().single()
      if (propErr) throw propErr

      const { error: memErr } = await supabase.from('property_members').insert({
        property_id: property.id, profile_id: userId, role: 'admin',
      })
      if (memErr) throw memErr

      await supabase.from('profiles').update({ onboarded: true }).eq('id', userId)
      await refreshProfile()
      toast.success('Property created! Welcome to StayFlow.')
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.message || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-ink-50">
      <header className="border-b border-ink-200 bg-white">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-5">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-700 text-white"><Hotel size={16} /></div>
            <span className="text-sm font-semibold text-ink-900">StayFlow</span>
          </Link>
          <div className="flex items-center gap-2 text-xs text-ink-400">
            <span className={step >= 1 ? 'text-brand-700 font-medium' : ''}>Account</span>
            <ChevronRight size={12} />
            <span className={step >= 2 ? 'text-brand-700 font-medium' : ''}>Property</span>
          </div>
        </div>
      </header>

      {step === 1 ? (
        <div className="flex min-h-[calc(100vh-57px)] items-center justify-center p-6">
          <div className="w-full max-w-md">
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><Hotel size={24} /></div>
              <h1 className="text-2xl font-bold text-ink-900">Register your facility</h1>
              <p className="mt-1 text-sm text-ink-500">Create your admin account to get started.</p>
            </div>
            <div className="rounded-xl border border-ink-200 bg-white p-6">
              <form onSubmit={handleAccountSubmit} className="space-y-4">
                <Input id="fullName" label="Full name" required placeholder="Jane Doe" value={account.fullName} onChange={setAcc('fullName')} />
                <Input id="email" label="Email" type="email" required placeholder="you@hotel.com" value={account.email} onChange={setAcc('email')} />
                <div className="relative">
                  <Input id="password" label="Password" type={showPw ? 'text' : 'password'} required placeholder="At least 6 characters" value={account.password} onChange={setAcc('password')} />
                  <button type="button" onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3 top-[26px] rounded p-0.5 text-ink-400 hover:text-ink-600 transition-colors"
                    aria-label={showPw ? 'Hide password' : 'Show password'}>
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <div className="pt-2">
                  <Button type="submit" loading={loading} size="lg" className="w-full">Continue <ArrowRight size={16} /></Button>
                </div>
              </form>
            </div>
            <p className="mt-6 text-center text-sm text-ink-500">
              Already have an account? <Link to="/login" className="font-medium text-brand-700 hover:text-brand-800 hover:underline">Sign in</Link>
            </p>
          </div>
        </div>
      ) : (
        <div className="mx-auto max-w-xl px-5 py-10">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><Home size={24} /></div>
            <h1 className="text-2xl font-bold text-ink-900">Register your property</h1>
          </div>

          <div className="rounded-xl border border-ink-200 bg-white">
            <form onSubmit={handlePropertySubmit}>
              {/* Basic Property Information */}
              <div className="space-y-4 p-6">
                <h2 className="text-sm font-bold text-ink-800">Basic Property Information</h2>
                <Input id="name" label="Property name" required placeholder="New Property Name*" value={form.name} onChange={set('name')} />
                <Select id="facility_type" label="Facility type" value={form.facility_type} onChange={set('facility_type')}>
                  {FACILITY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </Select>
                <Select id="country" label="Country" value={form.country} onChange={set('country')}>
                  {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </Select>
                <Input id="city" label="City" required placeholder="City*" value={form.city} onChange={set('city')} />
                <Input id="address" label="Address" placeholder="Please enter address line" value={form.address} onChange={set('address')} />
              </div>

              <hr className="border-ink-100" />

              {/* Contact Details */}
              <div className="space-y-4 p-6">
                <h2 className="text-sm font-bold text-ink-800">Contact Details</h2>
                <Input id="contact_name" label="Contact name" required placeholder="Contact Name*" value={form.contact_name} onChange={set('contact_name')} />
                <div className="grid grid-cols-[110px_1fr] gap-3">
                  <Select id="phone_code" label="Code" value={form.phone_code} onChange={set('phone_code')}>
                    {PHONE_CODES.map((p) => <option key={p.code} value={p.code}>{p.code}</option>)}
                  </Select>
                  <Input id="contact_phone" label="Phone number" required placeholder="Phone Number*" value={form.contact_phone} onChange={set('contact_phone')} />
                </div>
                <div className="grid grid-cols-[140px_1fr] gap-3">
                  <Select id="social_type" label="Social media" value={form.social_media_type} onChange={set('social_media_type')}>
                    <option value="">Please Select</option>
                    {SOCIAL_TYPES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </Select>
                  <Input id="social_handle" label="Account" placeholder="Social Media Account *" value={form.social_media_handle} onChange={set('social_media_handle')} />
                </div>
              </div>

              <hr className="border-ink-100" />

              {/* Localization Preferences */}
              <div className="space-y-4 p-6">
                <h2 className="text-sm font-bold text-ink-800">Localization Preferences</h2>
                <Select id="timezone" label="Timezone" value={form.timezone} onChange={set('timezone')}>
                  {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
                </Select>
                <Select id="currency" label="Currency" value={form.currency} onChange={set('currency')}>
                  {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </Select>
              </div>

              <div className="border-t border-ink-100 p-6">
                <Button type="submit" loading={loading} size="lg" className="w-full">Register your property</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

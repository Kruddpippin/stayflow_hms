import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Hotel, Building2, ChevronDown } from 'lucide-react'
import { Input, Select, Textarea } from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/services/supabase'
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

const TIMEZONES = [
  'Africa/Lagos', 'Africa/Accra', 'Africa/Nairobi', 'Africa/Johannesburg',
  'Africa/Cairo', 'Africa/Casablanca', 'Europe/London', 'America/New_York',
  'America/Chicago', 'America/Los_Angeles', 'America/Toronto',
]

const CURRENCIES = ['NGN', 'GHS', 'KES', 'ZAR', 'TZS', 'UGX', 'RWF', 'USD', 'GBP', 'EUR']

const SOCIAL_TYPES = ['Instagram', 'Facebook', 'Twitter/X', 'WhatsApp', 'LinkedIn', 'TikTok', 'Website']

export default function Onboarding() {
  const { profile, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    name: '', facility_type: 'Hotel', country: 'Nigeria', city: '', address: '',
    contact_name: profile?.full_name || '', contact_phone: '', social_media_type: '', social_media_handle: '',
    timezone: 'Africa/Lagos', currency: 'NGN',
  })
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) return toast.error('Property name is required')
    if (!form.city.trim()) return toast.error('City is required')
    if (!form.contact_name.trim()) return toast.error('Contact name is required')
    if (!form.contact_phone.trim()) return toast.error('Phone number is required')

    setLoading(true)
    try {
      const { data: property, error: propErr } = await supabase.from('properties').insert({
        name: form.name, facility_type: form.facility_type.toLowerCase(), country: form.country,
        city: form.city, address: form.address || null, contact_name: form.contact_name,
        contact_phone: form.contact_phone, social_media_type: form.social_media_type || null,
        social_media_handle: form.social_media_handle || null, timezone: form.timezone,
        currency: form.currency, created_by: profile.id,
      }).select().single()
      if (propErr) throw propErr

      const { error: memErr } = await supabase.from('property_members').insert({
        property_id: property.id, profile_id: profile.id, role: 'admin',
      })
      if (memErr) throw memErr

      await supabase.from('profiles').update({ onboarded: true }).eq('id', profile.id)
      await refreshProfile()
      toast.success('Property created! Welcome to StayFlow.')
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-ink-50">
      <header className="border-b border-ink-200 bg-white">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-700 text-white"><Hotel size={16} /></div>
            <span className="text-sm font-semibold text-ink-900">StayFlow</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-ink-400">
            <span className={step >= 1 ? 'text-brand-700 font-medium' : ''}>Property info</span>
            <ChevronDown size={12} className="rotate-[-90deg]" />
            <span className={step >= 2 ? 'text-brand-700 font-medium' : ''}>Contact</span>
            <ChevronDown size={12} className="rotate-[-90deg]" />
            <span className={step >= 3 ? 'text-brand-700 font-medium' : ''}>Preferences</span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-5 py-10">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><Building2 size={22} /></div>
          <div>
            <h1 className="text-xl font-bold text-ink-900">Set up your property</h1>
            <p className="text-sm text-ink-500">Tell us about your property so we can configure your dashboard.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Step 1: Basic info */}
          <fieldset className="space-y-4 rounded-xl border border-ink-200 bg-white p-5">
            <legend className="px-2 text-xs font-semibold uppercase tracking-wider text-ink-500">Basic property information</legend>
            <Input id="name" label="Property name" required placeholder="e.g. Grand Lekki Hotel" value={form.name} onChange={set('name')} />
            <Select id="facility_type" label="Facility type" value={form.facility_type} onChange={set('facility_type')}>
              {FACILITY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </Select>
            <Select id="country" label="Country" value={form.country} onChange={set('country')}>
              {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
            <Input id="city" label="City" required placeholder="Lagos" value={form.city} onChange={set('city')} />
            <Input id="address" label="Address" placeholder="123 Victoria Island Blvd" value={form.address} onChange={set('address')} />
          </fieldset>

          {/* Step 2: Contact */}
          <fieldset className="space-y-4 rounded-xl border border-ink-200 bg-white p-5">
            <legend className="px-2 text-xs font-semibold uppercase tracking-wider text-ink-500">Contact details</legend>
            <Input id="contact_name" label="Contact name" required placeholder="John Doe" value={form.contact_name} onChange={set('contact_name')} />
            <div className="grid grid-cols-[100px_1fr] gap-3">
              <Input id="phone_prefix" label="Code" value="+234" disabled />
              <Input id="contact_phone" label="Phone number" required placeholder="800 000 0000" value={form.contact_phone} onChange={set('contact_phone')} />
            </div>
            <div className="grid grid-cols-[140px_1fr] gap-3">
              <Select id="social_type" label="Social media" value={form.social_media_type} onChange={set('social_media_type')}>
                <option value="">Select</option>
                {SOCIAL_TYPES.map((s) => <option key={s} value={s}>{s}</option>)}
              </Select>
              <Input id="social_handle" label="Handle / URL" placeholder="@yourhotel" value={form.social_media_handle} onChange={set('social_media_handle')} />
            </div>
          </fieldset>

          {/* Step 3: Preferences */}
          <fieldset className="space-y-4 rounded-xl border border-ink-200 bg-white p-5">
            <legend className="px-2 text-xs font-semibold uppercase tracking-wider text-ink-500">Localization preferences</legend>
            <Select id="timezone" label="Timezone" value={form.timezone} onChange={set('timezone')}>
              {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
            </Select>
            <Select id="currency" label="Currency" value={form.currency} onChange={set('currency')}>
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </fieldset>

          <Button type="submit" loading={loading} size="lg" className="w-full">
            Create property
          </Button>
        </form>
      </div>
    </div>
  )
}

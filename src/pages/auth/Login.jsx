import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Hotel, ArrowRight, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Input } from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import toast from 'react-hot-toast'

const demos = [
  { label: 'Admin', email: 'admin@stayflow.com', desc: 'Full access' },
  { label: 'Manager', email: 'manager@stayflow.com', desc: 'Admin privileges' },
  { label: 'Staff', email: 'staff@stayflow.com', desc: 'Front desk' },
  { label: 'Guest', email: 'guest@stayflow.com', desc: 'Portal only' },
]

export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPw, setShowPw] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    const { error } = await signIn(email, password)
    setLoading(false)
    if (error) return toast.error(error.message)
    toast.success('Welcome back!')
    navigate('/')
  }

  function fillDemo(demoEmail) {
    setEmail(demoEmail); setPassword('Password123!')
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-5">
      <div className="hidden lg:col-span-2 lg:flex lg:flex-col lg:justify-between bg-brand-900 p-10 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-800/80 via-brand-900 to-brand-950" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-600/10 rounded-full -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-brand-500/10 rounded-full translate-y-1/3 -translate-x-1/4" />

        <div className="relative">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 backdrop-blur-sm"><Hotel size={18} /></div>
            <span className="text-base font-semibold">StayFlow</span>
          </div>
        </div>

        <div className="relative space-y-6">
          <h2 className="text-3xl font-bold leading-tight tracking-tight">Run your property like a five-star operation.</h2>
          <p className="text-sm leading-relaxed text-brand-200">Reservations, rooms, guests and billing — beautifully unified in one fast, modern dashboard.</p>
          <div className="grid grid-cols-2 gap-3 pt-2">
            {[
              { n: '30s', d: 'Average check-in' },
              { n: '100%', d: 'Uptime SLA' },
              { n: '4', d: 'User roles' },
              { n: '24/7', d: 'Guest portal' },
            ].map((s) => (
              <div key={s.d} className="rounded-lg bg-white/8 px-3.5 py-3">
                <p className="text-lg font-semibold text-brand-300">{s.n}</p>
                <p className="text-xs text-brand-300">{s.d}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-brand-400">&copy; 2026 StayFlow HMS</p>
      </div>

      <div className="flex items-center justify-center p-6 lg:col-span-3">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-700 text-white"><Hotel size={18} /></div>
            <span className="text-base font-semibold text-ink-900">StayFlow</span>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-ink-900">Welcome back</h1>
          <p className="mt-1 text-sm text-ink-500">Sign in to your account to continue.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <Input id="email" label="Email" type="email" required autoComplete="email"
              placeholder="you@hotel.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            <div className="relative">
              <Input id="password" label="Password" type={showPw ? 'text' : 'password'} required autoComplete="current-password"
                placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} />
              <button type="button" onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-[26px] rounded p-0.5 text-ink-400 hover:text-ink-600 transition-colors"
                aria-label={showPw ? 'Hide password' : 'Show password'}>
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <Button type="submit" loading={loading} className="w-full">
              Sign in <ArrowRight size={16} />
            </Button>
          </form>

          <div className="mt-8">
            <p className="mb-3 text-xs font-medium text-ink-400 uppercase tracking-wider">Demo accounts</p>
            <div className="grid grid-cols-2 gap-2">
              {demos.map((d) => (
                <button key={d.email} onClick={() => fillDemo(d.email)} type="button"
                  className="group rounded-lg border border-ink-200 px-3 py-2.5 text-left transition-colors hover:border-brand-300 hover:bg-brand-50">
                  <p className="text-xs font-medium text-ink-800 group-hover:text-brand-800">{d.label}</p>
                  <p className="text-[11px] text-ink-400">{d.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <p className="mt-8 text-center text-sm text-ink-500">
            New property? <Link to="/signup" className="font-medium text-brand-700 hover:text-brand-800 hover:underline">Register your facility</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

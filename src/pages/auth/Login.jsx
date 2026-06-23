import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Hotel, ArrowRight, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Input } from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import toast from 'react-hot-toast'

const demos = [
  { label: 'Admin', email: 'admin@stayflow.com' },
  { label: 'Manager', email: 'manager@stayflow.com' },
  { label: 'Staff', email: 'staff@stayflow.com' },
  { label: 'Guest', email: 'guest@stayflow.com' },
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
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex items-center justify-center bg-ink-50 p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white"><Hotel size={20} /></div>
            <span className="text-lg font-bold text-ink-900">StayFlow</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-900">Sign in</h1>
          <p className="mt-1 text-sm text-ink-500">Welcome back. Please enter your details.</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <Input id="email" label="Email" type="email" required autoComplete="email"
              placeholder="you@hotel.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            <div className="relative">
              <Input id="password" label="Password" type={showPw ? 'text' : 'password'} required autoComplete="current-password"
                placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
              <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-3 top-[34px] text-ink-400 hover:text-ink-600" aria-label={showPw ? 'Hide password' : 'Show password'}>
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <Button type="submit" loading={loading} className="w-full">Sign in <ArrowRight size={16} /></Button>
          </form>

          <div className="mt-6 rounded-xl border border-ink-100 bg-white p-3">
            <p className="mb-2 text-xs font-medium text-ink-500">Quick demo logins (password autofilled)</p>
            <div className="flex flex-wrap gap-2">
              {demos.map((d) => (
                <button key={d.email} onClick={() => fillDemo(d.email)} type="button"
                  className="rounded-lg border border-ink-200 px-3 py-1.5 text-xs font-medium text-ink-700 hover:bg-ink-50">{d.label}</button>
              ))}
            </div>
          </div>

          <p className="mt-6 text-center text-sm text-ink-500">
            New guest? <Link to="/signup" className="font-medium text-brand-600 hover:underline">Create an account</Link>
          </p>
        </div>
      </div>
      <div className="relative hidden lg:block">
        <img src="https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=80" alt="Luxury hotel lobby" className="h-full w-full object-cover" loading="lazy" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950/70 to-transparent" />
        <div className="absolute bottom-10 left-10 right-10 text-white">
          <h2 className="text-3xl font-bold leading-tight">Run your property like a five-star operation.</h2>
          <p className="mt-2 max-w-md text-white/80">Reservations, rooms, guests and billing — beautifully unified in one fast, modern dashboard.</p>
        </div>
      </div>
    </div>
  )
}

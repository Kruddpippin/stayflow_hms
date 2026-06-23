import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Hotel, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Input } from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import toast from 'react-hot-toast'

export default function Signup() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ fullName: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters.')
    setLoading(true)
    const { error } = await signUp(form.email, form.password, form.fullName)
    setLoading(false)
    if (error) return toast.error(error.message)
    toast.success('Account created! You are now signed in.')
    navigate('/portal')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-50 p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white"><Hotel size={20} /></div>
          <span className="text-lg font-bold text-ink-900">StayFlow</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-900">Create your account</h1>
        <p className="mt-1 text-sm text-ink-500">Book and manage your stays as a guest.</p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <Input id="fullName" label="Full name" required placeholder="Jane Doe" value={form.fullName} onChange={set('fullName')} />
          <Input id="email" label="Email" type="email" required placeholder="you@email.com" value={form.email} onChange={set('email')} />
          <div className="relative">
            <Input id="password" label="Password" type={showPw ? 'text' : 'password'} required placeholder="At least 6 characters" value={form.password} onChange={set('password')} />
            <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-3 top-[34px] text-ink-400 hover:text-ink-600" aria-label={showPw ? 'Hide password' : 'Show password'}>
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <Button type="submit" loading={loading} className="w-full">Create account</Button>
        </form>
        <p className="mt-6 text-center text-sm text-ink-500">
          Already have an account? <Link to="/login" className="font-medium text-brand-600 hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  )
}

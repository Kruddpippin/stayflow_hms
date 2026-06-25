import { Link } from 'react-router-dom'
import { Hotel, ArrowRight, BedDouble, CalendarCheck, Users, Receipt, Shield, Zap } from 'lucide-react'
import Button from '@/components/ui/Button'

const features = [
  { icon: CalendarCheck, title: 'Reservations', desc: 'Book, confirm, check in and check out — all in one view.' },
  { icon: BedDouble, title: 'Room management', desc: 'Track availability, status and housekeeping in real time.' },
  { icon: Users, title: 'Guest records', desc: 'Full guest profiles with stay history and preferences.' },
  { icon: Receipt, title: 'Billing & folios', desc: 'Charges, payments and invoicing — no spreadsheets needed.' },
  { icon: Shield, title: 'Role-based access', desc: 'Admin, manager, staff and guest roles with granular permissions.' },
  { icon: Zap, title: 'Guest portal', desc: 'Self-service booking and stay management for your guests.' },
]

const facilityTypes = ['Hotels', 'Resorts', 'Apartments', 'Villas', 'Hostels', 'Boutiques', 'B&Bs', 'Motels']

export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-ink-100 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-700 text-white"><Hotel size={18} /></div>
            <span className="text-base font-bold text-ink-900">StayFlow</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/login"><Button variant="ghost" size="md">Sign in</Button></Link>
            <Link to="/signup"><Button size="md">Register your facility <ArrowRight size={15} /></Button></Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-brand-900">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-800/60 via-brand-900 to-brand-950" />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-brand-600/8 rounded-full -translate-y-1/3 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-brand-500/8 rounded-full translate-y-1/3 -translate-x-1/4" />

        <div className="relative mx-auto max-w-6xl px-5 py-24 lg:py-32">
          <div className="max-w-2xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-medium text-brand-200">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />
              Built for African hospitality
            </div>
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
              Your property,<br />managed <span className="text-brand-400">effortlessly.</span>
            </h1>
            <p className="mt-6 max-w-lg text-base leading-relaxed text-brand-200">
              StayFlow is the modern hotel management system that handles reservations, rooms, guests and billing — so you can focus on delivering exceptional stays.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link to="/signup"><Button size="lg" className="bg-brand-600 hover:bg-brand-700 text-white">Register free today <ArrowRight size={16} /></Button></Link>
              <Link to="/login"><Button size="lg" variant="ghost" className="text-white hover:bg-white/10">Sign in to your property</Button></Link>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm text-brand-300">
              {facilityTypes.map((t) => <span key={t}>{t}</span>)}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-5 py-20 lg:py-28">
        <div className="text-center">
          <h2 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">Everything you need to run your property</h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-ink-500">From a single boutique to a chain of resorts — StayFlow scales with your business.</p>
        </div>
        <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-xl border border-ink-200 bg-white p-6 transition-colors hover:border-brand-300 hover:bg-brand-50/30">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-700"><Icon size={20} /></div>
              <h3 className="text-sm font-semibold text-ink-900">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-500">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-brand-900">
        <div className="mx-auto max-w-6xl px-5 py-16 text-center">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">Ready to modernize your property?</h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-brand-300">Create your account, set up your property in minutes, and start managing bookings today.</p>
          <div className="mt-8">
            <Link to="/signup"><Button size="lg" className="bg-brand-600 hover:bg-brand-700 text-white">Register your property — it's free <ArrowRight size={16} /></Button></Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-ink-100 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6 text-xs text-ink-400">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-brand-700 text-white"><Hotel size={12} /></div>
            <span className="font-medium text-ink-600">StayFlow HMS</span>
          </div>
          <p>&copy; 2026 StayFlow. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}

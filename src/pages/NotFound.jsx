import { Link } from 'react-router-dom'
import Button from '@/components/ui/Button'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-ink-50 p-6 text-center">
      <p className="text-7xl font-extrabold text-brand-600">404</p>
      <h1 className="text-xl font-semibold text-ink-900">Page not found</h1>
      <p className="max-w-sm text-sm text-ink-500">The page you're looking for doesn't exist or has moved.</p>
      <Link to="/"><Button>Back to home</Button></Link>
    </div>
  )
}

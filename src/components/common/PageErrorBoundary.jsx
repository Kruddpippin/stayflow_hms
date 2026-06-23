import React from 'react'
import Button from '@/components/ui/Button'
import { AlertTriangle } from 'lucide-react'

export default class PageErrorBoundary extends React.Component {
  state = { error: null }
  static getDerivedStateFromError(error) { return { error } }

  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 text-red-500">
            <AlertTriangle size={18} />
          </div>
          <h2 className="text-sm font-semibold text-ink-900">Something went wrong</h2>
          <p className="max-w-md text-xs text-ink-500">{this.state.error.message}</p>
          <Button size="sm" variant="secondary" onClick={() => this.setState({ error: null })}>Try again</Button>
        </div>
      )
    }
    return this.props.children
  }
}

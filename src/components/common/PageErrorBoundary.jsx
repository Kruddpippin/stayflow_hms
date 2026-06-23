import React from 'react'
import Button from '@/components/ui/Button'
import { AlertTriangle } from 'lucide-react'

export default class PageErrorBoundary extends React.Component {
  state = { error: null }
  static getDerivedStateFromError(error) { return { error } }

  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-500">
            <AlertTriangle size={24} />
          </div>
          <h2 className="text-lg font-semibold text-ink-900">Something went wrong</h2>
          <p className="max-w-md text-sm text-ink-500">{this.state.error.message}</p>
          <Button variant="secondary" onClick={() => this.setState({ error: null })}>Try again</Button>
        </div>
      )
    }
    return this.props.children
  }
}

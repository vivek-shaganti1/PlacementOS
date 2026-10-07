import { Component, type ErrorInfo, type ReactNode } from 'react'

/**
 * Catches render errors so a bug in one page or panel shows a recoverable message instead of a blank screen.
 * `resetKey` (for example the route) clears the error when it changes.
 */
export class ErrorBoundary extends Component<{ children: ReactNode; resetKey?: string; compact?: boolean }, { error: Error | null }> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('PlacementIQ render error', error, info.componentStack)
  }

  componentDidUpdate(prev: { resetKey?: string }) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null })
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div role="alert" className={this.props.compact ? 'p-4' : 'grid min-h-[60vh] flex-1 place-items-center p-6'}>
        <div className="card max-w-[440px] p-6 text-left">
          <p className="text-[15px] font-semibold text-ink">Something went wrong on this screen</p>
          <p className="mt-1 text-[13px] text-ink-mute">The rest of PlacementIQ still works. Try again, or reload if it keeps happening.</p>
          <div className="mt-4 flex gap-2">
            <button onClick={() => this.setState({ error: null })} className="btn-primary">Try again</button>
            <button onClick={() => window.location.reload()} className="btn-glass">Reload</button>
          </div>
        </div>
      </div>
    )
  }
}

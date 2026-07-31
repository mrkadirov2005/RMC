import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';

type BoundaryProps = { children: ReactNode; routeKey: string };
type BoundaryState = { error: Error | null };

class RouteErrorBoundaryImpl extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Route rendering failed:', error, info.componentStack);
  }

  componentDidUpdate(previousProps: BoundaryProps) {
    if (this.state.error && previousProps.routeKey !== this.props.routeKey) {
      this.setState({ error: null });
    }
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 p-6 dark:bg-background">
        <section className="w-full max-w-lg rounded-lg border bg-card p-6 text-center shadow-sm">
          <AlertTriangle className="mx-auto h-10 w-10 text-amber-500" />
          <h1 className="mt-3 text-lg font-semibold">This page could not be displayed</h1>
          <p className="mt-2 text-sm text-muted-foreground">Your other application data is safe. Reload this route to try again.</p>
          <Button className="mt-4" onClick={() => window.location.reload()}>
            <RefreshCw className="mr-2 h-4 w-4" /> Reload page
          </Button>
        </section>
      </main>
    );
  }
}

export const RouteErrorBoundary = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  return <RouteErrorBoundaryImpl routeKey={`${location.pathname}${location.search}`}>{children}</RouteErrorBoundaryImpl>;
};

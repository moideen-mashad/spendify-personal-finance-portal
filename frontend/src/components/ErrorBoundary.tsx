import { Component, type ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
interface Props {
  children: ReactNode;
  name?: string;
  fullPage?: boolean;
}
export class ErrorBoundary extends Component<
  Props,
  { failed: boolean; attempt: number }
> {
  state = { failed: false, attempt: 0 };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed)
      return (
        <div
          className={
            "boundary-fallback " + (this.props.fullPage ? "boundary-full" : "")
          }
          role="alert"
        >
          <div className="empty-icon">
            <AlertCircle size={24} />
          </div>
          <h2>
            {this.props.name
              ? `${this.props.name} couldn’t be displayed`
              : "Something didn’t load correctly"}
          </h2>
          <p>Please try again. If this keeps happening, reload the page.</p>
          <div className="heading-actions">
            <button
              type="button"
              className="button primary"
              onClick={() =>
                this.setState((s) => ({
                  failed: false,
                  attempt: s.attempt + 1,
                }))
              }
            >
              <RefreshCw size={15} />
              Try again
            </button>
            <button
              type="button"
              className="button secondary"
              onClick={() => window.location.reload()}
            >
              Reload page
            </button>
          </div>
        </div>
      );
    return (
      <div key={this.state.attempt} className="boundary-contents">
        {this.props.children}
      </div>
    );
  }
}
export function SafePanel({ children }: { children: ReactNode }) {
  return (
    <section className="panel">
      <ErrorBoundary name="This panel">{children}</ErrorBoundary>
    </section>
  );
}

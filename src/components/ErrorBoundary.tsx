import { Component } from "react";

class ErrorBoundary extends Component<any, any> {
  state = { hasError: false };

  componentDidCatch(error: Error, info: any): void {
    console.error("ErrorBoundary caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          style={{
            padding: "1rem",
            background: "var(--gray-50)",
            border: "1px solid var(--gray-300)",
            margin: "1rem 0",
          }}
        >
          <p>Something went wrong loading this page.</p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg bg-[var(--ink)] px-4 py-2 text-sm text-[var(--bg)] transition-opacity hover:opacity-80"
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
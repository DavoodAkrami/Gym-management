"use client";

import { Component, type ReactNode } from "react";

type Props = { children: ReactNode; fallback?: ReactNode };
type State = { hasError: boolean; message: string };

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: unknown): State {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : "Something went wrong.",
    };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div style={{ padding: "2rem", textAlign: "center" }}>
          <p style={{ fontWeight: 600, marginBottom: "0.5rem" }}>This section failed to load.</p>
          <p style={{ fontSize: "13px", color: "var(--muted-foreground)", marginBottom: "1rem" }}>
            {this.state.message}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, message: "" })}
            style={{ fontSize: "13px", padding: "0.5rem 1rem" }}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

import { Component, ReactNode } from "react";
import ErrorPage from "@/pages/ErrorPage";

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: unknown) {
    console.error("ErrorBoundary caught →", error, info);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return <ErrorPage error={this.state.error} onReset={this.reset} />;
    }
    return this.props.children;
  }
}

import { Component } from "react";
import { Button } from "@heroui/react";

// A safety net for a screen that crashes: instead of a blank page, a
// friendly message with a way out. A live game is kept on the phone
// (useScoreboardState), so "Reload" brings it right back.
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Screen crashed:", error, info?.componentStack);
  }

  goHome = () => {
    if (this.props.onHome) {
      this.setState({ error: null });
      this.props.onHome();
    } else {
      window.location.assign(import.meta.env.BASE_URL || "/");
    }
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main
        role="alert"
        className="flex min-h-dvh flex-1 flex-col items-center justify-center gap-4 bg-background px-6 text-center text-foreground"
      >
        <h1 className="m-0 text-2xl font-bold">Something went wrong</h1>
        <p className="m-0 max-w-xs text-muted">
          This screen hit a problem. Any game you were scoring is still saved on this phone.
        </p>
        <div className="flex w-full max-w-xs flex-col gap-3">
          <Button variant="primary" onPress={this.goHome} className="h-12 w-full rounded-full font-bold">
            Back to home
          </Button>
          <Button
            variant="outline"
            onPress={() => window.location.reload()}
            className="h-12 w-full rounded-full font-bold"
          >
            Reload
          </Button>
        </div>
      </main>
    );
  }
}

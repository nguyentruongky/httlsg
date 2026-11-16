import { Component, type ErrorInfo, type ReactNode } from "react";

export class PageErrorBoundary extends Component<
  { children: ReactNode; reload?: boolean },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  private recover = () => {
    if (this.state.failed) this.setState({ failed: false });
  };
  componentDidMount() {
    window.addEventListener("clientnavigation", this.recover);
    window.addEventListener("popstate", this.recover);
  }
  componentWillUnmount() {
    window.removeEventListener("clientnavigation", this.recover);
    window.removeEventListener("popstate", this.recover);
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Page render failed", error, info.componentStack);
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <section role="alert" className="mx-auto max-w-md space-y-3 p-6">
        <h1 className="text-lg font-semibold">Không thể tải trang</h1>
        <p className="text-sm text-muted-foreground">Vui lòng thử tải lại.</p>
        <button
          type="button"
          className="min-h-11 rounded-lg bg-primary px-4 py-2 text-primary-foreground"
          onClick={() => this.props.reload ? window.location.reload() : this.recover()}
        >
          Thử lại
        </button>
      </section>
    );
  }
}

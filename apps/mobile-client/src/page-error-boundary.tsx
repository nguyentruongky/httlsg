import { Component, type ErrorInfo, type ReactNode } from "react";

export class PageErrorBoundary extends Component<
  {
    children: ReactNode;
    reload?: boolean;
    recoverLocalData?: () => Promise<boolean>;
  },
  { failed: boolean; recovering: boolean }
> {
  state = { failed: false, recovering: false };
  private restoredLocal = false;
  private mounted = false;
  static getDerivedStateFromError() {
    return { failed: true };
  }
  private recover = () => {
    this.restoredLocal = false;
    if (this.state.failed) this.setState({ failed: false });
  };
  componentDidMount() {
    this.mounted = true;
    window.addEventListener("clientnavigation", this.recover);
    window.addEventListener("popstate", this.recover);
  }
  componentWillUnmount() {
    this.mounted = false;
    window.removeEventListener("clientnavigation", this.recover);
    window.removeEventListener("popstate", this.recover);
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Page render failed", error, info.componentStack);
    if (this.props.recoverLocalData && !this.restoredLocal) {
      this.restoredLocal = true;
      this.setState({ recovering: true });
      void this.props
        .recoverLocalData()
        .then((restored) => {
          if (this.mounted)
            this.setState({ failed: !restored, recovering: false });
        })
        .catch(() => {
          if (this.mounted) this.setState({ recovering: false });
        });
    }
  }
  render() {
    if (this.state.recovering)
      return (
        <p
          role="status"
          className="p-6 text-center text-sm text-muted-foreground"
        >
          Đang tải trang…
        </p>
      );
    if (!this.state.failed) return this.props.children;
    return (
      <section role="alert" className="mx-auto max-w-md space-y-3 p-6">
        <h1 className="text-lg font-semibold">Không thể tải trang</h1>
        <p className="text-sm text-muted-foreground">Vui lòng thử tải lại.</p>
        <button
          type="button"
          className="min-h-11 rounded-lg bg-primary px-4 py-2 text-primary-foreground"
          onClick={() =>
            this.props.reload ? window.location.reload() : this.recover()
          }
        >
          Thử lại
        </button>
      </section>
    );
  }
}

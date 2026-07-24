import React, { Component, type ErrorInfo, type ReactNode } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";

class AppErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("画面の表示中にエラーが発生しました。", error, info);
  }

  render() {
    if (this.state.failed) {
      return (
        <main className="app-fatal-error">
          <section>
            <strong>画面を再読み込みしてください。</strong>
            <p>更新結果は保持されています。再読み込みしてもサイトのデータは二重更新されません。</p>
            <button type="button" onClick={() => window.location.reload()}>
              画面を再読み込み
            </button>
          </section>
        </main>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </React.StrictMode>
);

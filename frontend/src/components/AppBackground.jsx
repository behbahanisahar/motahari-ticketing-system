export function AppBackground() {
  return (
    <div className="app-background" aria-hidden>
      <div className="app-bg-base" />
      <div className="app-bg-orb app-bg-orb-1" />
      <div className="app-bg-orb app-bg-orb-2" />
      <div className="app-bg-orb app-bg-orb-3" />
      <div className="app-bg-hex" />
      <div className="app-bg-grid" />
      <div className="app-bg-crosses" />
      <div className="app-bg-ecg" />
      <div className="app-bg-molecules" />
      <div className="app-bg-rings" />
      <div className="app-bg-noise" />
    </div>
  );
}

export function AppLayout({ children }) {
  return (
    <div className="relative min-h-full">
      <AppBackground />
      <div className="relative z-10 min-h-full">{children}</div>
    </div>
  );
}

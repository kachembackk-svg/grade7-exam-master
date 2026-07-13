import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

export default function PWAStatus() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({ immediate: true });

  // Unobtrusive — auto-dismisses; the update prompt below stays until acted on.
  useEffect(() => {
    if (!offlineReady) return;
    const t = window.setTimeout(() => setOfflineReady(false), 4000);
    return () => window.clearTimeout(t);
  }, [offlineReady, setOfflineReady]);

  if (!offlineReady && !needRefresh) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 grid gap-2 w-[min(92vw,380px)]">
      {offlineReady && (
        <div className="bg-eagle-dark text-white text-sm rounded-lg shadow-lg px-4 py-2.5 flex items-center justify-between gap-3">
          <span>Ready for offline use.</span>
          <button
            type="button"
            className="text-white/70 hover:text-white"
            onClick={() => setOfflineReady(false)}
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      )}
      {needRefresh && (
        <div className="bg-copper text-white text-sm rounded-lg shadow-lg px-4 py-2.5 flex items-center justify-between gap-3">
          <span>A new version is available.</span>
          <div className="flex items-center gap-3">
            <button type="button" className="font-semibold underline" onClick={() => updateServiceWorker(true)}>
              Refresh
            </button>
            <button
              type="button"
              className="text-white/70 hover:text-white"
              onClick={() => setNeedRefresh(false)}
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { RouteHub } from './components/RouteHub';
import { BusPage } from './components/BusPage';
import { MapPage } from './components/MapPage';
import { AlarmPage } from './components/AlarmPage';
import { Onboarding, hasCompletedOnboarding } from './components/Onboarding';

export default function App() {
  const [activeTab, setActiveTab] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [fadeOut, setFadeOut] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(() =>
    import.meta.env.DEV ? true : !hasCompletedOnboarding()
  );

  useEffect(() => {
    const handleSwitchTab = (event: CustomEvent) => {
      setActiveTab(event.detail);
    };

    window.addEventListener('switchTab' as any, handleSwitchTab as any);
    return () => {
      window.removeEventListener('switchTab' as any, handleSwitchTab as any);
    };
  }, []);

  useEffect(() => {
    let fadeTimer: number | undefined;
    let removeTimer: number | undefined;
    const handleToast = (event: CustomEvent<string>) => {
      if (fadeTimer) window.clearTimeout(fadeTimer);
      if (removeTimer) window.clearTimeout(removeTimer);
      setToast(event.detail);
      setFadeOut(false);
      fadeTimer = window.setTimeout(() => setFadeOut(true), 1400);
      removeTimer = window.setTimeout(() => setToast(null), 2000);
    };
    window.addEventListener('showToast' as any, handleToast as any);
    return () => {
      window.removeEventListener('showToast' as any, handleToast as any);
      if (fadeTimer) window.clearTimeout(fadeTimer);
      if (removeTimer) window.clearTimeout(removeTimer);
    };
  }, []);

  if (showOnboarding) {
    return <Onboarding onComplete={() => setShowOnboarding(false)} />;
  }

  return (
    <div className="size-full bg-[#EAF4F0]">
      {activeTab === 0 && <RouteHub />}
      {activeTab === 1 && <BusPage />}
      {activeTab === 2 && <MapPage />}
      {activeTab === 3 && <AlarmPage />}

      {/* Global toast */}
      {toast && (
        <div
          className={`fixed inset-x-0 bottom-12 z-50 flex justify-center pointer-events-none px-4 transition-all duration-500 ease-out ${
            fadeOut ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0 animate-[fadeInUp_200ms_ease-out]'
          }`}
        >
          <div className="bg-gray-900/90 text-white text-sm font-medium px-5 py-3 rounded-full shadow-lg backdrop-blur-sm">
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}

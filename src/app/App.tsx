import { useState, useEffect } from 'react';
import { RouteHub } from './components/RouteHub';
import { BusPage } from './components/BusPage';
import { MapPage } from './components/MapPage';
import { AlarmPage } from './components/AlarmPage';

export default function App() {
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    const handleSwitchTab = (event: CustomEvent) => {
      setActiveTab(event.detail);
    };

    window.addEventListener('switchTab' as any, handleSwitchTab as any);
    return () => {
      window.removeEventListener('switchTab' as any, handleSwitchTab as any);
    };
  }, []);

  return (
    <div className="size-full bg-[#FAFAFA]">
      {activeTab === 0 && <RouteHub />}
      {activeTab === 1 && <BusPage />}
      {activeTab === 2 && <MapPage />}
      {activeTab === 3 && <AlarmPage />}
    </div>
  );
}

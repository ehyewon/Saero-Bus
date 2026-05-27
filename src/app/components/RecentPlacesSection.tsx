import { useEffect, useState } from 'react';
import { History, StarBorder } from '@mui/icons-material';

export interface RecentPlace {
  name: string;
  address: string;
}

interface RecentPlacesSectionProps {
  onSelectPlace: (place: RecentPlace) => void;
  refreshKey?: number;
}

const STORAGE_KEY = 'recentPlaces';

export function loadRecentPlaces(): RecentPlace[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as RecentPlace[];
  } catch {
    return [];
  }
}

export function pushRecentPlace(place: RecentPlace) {
  if (!place.address.trim()) return;
  const list = loadRecentPlaces().filter((p) => p.address !== place.address);
  list.unshift(place);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, 8)));
}

export function RecentPlacesSection({ onSelectPlace, refreshKey }: RecentPlacesSectionProps) {
  const [places, setPlaces] = useState<RecentPlace[]>([]);

  useEffect(() => {
    setPlaces(loadRecentPlaces());
  }, [refreshKey]);

  if (places.length === 0) {
    return (
      <div className="px-4 mb-4">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 text-center">
          <History className="text-gray-400 mx-auto mb-2" sx={{ fontSize: 36 }} />
          <p className="text-gray-600 text-sm">최근 검색한 장소가 없어요</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 mb-4">
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
        {places.map((place) => (
          <button
            key={place.address}
            type="button"
            onClick={() => onSelectPlace(place)}
            className="w-32 h-32 shrink-0 bg-white rounded-2xl shadow-md p-3 flex flex-col items-start text-left"
          >
            <div className="flex items-center justify-between w-full">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                <History className="text-gray-500" />
              </div>
              <StarBorder className="text-gray-300" sx={{ fontSize: 18 }} />
            </div>
            <div className="mt-auto w-full min-w-0">
              <div className="font-bold text-gray-900 truncate">{place.name || place.address}</div>
              <div className="text-xs text-gray-500 truncate">{place.address}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

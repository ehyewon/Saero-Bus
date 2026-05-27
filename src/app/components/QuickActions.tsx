import { useEffect, useState } from 'react';
import {
  Home,
  School,
  Business,
  Place as PlaceIcon,
  Star,
  Add,
} from '@mui/icons-material';

type Category = 'home' | 'school' | 'office' | 'other';

interface FavoritePlace {
  id: string;
  name: string;
  address: string;
  category: Category;
  lat?: number;
  lng?: number;
}

interface QuickActionsProps {
  isEditing?: boolean;
}

const categoryMeta: Record<Category, { Icon: typeof Home; label: string }> = {
  home: { Icon: Home, label: '집' },
  school: { Icon: School, label: '학교' },
  office: { Icon: Business, label: '회사' },
  other: { Icon: PlaceIcon, label: '기타' },
};

const SEED: FavoritePlace[] = [
  { id: 'home', name: '집', address: '강남역 3번출구...', category: 'home' },
  { id: 'school', name: '전북대학교', address: '전북대 정문 앞', category: 'school' },
  { id: 'office', name: '사무실', address: '테헤란로 2번...', category: 'office' },
];

const STORAGE_KEY = 'favoritePlaces';

export function QuickActions({ isEditing = false }: QuickActionsProps) {
  const [places, setPlaces] = useState<FavoritePlace[]>(SEED);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newCategory, setNewCategory] = useState<Category>('other');

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          // Migrate legacy categories (e.g. 'work' from old FavoritePlacesSection → 'office')
          const migrated: FavoritePlace[] = parsed
            .filter((p) => p && typeof p.id === 'string' && typeof p.name === 'string')
            .map((p) => {
              const rawCat = typeof p.category === 'string' ? p.category : '';
              const mapped = rawCat === 'work' ? 'office' : rawCat;
              const category: Category =
                Object.prototype.hasOwnProperty.call(categoryMeta, mapped)
                  ? (mapped as Category)
                  : 'other';
              return {
                id: p.id as string,
                name: p.name as string,
                address: typeof p.address === 'string' ? p.address : '',
                category,
                lat: typeof p.lat === 'number' ? p.lat : undefined,
                lng: typeof p.lng === 'number' ? p.lng : undefined,
              };
            });
          setPlaces(migrated);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
        }
      } catch {
        /* ignore */
      }
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED));
    }
  }, []);

  const persist = (next: FavoritePlace[]) => {
    setPlaces(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const removePlace = (id: string) => persist(places.filter((p) => p.id !== id));

  const addPlace = () => {
    if (!newName.trim() || !newAddress.trim()) return;
    persist([
      ...places,
      {
        id: String(Date.now()),
        name: newName.trim(),
        address: newAddress.trim(),
        category: newCategory,
      },
    ]);
    setNewName('');
    setNewAddress('');
    setNewCategory('other');
    setShowAdd(false);
  };

  return (
    <div className="px-4 mb-6">
      <div className="grid grid-cols-3 gap-3">
        {places.map((place) => {
          const { Icon } = categoryMeta[place.category];
          return (
            <div
              key={place.id}
              className="relative bg-white rounded-2xl p-4 flex flex-col items-start gap-2 shadow-md"
            >
              <button
                type="button"
                onClick={() => removePlace(place.id)}
                aria-label={`${place.name} 즐겨찾기 해제`}
                className="absolute top-2 right-2 p-1 -m-1"
              >
                <Star className="text-yellow-400" sx={{ fontSize: 20 }} />
              </button>

              <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center text-yellow-700">
                <Icon />
              </div>
              <div className="text-left w-full min-w-0">
                <div className="font-bold text-sm text-gray-900 truncate">{place.name}</div>
                <div className="text-xs text-gray-500 truncate">{place.address}</div>
              </div>
            </div>
          );
        })}

        {isEditing && (
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 flex flex-col items-center justify-center gap-1 border-2 border-dashed border-white/80 text-white min-h-[88px]"
          >
            <Add />
            <span className="text-xs font-semibold">장소 추가</span>
          </button>
        )}
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold mb-4">즐겨찾기 장소 추가</h3>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="장소 이름 (예: 집, 도서관)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
              />
              <input
                type="text"
                placeholder="주소"
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
              />
              <div className="flex gap-2">
                {(Object.keys(categoryMeta) as Category[]).map((cat) => {
                  const { Icon, label } = categoryMeta[cat];
                  const selected = cat === newCategory;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setNewCategory(cat)}
                      className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-lg border transition-colors ${
                        selected
                          ? 'border-blue-500 bg-blue-50 text-blue-600'
                          : 'border-gray-300 text-gray-600'
                      }`}
                    >
                      <Icon sx={{ fontSize: 20 }} />
                      <span className="text-xs">{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="flex-1 bg-gray-200 text-gray-700 rounded-lg py-2 font-medium"
              >
                취소
              </button>
              <button
                type="button"
                onClick={addPlace}
                className="flex-1 bg-blue-600 text-white rounded-lg py-2 font-medium"
              >
                추가
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { blogApi } from './blogApi';

export interface PlaceSearchResult {
  id: string;
  name: string;
  address: string;
  roadAddress?: string;
  jibunAddress?: string;
  category: '장소' | '도로명' | '정류장' | '지역';
  keywords?: string[];
  lat?: number;
  lon?: number;
}

const PLACES: PlaceSearchResult[] = [
  {
    id: 'jeonbuk-national-univ',
    name: '전북대학교',
    address: '전북특별자치도 전주시 덕진구 백제대로 567',
    category: '장소',
    keywords: ['전북대', '전북대학교', '덕진구', '백제대로'],
  },
  {
    id: 'jeonju-station',
    name: '전주역',
    address: '전북특별자치도 전주시 덕진구 동부대로 680',
    category: '장소',
    keywords: ['전주역', '전주', '덕진구', '동부대로'],
  },
  {
    id: 'jeonju-hanok',
    name: '전주한옥마을',
    address: '전북특별자치도 전주시 완산구 기린대로 99',
    category: '장소',
    keywords: ['한옥마을', '전주한옥마을', '완산구', '기린대로'],
  },
  {
    id: 'gaeksa',
    name: '전주 객사',
    address: '전북특별자치도 전주시 완산구 충경로 59',
    category: '장소',
    keywords: ['객사', '전주객사', '완산구', '충경로'],
  },
  {
    id: 'jeonju-cityhall',
    name: '전주시청',
    address: '전북특별자치도 전주시 완산구 노송광장로 10',
    category: '장소',
    keywords: ['시청', '전주시청', '완산구', '노송광장로'],
  },
  {
    id: 'jeonbuk-office',
    name: '전북특별자치도청',
    address: '전북특별자치도 전주시 완산구 효자로 225',
    category: '장소',
    keywords: ['전북도청', '도청', '효자동', '효자로'],
  },
  {
    id: 'jeonju-terminal',
    name: '전주고속버스터미널',
    address: '전북특별자치도 전주시 덕진구 가리내로 70',
    category: '장소',
    keywords: ['버스터미널', '고속버스터미널', '덕진구', '가리내로'],
  },
  {
    id: 'jeonju-express-bus-stop',
    name: '고속버스터미널 정류장',
    address: '전북특별자치도 전주시 덕진구 금암동',
    category: '정류장',
    keywords: ['정류장', '버스정류장', '고속버스터미널', '금암동'],
  },
  {
    id: 'geumam',
    name: '덕진구 금암동',
    address: '전북특별자치도 전주시 덕진구 금암동',
    category: '지역',
    keywords: ['현재위치', '금암동', '덕진구', '전북'],
  },
  {
    id: 'baekje-daero',
    name: '백제대로',
    address: '전북특별자치도 전주시 덕진구 백제대로',
    category: '도로명',
    keywords: ['도로명', '백제대로', '전북대', '덕진구'],
  },
  {
    id: 'girin-daero',
    name: '기린대로',
    address: '전북특별자치도 전주시 완산구 기린대로',
    category: '도로명',
    keywords: ['도로명', '기린대로', '한옥마을', '완산구'],
  },
  {
    id: 'hongik',
    name: '홍익대로',
    address: '전북특별자치도 전주시 덕진구 홍익대로',
    category: '도로명',
    keywords: ['도로명', '홍익대로', '덕진구'],
  },
  {
    id: 'gunsan-station',
    name: '군산역',
    address: '전북특별자치도 군산시 내흥2길 197',
    category: '장소',
    keywords: ['군산역', '군산', '전북', '내흥동'],
  },
  {
    id: 'iksan-station',
    name: '익산역',
    address: '전북특별자치도 익산시 익산대로 153',
    category: '장소',
    keywords: ['익산역', '익산', '전북', '익산대로'],
  },
  {
    id: 'namwon-terminal',
    name: '남원공용버스터미널',
    address: '전북특별자치도 남원시 용성로 109',
    category: '장소',
    keywords: ['남원', '터미널', '버스터미널', '전북'],
  },
];

const normalize = (value: string) => value.toLowerCase().replace(/\s+/g, '');
const HANGUL_BASE = 0xac00;
const HANGUL_LAST = 0xd7a3;
const CHOSEONG = [
  'ㄱ',
  'ㄲ',
  'ㄴ',
  'ㄷ',
  'ㄸ',
  'ㄹ',
  'ㅁ',
  'ㅂ',
  'ㅃ',
  'ㅅ',
  'ㅆ',
  'ㅇ',
  'ㅈ',
  'ㅉ',
  'ㅊ',
  'ㅋ',
  'ㅌ',
  'ㅍ',
  'ㅎ',
];

const toChoseong = (value: string) =>
  value
    .split('')
    .map((char) => {
      const code = char.charCodeAt(0);
      if (code < HANGUL_BASE || code > HANGUL_LAST) return char;
      return CHOSEONG[Math.floor((code - HANGUL_BASE) / 588)];
    })
    .join('');

function searchLocalPlaces(query: string, limit = 4): PlaceSearchResult[] {
  const q = normalize(query);
  if (!q) return [];

  return PLACES
    .map((place) => {
      const haystack = normalize([place.name, place.address, place.category, ...(place.keywords ?? [])].join(' '));
      const choseongHaystack = normalize(toChoseong([place.name, place.address, ...(place.keywords ?? [])].join(' ')));
      if (!haystack.includes(q) && !choseongHaystack.includes(q)) return null;
      const startsWithName = normalize(place.name).startsWith(q) ? 0 : 1;
      const startsWithKeyword = (place.keywords ?? []).some((keyword) => normalize(keyword).startsWith(q)) ? 0 : 1;
      return { place, rank: startsWithName + startsWithKeyword };
    })
    .filter((item): item is { place: PlaceSearchResult; rank: number } => item !== null)
    .sort((a, b) => a.rank - b.rank || a.place.name.localeCompare(b.place.name, 'ko'))
    .slice(0, limit)
    .map((item) => item.place);
}

interface NominatimResult {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  category?: string;
  type?: string;
  address?: Record<string, string>;
  namedetails?: Record<string, string>;
}

const categoryFrom = (item: NominatimResult): PlaceSearchResult['category'] => {
  if (item.category === 'highway' || item.type === 'road') return '도로명';
  if (item.category === 'boundary' || item.type === 'administrative') return '지역';
  if (item.type?.includes('stop') || item.type === 'bus_station') return '정류장';
  return '장소';
};

const nameFrom = (item: NominatimResult): string => {
  const address = item.address ?? {};
  const namedetails = item.namedetails ?? {};
  return (
    namedetails['name:ko'] ||
    namedetails.name ||
    address.amenity ||
    address.tourism ||
    address.shop ||
    address.building ||
    address.road ||
    address.suburb ||
    address.quarter ||
    address.city ||
    address.town ||
    address.county ||
    address.state ||
    item.display_name.split(',')[0]?.trim() ||
    item.display_name
  );
};

const addressFrom = (item: NominatimResult, name: string): string => {
  const parts = item.display_name
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  const withoutName = parts[0] === name ? parts.slice(1) : parts;
  return withoutName.join(' ') || item.display_name;
};

async function searchMapPlaces(query: string, limit = 8): Promise<PlaceSearchResult[]> {
  const params = new URLSearchParams({
    q: query,
    format: 'jsonv2',
    addressdetails: '1',
    namedetails: '1',
    countrycodes: 'kr',
    limit: String(limit),
    'accept-language': 'ko,en',
  });

  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`);
  if (!response.ok) return [];
  const data = (await response.json()) as NominatimResult[];

  return data.map((item) => {
    const name = nameFrom(item);
    return {
      id: `osm-${item.place_id}`,
      name,
      address: addressFrom(item, name),
      category: categoryFrom(item),
      lat: Number(item.lat),
      lon: Number(item.lon),
    };
  });
}

async function searchBusStops(query: string, limit = 8): Promise<PlaceSearchResult[]> {
  const data = await blogApi.searchStops(query);
  return data.slice(0, limit).map((stop) => ({
    id: `blog-stop-${stop.stop_id}`,
    name: stop.stop_name,
    address: stop.stop_name,
    category: '정류장' as const,
    lat: stop.lat,
    lon: stop.lng,
  }));
}

export async function searchPlaces(query: string, limit = 8): Promise<PlaceSearchResult[]> {
  const q = query.trim();
  if (!q) return [];

  const local = searchLocalPlaces(q);
  const stops = await searchBusStops(q, limit).catch(() => []);
  const remote = await searchMapPlaces(q, limit).catch(() => []);
  const seen = new Set<string>();

  return [...stops, ...local, ...remote]
    .filter((place) => {
      const key = normalize(`${place.name}-${place.address}`);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit);
}

export async function reverseSearchPlace(lat: number, lon: number): Promise<PlaceSearchResult> {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
    format: 'jsonv2',
    addressdetails: '1',
    namedetails: '1',
    'accept-language': 'ko,en',
  });

  const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params.toString()}`);
  if (!response.ok) {
    const name = '선택한 위치';
    return {
      id: `picked-${lat}-${lon}`,
      name,
      address: name,
      category: '장소',
      lat,
      lon,
    };
  }

  const item = (await response.json()) as NominatimResult;
  const name = nameFrom(item);
  const address = addressFrom(item, name);
  return {
    id: `picked-${item.place_id ?? `${lat}-${lon}`}`,
    name: name || address || '선택한 위치',
    address: address || name || '선택한 위치',
    category: categoryFrom(item),
    lat,
    lon,
  };
}

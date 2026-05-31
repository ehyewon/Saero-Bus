type NaverNamespace = any;

declare global {
  interface Window {
    naver?: {
      maps?: NaverMapsNamespace;
    };
  }
}

let loadingPromise: Promise<NaverNamespace> | null = null;

export function getNaverMapKey() {
  return (
    import.meta.env.VITE_NAVER_MAP_CLIENT_ID ||
    import.meta.env.VITE_NAVER_MAP_NCP_KEY_ID ||
    import.meta.env.VITE_NAVER_MAPS_CLIENT_ID ||
    ''
  );
}

export function loadNaverMaps(): Promise<NaverNamespace> {
  if (window.naver?.maps) return Promise.resolve(window.naver);
  if (loadingPromise) return loadingPromise;

  const key = getNaverMapKey();
  if (!key) return Promise.reject(new Error('Missing NAVER Maps client key'));

  loadingPromise = new Promise<NaverNamespace>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${encodeURIComponent(
      key,
    )}&submodules=geocoder`;
    script.async = true;
    script.onload = () => {
      if (window.naver?.maps) {
        resolve(window.naver);
      } else {
        reject(new Error('NAVER Maps SDK did not initialize'));
      }
    };
    script.onerror = () => reject(new Error('Failed to load NAVER Maps SDK'));
    document.head.appendChild(script);
  });

  return loadingPromise;
}

export function getNaverMapsDebugUrl() {
  const key = getNaverMapKey();
  if (!key) return '';
  return `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${encodeURIComponent(
    key,
  )}&submodules=geocoder`;
}

export function getNaverMapsDebugState() {
  return {
    hasKey: Boolean(getNaverMapKey()),
    keyPrefix: getNaverMapKey() ? `${getNaverMapKey().slice(0, 4)}...` : '',
    pageOrigin: window.location.origin,
    topOrigin: (() => {
      try {
        return window.top?.location.origin || '';
      } catch {
        return 'cross-origin';
      }
    })(),
    sdkLoaded: Boolean(window.naver?.maps),
    scripts: Array.from(document.scripts)
      .map((script) => script.src)
      .filter((src) => src.includes('map.naver.com/openapi/v3/maps.js')),
  };
}

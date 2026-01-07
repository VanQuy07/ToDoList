// Xử lý bản đồ và tìm kiếm địa điểm tách riêng
const LEAFLET_JS_URLS = [
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js'
];

const LEAFLET_CSS_URLS = [
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css'
];

let mapInstance = null;
let mapMarker = null;
let mapInitialized = false;
let isInitializing = false;
let leafletLoading = null;
let fullMapInstance = null;
let fullMapMarker = null;

document.addEventListener('DOMContentLoaded', () => {
  setupMapPage();
});

function setupMapPage() {
  attachMapInputShortcut();
  ensureMapReady();
  attachMapExpand();
}

function attachMapInputShortcut() {
  const addressInput = document.getElementById('addressInput');
  if (addressInput) {
    addressInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        searchAddress();
      }
    });
  }
}

async function ensureMapReady() {
  if (mapInitialized || isInitializing) return;
  isInitializing = true;

  try {
    await loadLeafletIfNeeded();
    await waitForLeaflet();
    initMap();
  } catch (err) {
    console.error(err);
    updateMapStatus('Lỗi: Thư viện bản đồ chưa sẵn sàng.', true);
  } finally {
    isInitializing = false;
  }
}

async function waitForLeaflet(retries = 8, delayMs = 250) {
  for (let i = 0; i < retries; i++) {
    if (typeof L !== 'undefined') return;
    await new Promise(res => setTimeout(res, delayMs));
  }
  throw new Error('Leaflet library not loaded');
}

function loadLeafletIfNeeded() {
  if (typeof L !== 'undefined') return Promise.resolve();
  if (leafletLoading) return leafletLoading;

  leafletLoading = new Promise((resolve, reject) => {
    // Inject CSS once
    const existingCss = document.querySelector('link[data-leaflet="css"]');
    if (!existingCss) {
      const cssLink = document.createElement('link');
      cssLink.rel = 'stylesheet';
      cssLink.href = LEAFLET_CSS_URLS[0];
      cssLink.dataset.leaflet = 'css';
      document.head.appendChild(cssLink);
    }

    let loaded = false;

    // Try JS URLs sequentially
    const tryLoad = (index) => {
      if (index >= LEAFLET_JS_URLS.length) {
        reject(new Error('Không thể tải Leaflet từ CDN'));
        return;
      }

      const script = document.createElement('script');
      script.src = LEAFLET_JS_URLS[index];
      script.async = true;
      script.defer = true;
      script.onload = () => {
        loaded = true;
        resolve();
      };
      script.onerror = () => {
        script.remove();
        tryLoad(index + 1);
      };
      document.head.appendChild(script);
    };

    tryLoad(0);

    // Safety timeout
    setTimeout(() => {
      if (!loaded && typeof L === 'undefined') {
        reject(new Error('Timeout tải Leaflet'));
      } else {
        resolve();
      }
    }, 5000);
  });

  return leafletLoading;
}

// Khởi tạo bản đồ với Leaflet (dùng dữ liệu OpenStreetMap)
function initMap() {
  const mapContainer = document.getElementById('map');

  if (typeof L === 'undefined') {
    updateMapStatus('Lỗi: Thư viện bản đồ chưa sẵn sàng.', true);
    return;
  }

  if (!mapContainer) {
    updateMapStatus('Không tìm thấy vùng chứa bản đồ.', true);
    return;
  }

  try {
    mapInstance = L.map(mapContainer).setView([21.0285, 105.8542], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(mapInstance);

    mapMarker = L.marker([21.0285, 105.8542]).addTo(mapInstance);
    mapInitialized = true;
    updateMapStatus('Bản đồ đã sẵn sàng.');
    mapInstance.invalidateSize();
  } catch (err) {
    updateMapStatus('Lỗi khởi tạo: ' + err.message, true);
  }
}

// Tìm kiếm địa điểm và cập nhật bản đồ
async function searchAddress() {
  const input = document.getElementById('addressInput');
  if (!input) return;

  const query = input.value.trim();
  if (query === '') {
    input.classList.add('shake');
    setTimeout(() => input.classList.remove('shake'), 500);
    updateMapStatus('Vui lòng nhập địa điểm cần tìm.', true);
    return;
  }

  if (!mapInitialized) {
    await ensureMapReady();
  }
  if (!mapInitialized) return;

  updateMapStatus('Đang tìm kiếm...', false);

  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=vn&limit=1`;

  try {
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) {
      throw new Error('Không thể gọi API bản đồ');
    }

    const results = await response.json();
    if (!results || results.length === 0) {
      updateMapStatus('Không tìm thấy kết quả. Thử từ khóa khác.', true);
      return;
    }

    const { lat, lon, display_name: displayName } = results[0];
    const latNum = Number(lat);
    const lonNum = Number(lon);

    mapInstance.setView([latNum, lonNum], 14);

    if (!mapMarker) {
      mapMarker = L.marker([latNum, lonNum]).addTo(mapInstance);
    } else {
      mapMarker.setLatLng([latNum, lonNum]);
    }
    mapMarker.bindPopup(displayName || 'Vị trí tìm thấy').openPopup();

    updateMapStatus(`Đã tìm thấy: ${displayName || 'Địa điểm'}`);
    syncFullMap();
  } catch (error) {
    updateMapStatus('Có lỗi khi tìm kiếm bản đồ. Vui lòng thử lại.', true);
  }
}

// Cập nhật trạng thái hiển thị bên dưới bản đồ
function updateMapStatus(message, isError = false) {
  const statusEl = document.getElementById('mapStatus');
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.classList.toggle('error', !!isError);
}

// --- Fullscreen map handling ---
function attachMapExpand() {
  const mapContainer = document.getElementById('map');
  if (!mapContainer) return;

  mapContainer.addEventListener('click', () => {
    openFullMap();
  });
}

async function openFullMap() {
  const overlay = document.getElementById('mapOverlay');
  if (!overlay) return;

  overlay.style.display = 'flex';
  document.body.style.overflow = 'hidden';

  await ensureMapReady();
  syncFullMap(true);
}

function closeFullMap() {
  const overlay = document.getElementById('mapOverlay');
  if (!overlay) return;
  overlay.style.display = 'none';
  document.body.style.overflow = '';
}

function syncFullMap(forceInit = false) {
  const fullMapContainer = document.getElementById('mapFull');
  if (!fullMapContainer || !mapInitialized) return;

  const center = mapInstance ? mapInstance.getCenter() : { lat: 21.0285, lng: 105.8542 };
  const zoom = mapInstance ? mapInstance.getZoom() : 13;

  if (!fullMapInstance || forceInit) {
    fullMapInstance = L.map(fullMapContainer).setView(center, zoom);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(fullMapInstance);
    fullMapMarker = L.marker(center).addTo(fullMapInstance);
    setTimeout(() => fullMapInstance.invalidateSize(), 50);
  } else {
    fullMapInstance.setView(center, zoom);
    if (!fullMapMarker) {
      fullMapMarker = L.marker(center).addTo(fullMapInstance);
    } else {
      fullMapMarker.setLatLng(center);
    }
    setTimeout(() => fullMapInstance.invalidateSize(), 50);
  }
}


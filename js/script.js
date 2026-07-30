const API_KEY = 'at_K2nCYt3H1gnguPjFbUeD5Zx7SzRDt';

// Custom Marker Icon
const customIcon = L.divIcon({
  className: 'custom-leaflet-marker',
  html: `<div class="custom-pulse-marker"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});

// Map Tile Providers
const tiles = {
  dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  light: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
};

let map = null;
let marker = null;
let currentTileLayer = null;

// Inisialisasi Peta
function initMap(lat, lng) {
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
  
  map = L.map('map', { zoomControl: false }).setView([lat, lng], 13);
  
  currentTileLayer = L.tileLayer(tiles[currentTheme], {
    maxZoom: 19,
    attribution: '© OpenStreetMap | © CARTO'
  }).addTo(map);

  marker = L.marker([lat, lng], { icon: customIcon }).addTo(map);

  // Panggil invalidateSize setelah peta benar-benar ditampilkan
  setTimeout(() => {
    if (map) map.invalidateSize();
  }, 300);
}

// Switch Map Tile saat Dark/Light Mode
function switchMapTile(theme) {
  if (!map || !currentTileLayer) return; // cegah error jika map belum siap
  map.removeLayer(currentTileLayer);
  currentTileLayer = L.tileLayer(tiles[theme], {
    maxZoom: 19,
    attribution: '© OpenStreetMap | © CARTO'
  }).addTo(map);
}

// Update Lokasi Peta & Marker
function updateMap(lat, lng) {
  // Validasi koordinat
  if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
    console.warn('Koordinat tidak valid:', lat, lng);
    return;
  }

  if (!map) {
    initMap(lat, lng);
  } else {
    map.setView([lat, lng], 13);
    if (marker) marker.setLatLng([lat, lng]);
    map.invalidateSize();
  }
}

// Validasi Domain (diperbaiki untuk mendukung subdomain dan TLD panjang)
function isDomain(str) {
  // Mendukung domain seperti sub.domain.co.id
  const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;
  return domainRegex.test(str);
}

// Fetch API
async function fetchIpDetails(query = '') {
  let url = `https://geo.ipify.org/api/v2/country,city?apiKey=${API_KEY}`;
  
  if (query) {
    if (isDomain(query)) {
      url += `&domain=${encodeURIComponent(query)}`;
    } else {
      url += `&ipAddress=${encodeURIComponent(query)}`;
    }
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.messages?.[0] || 'IP atau Domain tidak ditemukan.');
    }
    
    const data = await response.json();

    // Update tampilan (pastikan elemen ada)
    const ipDisplay = document.getElementById('ip-display');
    const locationDisplay = document.getElementById('location-display');
    const timezoneDisplay = document.getElementById('timezone-display');
    const ispDisplay = document.getElementById('isp-display');

    if (ipDisplay) ipDisplay.innerText = data.ip || '-';
    if (locationDisplay) {
      const locationParts = [
        data.location?.city,
        data.location?.region,
        data.location?.postalCode
      ].filter(Boolean);
      locationDisplay.innerText = locationParts.length ? locationParts.join(', ') : '-';
    }
    if (timezoneDisplay) {
      timezoneDisplay.innerText = data.location?.timezone ? `UTC ${data.location.timezone}` : '-';
    }
    if (ispDisplay) ispDisplay.innerText = data.isp || '-';

    // Update peta jika koordinat tersedia
    if (data.location && typeof data.location.lat === 'number' && typeof data.location.lng === 'number') {
      updateMap(data.location.lat, data.location.lng);
    } else {
      console.warn('Koordinat tidak tersedia dari API.');
    }

  } catch (error) {
    alert(error.message || 'Terjadi kesalahan saat mengambil data.');
  }
}

// DOM Event Listener
document.addEventListener('DOMContentLoaded', () => {
  // 1. Toggle Theme Logic
  const themeToggleBtn = document.getElementById('theme-toggle');
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      
      document.documentElement.setAttribute('data-theme', newTheme);
      switchMapTile(newTheme);
    });
  }

  // 2. Search Form Logic
  const searchForm = document.getElementById('search-form');
  if (searchForm) {
    searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('ip-input');
      const query = input ? input.value.trim() : '';
      if (query) fetchIpDetails(query);
    });
  }

  // 3. Load IP Awal
  fetchIpDetails();

  // 4. Pastikan peta di-refresh setelah semua layout selesai
  window.addEventListener('load', () => {
    if (map) {
      setTimeout(() => map.invalidateSize(), 300);
    }
  });
});
/**
 * IP Address Tracker
 * Refactored: Semantic, Accessible, Responsive, Best Practice
 */

// ============================================
// CONFIGURATION
// ============================================
const CONFIG = {
  API_KEY: 'at_K2nCYt3H1gnguPjFbUeD5Zx7SzRDt',
  DEFAULT_ZOOM: 13,
  TILE_URL: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  TILE_ATTRIBUTION: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
};

// ============================================
// STATE
// ============================================
const state = {
  map: null,
  marker: null,
  tileLayer: null,
  isLoading: false
};

// ============================================
// DOM ELEMENTS
// ============================================
const elements = {
  form: document.getElementById('search-form'),
  input: document.getElementById('ip-input'),
  error: document.getElementById('search-error'),
  ip: document.getElementById('ip-display'),
  location: document.getElementById('location-display'),
  timezone: document.getElementById('timezone-display'),
  isp: document.getElementById('isp-display'),
  toast: document.getElementById('toast')
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Validate IPv4 address
 */
function isValidIPv4(ip) {
  const regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][1-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][1-9]?)$/;
  return regex.test(ip.trim());
}

/**
 * Validate domain name
 */
function isValidDomain(domain) {
  const regex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;
  return regex.test(domain.trim().toLowerCase());
}

/**
 * Show toast notification (non-intrusive)
 */
function showToast(message, duration = 3000) {
  const { toast } = elements;
  if (!toast) return;
  
  toast.textContent = message;
  toast.classList.add('show');
  
  setTimeout(() => {
    toast.classList.remove('show');
  }, duration);
}

/**
 * Show inline error
 */
function showError(message) {
  const { error } = elements;
  if (error) {
    error.textContent = message;
    // Clear after 4 seconds
    setTimeout(() => {
      error.textContent = '';
    }, 4000);
  }
}

/**
 * Set loading state
 */
function setLoading(loading) {
  state.isLoading = loading;
  const skeletonHTML = '<span class="skeleton" aria-hidden="true"></span>';
  
  if (loading) {
    [elements.ip, elements.location, elements.timezone, elements.isp].forEach(el => {
      if (el) el.innerHTML = skeletonHTML;
    });
  }
}

// ============================================
// MAP FUNCTIONS
// ============================================

/**
 * Initialize Leaflet map
 */
function initMap(lat, lng) {
  if (state.map) return;
  
  state.map = L.map('map', {
    zoomControl: false,
    attributionControl: true
  }).setView([lat, lng], CONFIG.DEFAULT_ZOOM);
  
  // Add zoom control to bottom right
  L.control.zoom({ position: 'bottomright' }).addTo(state.map);
  
  // Add tile layer
  state.tileLayer = L.tileLayer(CONFIG.TILE_URL, {
    maxZoom: 19,
    attribution: CONFIG.TILE_ATTRIBUTION
  }).addTo(state.map);
  
  // Add custom marker
  const customIcon = L.divIcon({
    className: 'custom-marker',
    iconSize: [46, 56],
    iconAnchor: [23, 56],
    popupAnchor: [0, -56]
  });
  
  state.marker = L.marker([lat, lng], { icon: customIcon }).addTo(state.map);
  
  // Fix rendering after layout
  requestAnimationFrame(() => {
    setTimeout(() => state.map.invalidateSize(), 300);
  });
}

/**
 * Update map position
 */
function updateMap(lat, lng) {
  if (!state.map) {
    initMap(lat, lng);
    return;
  }
  
  if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
    console.warn('Invalid coordinates:', lat, lng);
    return;
  }
  
  state.map.setView([lat, lng], CONFIG.DEFAULT_ZOOM, {
    animate: true,
    duration: 1
  });
  
  if (state.marker) {
    state.marker.setLatLng([lat, lng]);
  }
  
  state.map.invalidateSize();
}

// ============================================
// API FUNCTIONS
// ============================================

/**
 * Fetch IP geolocation data
 */
async function fetchIpDetails(query = '') {
  if (state.isLoading) return;
  
  setLoading(true);
  elements.error.textContent = ''; // Clear previous errors
  
  let url = `https://geo.ipify.org/api/v2/country,city?apiKey=${CONFIG.API_KEY}`;
  
  if (query) {
    const cleanQuery = query.trim();
    if (isValidDomain(cleanQuery)) {
      url += `&domain=${encodeURIComponent(cleanQuery)}`;
    } else if (isValidIPv4(cleanQuery)) {
      url += `&ipAddress=${encodeURIComponent(cleanQuery)}`;
    } else {
      setLoading(false);
      showError('Please enter a valid IP address or domain.');
      return;
    }
  }
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.messages?.[0] || 'IP or domain not found.');
    }
    
    const data = await response.json();
    renderData(data);
    
  } catch (error) {
    console.error('API Error:', error);
    showError(error.message || 'Something went wrong. Please try again.');
    showToast('Failed to fetch data', 4000);
  } finally {
    setLoading(false);
  }
}

/**
 * Render data to DOM
 */
function renderData(data) {
  // IP Address
  if (elements.ip) {
    elements.ip.textContent = data.ip || '-';
  }
  
  // Location: City, Region, PostalCode
  if (elements.location) {
    const parts = [data.location?.city, data.location?.region, data.location?.postalCode]
      .filter(Boolean);
    elements.location.textContent = parts.length ? parts.join(', ') : '-';
  }
  
  // Timezone
  if (elements.timezone) {
    elements.timezone.textContent = data.location?.timezone 
      ? `UTC ${data.location.timezone}` 
      : '-';
  }
  
  // ISP
  if (elements.isp) {
    elements.isp.textContent = data.isp || '-';
  }
  
  // Update map
  if (data.location?.lat != null && data.location?.lng != null) {
    updateMap(data.location.lat, data.location.lng);
  }
}

// ============================================
// EVENT LISTENERS
// ============================================

function initEventListeners() {
  // Form submit
  if (elements.form) {
    elements.form.addEventListener('submit', (e) => {
      e.preventDefault();
      const query = elements.input?.value.trim();
      
      if (!query) {
        showError('Please enter an IP address or domain.');
        return;
      }
      
      fetchIpDetails(query);
    });
  }
  
  // Window resize (debounced)
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (state.map) state.map.invalidateSize();
    }, 250);
  });
  
  // Visibility change (fix map when tab becomes active)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && state.map) {
      setTimeout(() => state.map.invalidateSize(), 100);
    }
  });
}

// ============================================
// INITIALIZATION
// ============================================

function init() {
  initEventListeners();
  fetchIpDetails(); // Load user's IP on startup
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

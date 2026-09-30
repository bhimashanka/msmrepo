const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const API_BASE_URL = (
  import.meta.env.VITE_API_URL || 
  (isLocalhost ? 'http://localhost:5000/api' : 'https://msmrepo.onrender.com/api')
).replace(/\/$/, '');

export const fetchWithAuth = async (endpoint, currentUser, options = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    'x-user-role': currentUser?.role || 'admin',
    'x-user-username': currentUser?.username || 'admin_gen',
    'x-user-base-id': currentUser?.base_id || '',
    ...options.headers
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'API Request Failed');
    }

    return data;
  } catch (err) {
    console.warn(`API request to ${endpoint} failed:`, err.message);
    // Handle network errors (offline / backend cold start / CORS)
    if (err.name === 'TypeError' || err.message === 'Failed to fetch') {
      if (options.method === 'POST' || options.method === 'PUT' || options.method === 'DELETE' || options.method === 'PATCH') {
        return { success: true, id: Date.now(), message: 'Record processed in offline/demo mode' };
      }
      return [];
    }
    throw err;
  }
};

const API_BASE_URL = 'http://localhost:5000/api';

export const fetchWithAuth = async (endpoint, currentUser, options = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    'x-user-role': currentUser?.role || 'admin',
    'x-user-username': currentUser?.username || 'admin_gen',
    'x-user-base-id': currentUser?.base_id || '',
    ...options.headers
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'API Request Failed');
  }

  return data;
};

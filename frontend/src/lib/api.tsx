// API utility functions with authentication
const API_BASE = 'http://localhost:8000';

export async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE}${endpoint}`;
  const token = localStorage.getItem('token');

  console.log('🌐 API Request Debug:', {
    endpoint,
    hasToken: !!token,
    tokenPreview: token ? token.substring(0, 20) + '...' : 'none'
  });

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    console.log('✅ Authorization header added');
  } else {
    console.log('❌ No token found in localStorage');
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    localStorage.removeItem('token');
    sessionStorage.removeItem('user');
    window.location.href = '/login';
    return;
  }

  return response;
}

export const api = {
  post: async (endpoint: string, data: any) => {
    const response = await apiRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response?.json();
  },

  get: async (endpoint: string) => {
    const response = await apiRequest(endpoint);
    return response?.json();
  },

  delete: async (endpoint: string) => {
    const response = await apiRequest(endpoint, { method: 'DELETE' });
    return response?.json();
  },
};

export async function getStories(offset = 0, limit = 6) {
  return api.get(`/api/stories?offset=${offset}&limit=${limit}`);
}

export async function searchStories(query: string, limit = 10) {
  return api.post('/api/search-stories', { query, limit });
}

export async function saveStory(story: any) {
  return api.post('/api/save-story', { story });
}

export async function deleteStory(storyId: string) {
  return api.delete(`/api/stories/${storyId}`);
}

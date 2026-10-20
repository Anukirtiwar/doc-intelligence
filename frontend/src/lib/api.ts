export const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

const getToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('access_token');
  }
  return null;
};

// Helper to parse error messages properly
const parseError = (error: any): string => {
  if (typeof error === 'string') return error;
  if (error?.detail) {
    if (typeof error.detail === 'string') return error.detail;
    if (Array.isArray(error.detail)) {
      // Pydantic validation errors
      return error.detail.map((e: any) => e.msg || JSON.stringify(e)).join(', ');
    }
    return JSON.stringify(error.detail);
  }
  if (error?.message) return error.message;
  return 'Something went wrong';
};

export const api = {
  async get<T>(endpoint: string): Promise<T> {
    const token = getToken();
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(parseError(error));
    }
    return response.json();
  },

  async post<T>(endpoint: string, data?: any): Promise<T> {
    const token = getToken();
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
      body: data ? JSON.stringify(data) : undefined,
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(parseError(error));
    }
    return response.json();
  },

  async put<T>(endpoint: string, data?: any): Promise<T> {
    const token = getToken();
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
      body: data ? JSON.stringify(data) : undefined,
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(parseError(error));
    }
    return response.json();
  },

  async delete<T>(endpoint: string): Promise<T> {
    const token = getToken();
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'DELETE',
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(parseError(error));
    }
    return response.json();
  },

  async upload<T>(endpoint: string, file: File): Promise<T> {
    const token = getToken();
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(parseError(error));
    }
    return response.json();
  },

  auth: {
    async register(email: string, username: string, password: string, fullName?: string) {
      return api.post('/api/v1/auth/register', {
        email,
        username,
        password,
        full_name: fullName || null,
      });
    },

    async login(username: string, password: string) {
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('password', password);

      const response = await fetch(`${API_BASE}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(parseError(error));
      }
      const data = await response.json();
      if (data.access_token) {
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('user', JSON.stringify(data.user));
      }
      return data;
    },

    logout() {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
    },

    getCurrentUser() {
      if (typeof window !== 'undefined') {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
      }
      return null;
    },

    isAuthenticated() {
      if (typeof window !== 'undefined') {
        return !!localStorage.getItem('access_token');
      }
      return false;
    },
  },
};
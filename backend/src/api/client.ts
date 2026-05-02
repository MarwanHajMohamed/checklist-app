import axios from 'axios';

export const API_ORIGIN = import.meta.env.VITE_API_BASE_URL ?? '';

// Access token lives only in memory — never in localStorage
let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

const client = axios.create({
  baseURL: `${API_ORIGIN}/api`,
  withCredentials: true, // send httpOnly refresh-token cookie
});

client.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

let refreshing: Promise<string> | null = null;

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const isRefreshEndpoint = original.url?.includes('/auth/refresh');
    if (error.response?.status === 401 && !original._retry && !isRefreshEndpoint) {
      original._retry = true;
      try {
        if (!refreshing) {
          refreshing = axios
            .post<{ accessToken: string }>(`${API_ORIGIN}/api/auth/refresh`, {}, { withCredentials: true })
            .then((r) => {
              accessToken = r.data.accessToken;
              refreshing = null;
              return r.data.accessToken;
            })
            .catch((e) => {
              refreshing = null;
              accessToken = null;
              if (window.location.pathname !== '/login') {
                window.location.href = '/login';
              }
              return Promise.reject(e);
            });
        }
        const newToken = await refreshing;
        original.headers.Authorization = `Bearer ${newToken}`;
        return client(original);
      } catch {
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  }
);

export default client;

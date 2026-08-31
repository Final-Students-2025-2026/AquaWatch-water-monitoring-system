import { handleUnauthorized } from "./authEvents";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:8000";

export function authHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function toArray(data) {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    if (Array.isArray(data.results)) return data.results;
    if (Array.isArray(data.data)) return data.data;
    if (Array.isArray(data.devices)) return data.devices;
    if (Array.isArray(data.alerts)) return data.alerts;
    if (Array.isArray(data.readings)) return data.readings;
  }
  return [];
}

async function request(path, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  const headers = {
    ...(options.body && { "Content-Type": "application/json" }),
    ...authHeaders(),
    ...(options.headers || {}),
  };

  if (options.public) {
    delete headers.Authorization;
  }

  try {
    const response = await fetch(`${BACKEND_URL}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });
    if (response.status === 401 && !options.public) {
      handleUnauthorized();
    }
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    return response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

export const api = {
  getMe: (token) =>
    request("/api/auth/me/", {
      public: true,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }),
  getDevices: () => request("/api/devices/"),
  getAlerts: () => request("/api/alerts/").then(toArray),
  getThresholds: () => request("/api/thresholds").then(toArray),
  getLatestReading: (deviceId) =>
    request(`/api/readings/latest/?device_id=${deviceId}`),
  getHistory: (deviceId, hours = 24) =>
    request(`/api/readings/history/?device_id=${deviceId}&hours=${hours}`),
};

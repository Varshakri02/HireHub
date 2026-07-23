// Axios instance. Auto-attaches the JWT and points at the proxied /api.
import axios from "axios";

const api = axios.create({ baseURL: "/api" });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Pull a clean message out of an axios error for display.
export function errMsg(e, fallback = "Something went wrong") {
  return e?.response?.data?.error || e?.message || fallback;
}

// Upload a File object; resolves to { url, name, type, size }.
export async function uploadFile(file) {
  const fd = new FormData();
  fd.append("file", file);
  const r = await api.post("/upload", fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return r.data;
}

export default api;

// Thin fetch wrapper: adds the JWT and turns error responses into thrown Errors.
const BASE = import.meta.env.VITE_API_URL || '/api';
let token = localStorage.getItem('ccgms_token');

export const hasToken = () => !!token;
export const setToken = (t) => {
  token = t;
  t ? localStorage.setItem('ccgms_token', t) : localStorage.removeItem('ccgms_token');
};

export async function api(path, method = 'GET', body) {
  const isForm = body instanceof FormData; // file uploads: the browser sets the multipart header itself
  const res = await fetch(BASE + path, {
    method,
    headers: { ...(!isForm && { 'Content-Type': 'application/json' }), ...(token && { Authorization: 'Bearer ' + token }) },
    body: isForm ? body : body && JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || 'Request failed'), { status: res.status });
  return data;
}

// URL for an uploaded image/video (<img>/<video> can't send headers, so the token goes in the query string).
export const fileUrl = (id) => `${BASE}/files/${id}?t=${encodeURIComponent(token || '')}`;

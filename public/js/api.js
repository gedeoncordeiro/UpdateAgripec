// ── API CLIENT ────────────────────────────────────────────────────────────
const API = {
  token: null,

  async req(method, path, body, isForm) {
    const opts = {
      method,
      headers: {}
    };
    if (this.token) opts.headers['Authorization'] = 'Bearer ' + this.token;
    if (body) {
      if (isForm) {
        opts.body = body; // FormData
      } else {
        opts.headers['Content-Type'] = 'application/json';
        opts.body = JSON.stringify(body);
      }
    }
    const res = await fetch('/api' + path, opts);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.erro || `Erro ${res.status}`);
    return data;
  },

  get:    (p)      => API.req('GET', p),
  post:   (p, b)   => API.req('POST', p, b),
  put:    (p, b)   => API.req('PUT', p, b),
  del:    (p)      => API.req('DELETE', p),
  postF:  (p, b)   => API.req('POST', p, b, true),
  putF:   (p, b)   => API.req('PUT',  p, b, true),
};

/**
 * icons.js — Sistema de ícones SVG monocrômicos
 * Todos usam currentColor para adaptar ao tema claro/escuro.
 * Uso: ICONS.nome  → string SVG pronta para inserir no HTML
 */
const ICONS = (() => {
  const svg = (path, vb = '0 0 24 24', extra = '') =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ${extra}>${path}</svg>`;

  const sfill = (path, vb = '0 0 24 24') =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" fill="currentColor" stroke="none">${path}</svg>`;

  return {
    // ── Navegação ──────────────────────────────────────────────────────
    dashboard: svg(`
      <rect x="3" y="3" width="7" height="7" rx="1.5"/>
      <rect x="14" y="3" width="7" height="7" rx="1.5"/>
      <rect x="3" y="14" width="7" height="7" rx="1.5"/>
      <rect x="14" y="14" width="7" height="7" rx="1.5"/>`),

    clientes: svg(`
      <circle cx="9" cy="7" r="4"/>
      <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      <path d="M21 21v-2a4 4 0 0 0-3-3.85"/>`),

    imoveis: svg(`
      <path d="M3 9.5L12 3l9 6.5V21H3V9.5z"/>
      <path d="M9 21V12h6v9"/>`),

    semoventes: svg(`
      <ellipse cx="12" cy="14" rx="7" ry="5"/>
      <circle cx="8" cy="8" r="2.5"/>
      <circle cx="16" cy="8" r="2.5"/>
      <path d="M5.5 10.5C4 10 3 9 3 8c0-1.1.9-2 2-2"/>
      <path d="M18.5 10.5C20 10 21 9 21 8c0-1.1-.9-2-2-2"/>
      <circle cx="9" cy="14.5" r=".8" fill="currentColor" stroke="none"/>
      <circle cx="15" cy="14.5" r=".8" fill="currentColor" stroke="none"/>`),

    projeto: svg(`
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>`),

    relatorios: svg(`
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
      <rect x="9" y="3" width="6" height="4" rx="1"/>
      <line x1="9" y1="12" x2="15" y2="12"/>
      <line x1="9" y1="16" x2="13" y2="16"/>`),

    mapas: svg(`
      <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
      <line x1="9" y1="3" x2="9" y2="18"/>
      <line x1="15" y1="6" x2="15" y2="21"/>`),

    backup: svg(`
      <polyline points="23 4 23 10 17 10"/>
      <polyline points="1 20 1 14 7 14"/>
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>`),

    admin: svg(`
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.07 4.93A10 10 0 1 0 4.93 19.07 10 10 0 0 0 19.07 4.93"/>
      <path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>`),

    // ── Ações ─────────────────────────────────────────────────────────
    plus: svg(`<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>`),

    edit: svg(`
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>`),

    trash: svg(`
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14H6L5 6"/>
      <path d="M10 11v6M14 11v6"/>
      <path d="M9 6V4h6v2"/>`),

    search: svg(`<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>`),

    save: svg(`
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
      <polyline points="17 21 17 13 7 13 7 21"/>
      <polyline points="7 3 7 8 15 8"/>`),

    download: svg(`
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>`),

    upload: svg(`
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="17 8 12 3 7 8"/>
      <line x1="12" y1="3" x2="12" y2="15"/>`),

    pdf: svg(`
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="8" y1="13" x2="16" y2="13"/>
      <line x1="8" y1="17" x2="12" y2="17"/>`),

    upload_img: svg(`
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <circle cx="8.5" cy="8.5" r="1.5"/>
      <polyline points="21 15 16 10 5 21"/>`),

    logout: svg(`
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>`),

    refresh: svg(`
      <polyline points="23 4 23 10 17 10"/>
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>`),

    // ── Status / Feedback ──────────────────────────────────────────────
    check: svg(`<polyline points="20 6 9 17 4 12"/>`),
    check_circle: svg(`<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>`),
    x_circle: svg(`<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>`),
    warning: svg(`<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>`),
    info: svg(`<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>`),

    // ── Métricas / UI ─────────────────────────────────────────────────
    users: svg(`
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>`),

    home: svg(`<path d="M3 9.5L12 3l9 6.5V21H3V9.5z"/><path d="M9 21V12h6v9"/>`),

    cow: svg(`
      <ellipse cx="12" cy="15" rx="7" ry="4.5"/>
      <path d="M5.5 12C4 11 3 9.5 3 8.5 3 7 4 6 5 6c.5 0 1 .3 1.5.8"/>
      <path d="M18.5 12C20 11 21 9.5 21 8.5 21 7 20 6 19 6c-.5 0-1 .3-1.5.8"/>
      <circle cx="8.5" cy="7.5" r="2.5"/>
      <circle cx="15.5" cy="7.5" r="2.5"/>
      <path d="M8.5 5V3M15.5 5V3"/>
      <circle cx="10" cy="15.5" r=".7" fill="currentColor" stroke="none"/>
      <circle cx="14" cy="15.5" r=".7" fill="currentColor" stroke="none"/>`),

    money: svg(`
      <circle cx="12" cy="12" r="10"/>
      <path d="M12 6v2m0 8v2"/>
      <path d="M9 10h4.5a1.5 1.5 0 0 1 0 3h-3a1.5 1.5 0 0 0 0 3H15"/>`),

    area: svg(`
      <path d="M2 20l4-4 4 4 4-8 4 4 4-8"/>
      <line x1="2" y1="4" x2="2" y2="20"/>
      <line x1="2" y1="20" x2="22" y2="20"/>`),

    bolt: svg(`<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>`),

    // ── Tema ──────────────────────────────────────────────────────────
    moon: svg(`<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>`),
    sun: svg(`
      <circle cx="12" cy="12" r="5"/>
      <line x1="12" y1="1" x2="12" y2="3"/>
      <line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1" y1="12" x2="3" y2="12"/>
      <line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>`),

    // ── Logo / Marca ──────────────────────────────────────────────────
    wheat: sfill(`
      M12 2
      c0 0-.3 2.5-.3 5 0 4 2 7.5 2 7.5s-1.5-1-3.2-1c-1 0-2 .4-2.7 1.1
      C7 15.4 6.5 16 6.5 16s1.5.5 3 .5c1.2 0 2-.5 2-.5
      v6h1v-6s.8.5 2 .5c1.5 0 3-.5 3-.5s-.5-.6-1.3-1.4C15.5 14 14.5 13.5 13.5 13.5c-1.7 0-3.2 1-3.2 1
      s2-3.5 2-7.5c0-2.5-.3-5-.3-5z
      M8.5 11c-.8-1-1-2.5-1-3.5 0-.5.1-1 .2-1.5-.4.4-.7.9-.9 1.5-.4 1-.3 2.2.2 3.1.3.5.8 1 1.5 1.5z
      M15.5 11c.8-1 1-2.5 1-3.5 0-.5-.1-1-.2-1.5.4.4.7.9.9 1.5.4 1 .3 2.2-.2 3.1-.3.5-.8 1-1.5 1.5z`,
      '0 0 24 24'),

    // ── Campos / Formulário ───────────────────────────────────────────
    map_pin: svg(`<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>`),
    calendar: svg(`<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>`),
    phone: svg(`<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.53 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.18 6.18l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>`),
    mail: svg(`<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>`),
    file: svg(`<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>`),
    image: svg(`<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>`),
    settings: svg(`<circle cx="12" cy="12" r="3"/><path d="M19.07 4.93A10 10 0 1 0 4.93 19.07"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>`),
    lock: svg(`<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>`),
    key: svg(`<circle cx="7.5" cy="15.5" r="5.5"/><path d="M21 2l-9.6 9.6M15.5 7.5l3 3L22 7l-3-3"/>`),
    eye: svg(`<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`),
    chevron_right: svg(`<polyline points="9 18 15 12 9 6"/>`),
    chevron_left: svg(`<polyline points="15 18 9 12 15 6"/>`),
    arrow_right: svg(`<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>`),
    x: svg(`<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>`),
    menu: svg(`<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>`),
    filter: svg(`<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>`),

    // ── Textos do Projeto ─────────────────────────────────────────────
    clipboard: svg(`
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
      <line x1="9" y1="12" x2="15" y2="12"/>
      <line x1="9" y1="16" x2="13" y2="16"/>`),

    leaf: svg(`
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/>
      <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>`),

    layers: svg(`
      <polygon points="12 2 2 7 12 12 22 7 12 2"/>
      <polyline points="2 17 12 22 22 17"/>
      <polyline points="2 12 12 17 22 12"/>`),

    map: svg(`
      <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
      <line x1="9" y1="3" x2="9" y2="18"/>
      <line x1="15" y1="6" x2="15" y2="21"/>`),

    check_square: svg(`
      <polyline points="9 11 12 14 22 4"/>
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>`),

    link: svg(`
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>`),

    // ── Update System ────────────────────────────────────────────────
    cloud: svg(`
      <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9z"/>`),

    rotate_ccw: svg(`
      <polyline points="1 4 1 10 7 10"/>
      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>`),

    clock: svg(`
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>`),

    alert: svg(`
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>`),
  };
})();

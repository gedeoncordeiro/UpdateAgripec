// ── ESTADO GLOBAL ─────────────────────────────────────────────────────────
let usuarioAtual = null;

// ── INIT ──────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  iniciarTema();
  const token    = localStorage.getItem('ag_token');
  const userJson = localStorage.getItem('ag_user');
  if (token && userJson) {
    try {
      API.token     = token;
      usuarioAtual  = JSON.parse(userJson);
      iniciarApp();
    } catch(e) {
      localStorage.removeItem('ag_token');
      localStorage.removeItem('ag_user');
    }
  }
});

// ── LOGIN ─────────────────────────────────────────────────────────────────
async function fazerLogin() {
  const email  = document.getElementById('login-email')?.value?.trim();
  const senha  = document.getElementById('login-senha')?.value;
  const erroEl = document.getElementById('login-erro');
  if (erroEl) erroEl.style.display = 'none';
  if (!email || !senha) {
    if (erroEl) { erroEl.textContent = 'Preencha e-mail e senha.'; erroEl.style.display = 'block'; }
    return;
  }
  try {
    const data = await API.post('/auth/login', { email, senha });
    API.token    = data.token;
    usuarioAtual = data.usuario;
    localStorage.setItem('ag_token', data.token);
    localStorage.setItem('ag_user', JSON.stringify(data.usuario));
    iniciarApp();
  } catch (e) {
    if (erroEl) { erroEl.textContent = e.message; erroEl.style.display = 'block'; }
  }
}

// Enter no login
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('login-senha')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') fazerLogin();
  });
  document.getElementById('login-email')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('login-senha')?.focus();
  });
});

function iniciarApp() {
  document.getElementById('page-login').style.display = 'none';
  document.getElementById('page-app').style.display   = 'flex';

  // Atualiza sidebar com dados do usuário
  const initials = (usuarioAtual.nome || 'US')
    .split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase();
  const avatarEl  = document.getElementById('user-avatar');
  const nomeEl    = document.getElementById('user-nome');
  const perfilEl  = document.getElementById('user-perfil');
  if (avatarEl)  avatarEl.textContent  = initials;
  if (nomeEl)    nomeEl.textContent    = usuarioAtual.nome;
  if (perfilEl)  perfilEl.textContent  = usuarioAtual.perfil === 'admin' ? 'Administrador' : 'Operador';

  // Mostra menu admin apenas para administradores
  const navAdmin = document.getElementById('nav-admin');
  if (navAdmin) navAdmin.style.display = usuarioAtual.perfil === 'admin' ? 'flex' : 'none';

  navegarPara('dashboard', document.querySelector('.nav-item[data-section="dashboard"]'));
  // Verifica lembretes urgentes na agenda
  if (typeof verificarLembretesUrgentes === 'function') verificarLembretesUrgentes();
  // Verifica atualizações em background (silencioso)
  verificarUpdateBackground();
}

// ── Verificação silenciosa de atualizações ─────────────────────────────────
async function verificarUpdateBackground() {
  try {
    const data = await API.get('/update/check');
    if (data.tem_atualizacao && data.versao_remota) {
      const navItem = document.querySelector('.nav-item[data-section="update"]');
      if (navItem) {
        const badge = document.createElement('span');
        badge.className = 'nav-badge';
        badge.textContent = 'NOVA';
        navItem.appendChild(badge);
      }
    }
  } catch(e) {
    // Silencioso — servidor pode estar offline
  }
}

function sair() {
  localStorage.removeItem('ag_token');
  localStorage.removeItem('ag_user');
  API.token    = null;
  usuarioAtual = null;
  // Reseta UI
  document.getElementById('page-app').style.display   = 'none';
  document.getElementById('page-login').style.display = 'flex';
  const erroEl = document.getElementById('login-erro');
  if (erroEl) erroEl.style.display = 'none';
}

// ── NAVEGAÇÃO ─────────────────────────────────────────────────────────────
function navegarPara(secao, btn) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));

  const secEl = document.getElementById('section-' + secao);
  if (secEl) secEl.classList.add('active');

  // Se btn não foi passado, tenta encontrar pelo data-section
  const navBtn = btn || document.querySelector(`.nav-item[data-section="${secao}"]`);
  if (navBtn) navBtn.classList.add('active');

  const loaders = {
    dashboard:  carregarDashboard,
    clientes:   iniciarClientes,
    imoveis:    iniciarImoveis,
    semoventes: iniciarSemoventes,
    relatorios: iniciarRelatorios,
    mapas:      iniciarMapas,
    admin:      iniciarAdmin,
    backup:     iniciarBackup,
    update:     iniciarUpdate,
    projeto:    iniciarProjeto,
    apascentamento: iniciarApascentamento,
    financeiro:  iniciarFinanceiro,
    agenda:      iniciarAgenda,
    orcamentos:  iniciarOrcamentos,
    links:       iniciarLinks,
  };
  if (loaders[secao]) loaders[secao]();
}

// ── TEMA ──────────────────────────────────────────────────────────────────
function iniciarTema() {
  const salvo = localStorage.getItem('ag_tema') || 'light';
  document.documentElement.setAttribute('data-theme', salvo);
  atualizarIconeTema(salvo);
}

function alternarTema() {
  const atual = document.documentElement.getAttribute('data-theme') || 'light';
  const novo  = atual === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', novo);
  localStorage.setItem('ag_tema', novo);
  atualizarIconeTema(novo);
}

function atualizarIconeTema(tema) {
  const icon = document.getElementById('tema-icon');
  if (icon) icon.innerHTML = tema === 'dark' ? ICONS.sun : ICONS.moon;
}

// ── DESABILITAR AUTOCOMPLETE GLOBAL ───────────────────────────────────────
(function desabilitarAutocomplete() {
  // Aplica nos inputs já existentes e nos que forem criados dinamicamente
  function aplicar(root) {
    root.querySelectorAll('input, select, textarea').forEach(el => {
      if (!el.hasAttribute('autocomplete')) el.setAttribute('autocomplete', 'off');
      el.setAttribute('autocomplete', 'off');
    });
  }
  document.addEventListener('DOMContentLoaded', () => aplicar(document));
  const obs = new MutationObserver(muts => {
    muts.forEach(m => m.addedNodes.forEach(n => {
      if (n.nodeType === 1) { aplicar(n); }
    }));
  });
  obs.observe(document.body, { childList: true, subtree: true });
})();

// ── TOAST ─────────────────────────────────────────────────────────────────
function toast(msg, tipo = 'ok') {
  const el = document.createElement('div');
  el.className = `toast toast-${tipo}`;
  const iconKey = tipo === 'ok' ? 'check_circle' : tipo === 'err' ? 'x_circle' : tipo === 'warn' ? 'warning' : 'info';
  el.innerHTML = `<span class="icon icon-sm">${ICONS[iconKey]}</span><span>${msg}</span>`;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => el.remove(), 3400);
}

// ── MODAL ─────────────────────────────────────────────────────────────────
function abrirModal(titulo, corpo, rodape, pequeno) {
  document.getElementById('modal-titulo').textContent = titulo;
  document.getElementById('modal-body').innerHTML   = corpo;
  document.getElementById('modal-footer').innerHTML = rodape || '';
  const box = document.querySelector('.modal-box');
  box.classList.toggle('modal-sm', !!pequeno);
  document.getElementById('modal-overlay').classList.add('open');
}

function fecharModal() {
  document.getElementById('modal-overlay').classList.remove('open');
}

// ── Conversão robusta de coordenadas DMS → Decimal (frontend) ──────────
// Aceita: -3.4521, -3,4521, 03°24'33,57"S, 03°24'33.57", 03°30'23,7" etc.
function parseCoordenada(valor, tipo) {
  if (valor == null || valor === '') return null;
  const str = String(valor).trim();
  if (str === '') return null;

  // ── Se contém símbolo de grau (°), vai direto para DMS ──────────────
  // (parseFloat em "03°..." retornaria 3, mascarando o DMS)
  if (str.includes('°')) {
    // Vai para conversão DMS
  } else {
    // ── Tenta converter diretamente como decimal (com ponto ou vírgula) ─
    const comPonto = parseFloat(str.replace(',', '.'));
    if (!isNaN(comPonto)) return comPonto;
    return null;
  }

  // ── Conversão DMS ───────────────────────────────────────────────────
  let s = str
    .replace(/[°º]/g, ' ')      // grau → espaço
    .replace(/['´`]/g, ' ')     // minuto → espaço
    .replace(/["″"']/g, ' ')   // segundo → espaço
    .replace(/,/g, '.')         // vírgula decimal → ponto
    .replace(/\s+/g, ' ')       // consolida espaços
    .trim();

  // ── Detecta e aplica direção ────────────────────────────────────────
  let sinal = 1;
  const temDirecao = /[NSLOW]$/i.test(s);
  if (temDirecao) {
    const dir = s.slice(-1).toUpperCase();
    if (dir === 'S' || dir === 'O' || dir === 'W') sinal = -1;
    s = s.slice(0, -1).trim();
  } else {
    // Sem direção: assume S para latitude, O para longitude (Brasil)
    sinal = -1;
  }

  // ── Extrai graus, minutos, segundos ────────────────────────────────
  const partes = s.split(' ').filter(p => p !== '').map(p => parseFloat(p));
  if (partes.length === 0) return null;

  let graus = Math.abs(partes[0]);
  let minutos = partes.length > 1 ? Math.abs(partes[1]) : 0;
  let segundos = partes.length > 2 ? Math.abs(partes[2]) : 0;

  if (minutos >= 60) { graus += Math.floor(minutos / 60); minutos = minutos % 60; }
  if (segundos >= 60) { minutos += Math.floor(segundos / 60); segundos = segundos % 60; }

  const decimal = graus + (minutos / 60) + (segundos / 3600);
  return parseFloat((decimal * sinal).toFixed(10));
}

// ── FORMATTERS ────────────────────────────────────────────────────────────
const fmt = {
  moeda: v => 'R$ ' + parseFloat(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
  area:  v => v ? parseFloat(v).toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + ' ha' : '—',
  data:  v => v ? new Date(v).toLocaleDateString('pt-BR') : '—',
  num:   v => parseInt(v || 0).toLocaleString('pt-BR'),
  coordenada: (valor, tipo = 'lat') => {
    if (!valor) return '—';
    const abs = Math.abs(parseFloat(valor));
    const graus = Math.floor(abs);
    const minDec = (abs - graus) * 60;
    const minutos = Math.floor(minDec);
    const segundos = ((minDec - minutos) * 60).toFixed(2);
    const direcao = tipo === 'lat' ? (valor >= 0 ? 'N' : 'S') : (valor >= 0 ? 'L' : 'O');
    return `${graus}°${minutos}'${segundos}"${direcao}`;
  },
};

// ── CONSTANTS ─────────────────────────────────────────────────────────────
const CATEGORIAS = [
  { v:'vaca',    l:'Vaca',    cor:'var(--g600)' },
  { v:'boi',     l:'Boi',     cor:'var(--g500)' },
  { v:'bezerro', l:'Bezerro', cor:'var(--g400)' },
  { v:'bezerra', l:'Bezerra', cor:'var(--g300)' },
  { v:'novilho', l:'Novilho', cor:'var(--b600)' },
  { v:'novilha', l:'Novilha', cor:'var(--b400)' },
  { v:'touro',   l:'Touro',   cor:'var(--a600)' },
  { v:'outro',   l:'Outro',   cor:'var(--s500)' },
];

const SITUACOES = [
  { v:'registrada', l:'Registrada', badge:'badge-green' },
  { v:'posse',      l:'Posse',      badge:'badge-amber' },
  { v:'arrendada',  l:'Arrendada',  badge:'badge-blue'  },
];

const ESTADOS_CIVIS = [
  { v:'solteiro',      l:'Solteiro(a)' },
  { v:'casado',        l:'Casado(a)' },
  { v:'viuvo',         l:'Viúvo(a)' },
  { v:'divorciado',    l:'Divorciado(a)' },
  { v:'uniao_estavel', l:'União Estável' },
];

const REGIMES = ['Comunhão Parcial de Bens','Comunhão Universal de Bens','Separação Total de Bens'];
const MESTICAGENS = ['Puro','½ Sangue','¾ Sangue','Mestiço'];
const TIPOS_DOC = [
  { v:'titulo_dominio',   l:'Título de Domínio' },
  { v:'escritura',        l:'Escritura' },
  { v:'declaracao_posse', l:'Declaração de Posse' },
];

// ── HELPERS ───────────────────────────────────────────────────────────────
function selectOptions(arr, valorAtual = '', placeholder = 'Selecione') {
  return `<option value="">${placeholder}</option>` +
    arr.map(o => `<option value="${o.v || o}"${(o.v || o) === valorAtual ? ' selected' : ''}>${o.l || o}</option>`).join('');
}

function badgeSituacao(sit) {
  const s = SITUACOES.find(x => x.v === sit);
  return s ? `<span class="badge ${s.badge}">${s.l}</span>` : sit || '—';
}

function badgeCategoria(cat) {
  const c = CATEGORIAS.find(x => x.v === cat);
  return c ? `<span class="badge" style="background:${c.cor}22;color:${c.cor};border-color:${c.cor}44">${c.l}</span>` : cat || '—';
}

// ── MÁSCARA CPF (input) ─────────────────────────────────────────────────
function mascaraCPF(el) {
  let v = el.value.replace(/\D/g, '').slice(0, 11);
  v = v.replace(/(\d{3})(\d)/, '$1.$2');
  v = v.replace(/(\d{3})\.(\d{3})(\d)/, '$1.$2.$3');
  v = v.replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
  el.value = v;
}

// ── VALIDA CPF (algoritmo oficial) ──────────────────────────────────────
function validarCPF(cpf) {
  const d = (cpf || '').replace(/\D/g, '');
  if (d.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(d)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(d[i]) * (10 - i);
  let resto = (sum * 10) % 11;
  if (resto === 10) resto = 0;
  if (resto !== parseInt(d[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(d[i]) * (11 - i);
  resto = (sum * 10) % 11;
  if (resto === 10) resto = 0;
  if (resto !== parseInt(d[10])) return false;
  return true;
}

function paginacaoHTML(pag, totalPags, fnPrev = 'paginaAnterior', fnNext = 'proximaPagina') {
  return `
    <span>Página ${pag} de ${totalPags || 1}</span>
    <button onclick="${fnPrev}()" ${pag <= 1 ? 'disabled' : ''}>
      <span class="icon icon-xs">${ICONS.chevron_left}</span> Anterior
    </button>
    <button onclick="${fnNext}()" ${pag >= totalPags ? 'disabled' : ''}>
      Próxima <span class="icon icon-xs">${ICONS.chevron_right}</span>
    </button>
  `;
}

function formValue(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : '';
}

// ── ICON HELPER ───────────────────────────────────────────────────────────
// Retorna span com ícone SVG inline — para usar em templates JS
function icon(name, size = 'sm') {
  return `<span class="icon icon-${size}">${ICONS[name] || ''}</span>`;
}

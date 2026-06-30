// ── APASCENTAMENTO ────────────────────────────────────────────────────────
// Módulo independente para Cálculo Prévio de Apascentamento

// UA padrão por categoria (unidade animal)
const UA_MAP_AP = {
  'bezerro':  0.46, 'bezerra':  0.40,
  'novilho':  0.66, 'novilha':  0.60,
  'boi':      1.20, 'vaca':     0.86,
  'touro':    1.35, 'outro':    1.00,
};

const CATEGORIAS_AP = [
  { nome: 'Bezerros',       ua: 0.46 },
  { nome: 'Bezerras',       ua: 0.40 },
  { nome: 'Novilhos 13/24', ua: 0.66 },
  { nome: 'Novilhas 13/24', ua: 0.60 },
  { nome: 'Novilhos 25/36', ua: 0.88 },
  { nome: 'Novilhas 25/36', ua: 0.73 },
  { nome: 'Bois',           ua: 1.20 },
  { nome: 'Vacas',          ua: 0.86 },
  { nome: 'Touros',         ua: 1.35 },
];

let _apRows = [];   // linhas de categorias no formulário
let _apClienteCache = [];
let _apImovelCache  = [];

// ── TELA PRINCIPAL ────────────────────────────────────────────────────────
async function iniciarApascentamento() {
  const el = document.getElementById('section-apascentamento');
  el.innerHTML = `
    <div class="page-header">
      <h2 class="page-title">
        <span class="icon icon-md">${ICONS.cow||ICONS.wheat}</span>
        Cálculo Prévio de Apascentamento
      </h2>
      <button class="btn btn-primary" onclick="abrirFormApascentamento()">
        ${icon('plus','sm')} Novo Cálculo
      </button>
    </div>

    <!-- Formulário de cálculo (inline, não modal) -->
    <div id="ap-form-wrap" style="display:none"></div>

    <!-- Painel de resultado -->
    <div id="ap-resultado-wrap" style="display:none"></div>

    <!-- Histórico: usa semoventes do cliente para pré-preencher -->
    <div class="card" id="ap-instrucoes-card">
      <div style="text-align:center;padding:48px 24px;color:var(--text-3)">
        <span class="icon icon-3xl">${ICONS.wheat}</span>
        <p style="margin-top:16px;font-size:15px;font-weight:600;color:var(--text-2)">Cálculo de Lotação de Pastagem</p>
        <p style="margin-top:8px;font-size:13px;max-width:400px;margin-left:auto;margin-right:auto">
          Verifique se a pastagem do imóvel suporta os semoventes declarados, de acordo com as Unidades Animal (UA) de cada categoria.
        </p>
        <button class="btn btn-primary" style="margin-top:20px" onclick="abrirFormApascentamento()">
          ${icon('plus','sm')} Iniciar Cálculo
        </button>
      </div>
    </div>`;

  // Pré-carrega clientes e imóveis para selects
  try { const d = await API.get('/clientes?limite=500'); _apClienteCache = d.clientes; } catch(e) {}
  try { const d = await API.get('/imoveis?limite=500');  _apImovelCache  = d.imoveis;  } catch(e) {}
}

// ── FORMULÁRIO ────────────────────────────────────────────────────────────
function abrirFormApascentamento() {
  document.getElementById('ap-instrucoes-card').style.display = 'none';
  document.getElementById('ap-resultado-wrap').style.display  = 'none';
  const wrap = document.getElementById('ap-form-wrap');
  wrap.style.display = 'block';

  const optsClientes = `<option value="">Selecione o cliente</option>` +
    _apClienteCache.map(c => `<option value="${c.id}" data-nome="${c.nome}" data-cpf="${c.cpf||''}">${c.nome}${c.cpf ? ' – ' + c.cpf : ''}</option>`).join('');
  const optsImoveis = `<option value="">Selecione o imóvel</option>` +
    _apImovelCache.map(im => `<option value="${im.id}" data-nome="${im.nome}" data-municipio="${im.municipio||''}" data-area="${im.area_total||0}">${im.nome} – ${im.municipio||''}</option>`).join('');

  wrap.innerHTML = `
    <div class="card" style="margin-bottom:20px">
      <div class="card-title" style="font-size:15px;font-weight:700;color:var(--text-1);margin-bottom:16px;display:flex;align-items:center;gap:8px">
        ${icon('user','sm')} Identificação
      </div>
      <div class="form-grid-2">
        <div class="form-group col-span-2">
          <label>Buscar Cliente pelo CPF</label>
          <div style="display:flex;gap:8px;align-items:center">
            <input id="ap-cpf-busca" placeholder="000.000.000-00" style="flex:1" oninput="this.value=this.value.replace(/\D/g,'').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})\.(\d{3})(\d)/,'$1.$2.$3').replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/,'$1.$2.$3-$4').slice(0,14)" onkeydown="if(event.key==='Enter')apBuscarPorCPF()"/>
            <button class="btn btn-sm btn-primary" onclick="apBuscarPorCPF()" type="button">Buscar</button>
          </div>
          <div id="ap-cpf-info" style="margin-top:6px;display:none;padding:8px 12px;background:var(--bg-card);border:1px solid var(--border);border-radius:8px;font-size:13px"></div>
        </div>
        <div class="form-group">
          <label>Cliente *</label>
          <select id="ap-cliente" onchange="apOnClienteChange(this)">
            ${optsClientes}
          </select>
        </div>
        <div class="form-group">
          <label>Imóvel / Propriedade *</label>
          <select id="ap-imovel" onchange="apOnImovelChange(this)">
            ${optsImoveis}
          </select>
        </div>
      </div>
    </div>

    <div class="card" style="margin-bottom:20px">
      <div class="card-title" style="font-size:15px;font-weight:700;color:var(--text-1);margin-bottom:16px;display:flex;align-items:center;gap:8px">
        Dados da Pastagem
      </div>
      <div class="form-grid-2">
        <div class="form-group">
          <label>Área de Pastagem (ha) *</label>
          <input id="ap-area" type="number" step="0.01" placeholder="Ex: 28.28" oninput="apRecalcular()"/>
        </div>
        <div class="form-group">
          <label>UA de Referência (UA/ha)</label>
          <input id="ap-ua-ref" type="number" step="0.1" value="1.5" oninput="apRecalcular()"/>
        </div>
        <div class="form-group">
          <label>Percentual para o Banco (%)</label>
          <input id="ap-pct" type="number" step="1" value="70" oninput="apRecalcular()"/>
        </div>
        <div class="form-group">
          <label>Suporte Global da Pastagem (UA)</label>
          <input id="ap-sgp" readonly style="background:var(--verde-pale,#ebf5ee);font-weight:700;color:var(--green,#2d6a4f)" value="—"/>
        </div>
      </div>
    </div>

    <div class="card" style="margin-bottom:20px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <div style="font-size:15px;font-weight:700;color:var(--text-1);display:flex;align-items:center;gap:8px">
          Semoventes por Categoria
        </div>
        <button class="btn btn-sm btn-primary" onclick="apAdicionarLinha()">
          Adicionar Categoria
        </button>
      </div>
      <div class="table-wrap">
        <table id="ap-tabela">
          <thead><tr>
            <th>Categoria</th>
            <th style="text-align:center">Existente</th>
            <th style="text-align:center">Novos</th>
            <th style="text-align:center">Idade (m)</th>
            <th style="text-align:center">Total</th>
            <th style="text-align:center">UA Cat</th>
            <th style="text-align:center">UA Total</th>
            <th style="text-align:right">Preço Unit. (R$)</th>
            <th style="text-align:right">Total (R$)</th>
            <th></th>
          </tr></thead>
          <tbody id="ap-tbody"></tbody>
          <tfoot>
            <tr id="ap-tfoot-row" style="background:var(--bg-card);font-weight:700">
              <td colspan="4" style="text-align:right;padding:8px 6px;font-size:12px;color:var(--text-3)">TOTAIS</td>
              <td id="ap-total-cab"  style="text-align:center;padding:8px 6px;color:var(--green,#2d6a4f)">0</td>
              <td></td>
              <td id="ap-total-ua"   style="text-align:center;padding:8px 6px;color:var(--green,#2d6a4f)">0.00</td>
              <td style="text-align:right;padding:8px 6px;font-size:12px;color:var(--text-3)">TOTAL</td>
              <td id="ap-total-val"  style="text-align:right;padding:8px 6px;color:var(--green,#2d6a4f)">R$ 0,00</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>

    <!-- Resultado inline -->
    <div id="ap-resultado-inline" style="display:none;margin-bottom:20px"></div>

    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:32px">
      <button class="btn" style="flex:1;min-width:160px;padding:14px;font-size:14px;border-radius:12px" onclick="apCancelar()">
        ${icon('chevron_left','sm')} Cancelar
      </button>
      <button class="btn" style="flex:1;min-width:200px;padding:14px;font-size:14px;border-radius:12px;background:#5aaa47;color:#fff;border:none;cursor:pointer" onclick="apCalcular()">
        Calcular Resultado
      </button>
      <button class="btn btn-pdf" style="flex:1;min-width:200px;padding:14px;font-size:14px;border-radius:12px" onclick="apGerarPDF()">
        ${icon('pdf','sm')} Gerar PDF
      </button>
    </div>`;

  _apRows = [];
  // Tabela começa vazia — usuário adiciona as categorias manualmente
}

// ── EVENTOS DOS SELECTS ────────────────────────────────────────────────────
async function apOnClienteChange(sel) {
  const opt = sel.options[sel.selectedIndex];
  // Tenta carregar semoventes do cliente para pré-preencher
  const clienteId = sel.value;
  if (!clienteId) return;
  try {
    const { semoventes } = await API.get(`/semoventes?limite=500`);
    const doCliente = semoventes.filter(s => s.proprietario_id === clienteId);
    if (doCliente.length > 0) {
      // Agrupa por categoria e preenche as linhas existentes
      const agrupado = {};
      doCliente.forEach(s => {
        const k = (s.categoria||'').toLowerCase().split(' ')[0];
        if (!agrupado[k]) agrupado[k] = { qtd: 0, pu: s.preco_unitario || 0, idade: s.idade_meses || '' };
        agrupado[k].qtd += parseInt(s.quantidade || 0);
      });
      _apRows.forEach(rowId => {
        const tr = document.getElementById('ap-row-' + rowId);
        if (!tr) return;
        const catEl = tr.querySelector('.ap-cat');
        if (!catEl) return;
        const chave = catEl.value.toLowerCase().split(' ')[0];
        if (agrupado[chave]) {
          const existEl = tr.querySelector('.ap-exist');
          const puEl    = tr.querySelector('.ap-pu');
          const idadeEl = tr.querySelector('.ap-idade');
          if (existEl) existEl.value = agrupado[chave].qtd;
          if (puEl)    puEl.value    = agrupado[chave].pu;
          if (idadeEl && agrupado[chave].idade) idadeEl.value = agrupado[chave].idade;
          apCalcularLinha(rowId);
        }
      });
      toast(`${doCliente.length} semovente(s) carregados do cliente`, 'inf');
    }
  } catch(e) {}
}

function apOnImovelChange(sel) {
  const opt = sel.options[sel.selectedIndex];
  if (!opt || !opt.value) return;
  const area = parseFloat(opt.dataset.area || 0);
  if (area > 0) {
    // Estima pastagem como 60% da área total se não preenchido
    const areaEl = document.getElementById('ap-area');
    if (areaEl && !areaEl.value) {
      areaEl.value = (area * 0.6).toFixed(2);
      apRecalcular();
    }
  }
}

// ── LINHAS DE CATEGORIA ────────────────────────────────────────────────────
function apAdicionarLinha(semov) {
  const id = Date.now() + Math.random();
  _apRows.push(id);
  const tbody = document.getElementById('ap-tbody');
  if (!tbody) return;
  const tr = document.createElement('tr');
  tr.id = 'ap-row-' + id;

  const st = 'width:100%;padding:5px 7px;border:1.5px solid var(--border);border-radius:6px;font-family:var(--font);font-size:12px;background:var(--bg-input);color:var(--text-1)';
  const selOpts = CATEGORIAS_AP.map(c =>
    `<option value="${c.nome}" data-ua="${c.ua}" ${semov?.nome===c.nome?'selected':''}>${c.nome}</option>`
  ).join('') + `<option value="Outro" data-ua="1.0" ${semov?.nome==='Outro'?'selected':''}>Outro</option>`;

  tr.innerHTML = `
    <td style="min-width:130px">
      <select class="ap-cat" style="${st}" onchange="apCatChange(${id})">
        ${selOpts}
      </select>
    </td>
    <td><input class="ap-exist" type="number" min="0" value="${semov ? '' : ''}" placeholder="0" oninput="apCalcularLinha(${id})" style="${st};text-align:right;width:64px"/></td>
    <td><input class="ap-novos" type="number" min="0" value="" placeholder="0" oninput="apCalcularLinha(${id})" style="${st};text-align:right;width:64px"/></td>
    <td><input class="ap-idade" type="number" min="0" value="" placeholder="—" style="${st};text-align:right;width:54px"/></td>
    <td id="ap-total-linha-${id}" style="text-align:center;font-weight:700;padding:0 6px;font-size:12px">0</td>
    <td id="ap-ua-cat-${id}"  style="text-align:center;padding:0 6px;font-size:12px;color:var(--text-3)">—</td>
    <td id="ap-ua-tot-${id}"  style="text-align:center;font-weight:700;padding:0 6px;font-size:12px;color:var(--green,#2d6a4f)">0.00</td>
    <td><input class="ap-pu" type="number" min="0" step="0.01" value="" placeholder="0,00" oninput="apCalcularLinha(${id})" style="${st};text-align:right;width:80px"/></td>
    <td id="ap-vt-${id}" style="text-align:right;font-weight:700;padding:0 6px;font-size:12px;color:var(--green,#2d6a4f)">R$ 0,00</td>
    <td style="text-align:center;padding:0 4px">
      <button onclick="apRemoverLinha(${id})" style="border:none;background:none;cursor:pointer;color:var(--danger,#e53e3e);padding:4px;display:flex;align-items:center">
        <span class="icon icon-sm">${ICONS.x}</span>
      </button>
    </td>`;
  tbody.appendChild(tr);
  apCatChange(id); // seta UA inicial
}

function apCatChange(id) {
  const tr = document.getElementById('ap-row-' + id);
  if (!tr) return;
  const catEl = tr.querySelector('.ap-cat');
  const opt = catEl?.options[catEl?.selectedIndex];
  const ua = parseFloat(opt?.dataset.ua || 1.0);
  const uaEl = document.getElementById('ap-ua-cat-' + id);
  if (uaEl) uaEl.textContent = ua.toFixed(2);
  apCalcularLinha(id);
}

function apCalcularLinha(id) {
  const tr = document.getElementById('ap-row-' + id);
  if (!tr) return;
  const exist = parseInt(tr.querySelector('.ap-exist')?.value || 0);
  const novos  = parseInt(tr.querySelector('.ap-novos')?.value  || 0);
  const total  = exist + novos;
  const catEl  = tr.querySelector('.ap-cat');
  const opt    = catEl?.options[catEl?.selectedIndex];
  const ua_cat = parseFloat(opt?.dataset.ua || 1.0);
  const ua_tot = total * ua_cat;
  const pu     = parseFloat(tr.querySelector('.ap-pu')?.value || 0);
  const vt     = total * pu;

  const fmtR = v => 'R$ ' + v.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  const tlEl  = document.getElementById('ap-total-linha-' + id);
  const uaEl  = document.getElementById('ap-ua-cat-' + id);
  const utEl  = document.getElementById('ap-ua-tot-' + id);
  const vtEl  = document.getElementById('ap-vt-' + id);

  if (tlEl) tlEl.textContent = total;
  if (uaEl) uaEl.textContent = ua_cat.toFixed(2);
  if (utEl) utEl.textContent = ua_tot.toFixed(2);
  if (vtEl) vtEl.textContent = fmtR(vt);

  apAtualizarTotais();
}

function apRemoverLinha(id) {
  _apRows = _apRows.filter(r => r !== id);
  document.getElementById('ap-row-' + id)?.remove();
  apAtualizarTotais();
}

function apAtualizarTotais() {
  let totalCab = 0, totalUA = 0, totalVal = 0;
  _apRows.forEach(id => {
    const tr = document.getElementById('ap-row-' + id);
    if (!tr) return;
    const exist  = parseInt(tr.querySelector('.ap-exist')?.value || 0);
    const novos  = parseInt(tr.querySelector('.ap-novos')?.value  || 0);
    const total  = exist + novos;
    const catEl  = tr.querySelector('.ap-cat');
    const opt    = catEl?.options[catEl?.selectedIndex];
    const ua_cat = parseFloat(opt?.dataset.ua || 1.0);
    const pu     = parseFloat(tr.querySelector('.ap-pu')?.value || 0);
    totalCab += total;
    totalUA  += total * ua_cat;
    totalVal += total * pu;
  });

  const fmtR = v => 'R$ ' + v.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const tcEl = document.getElementById('ap-total-cab');
  const tuEl = document.getElementById('ap-total-ua');
  const tvEl = document.getElementById('ap-total-val');
  if (tcEl) tcEl.textContent = totalCab;
  if (tuEl) tuEl.textContent = totalUA.toFixed(2);
  if (tvEl) tvEl.textContent = fmtR(totalVal);
  apRecalcular();
}

function apRecalcular() {
  const area   = parseFloat(document.getElementById('ap-area')?.value   || 0);
  const uaRef  = parseFloat(document.getElementById('ap-ua-ref')?.value || 1.5);
  const sgp    = area * uaRef;
  const sgpEl  = document.getElementById('ap-sgp');
  if (sgpEl) sgpEl.value = sgp > 0 ? sgp.toFixed(2) : '—';
}

// ── CALCULAR RESULTADO ────────────────────────────────────────────────────
function apCalcular() {
  const area   = parseFloat(document.getElementById('ap-area')?.value   || 0);
  const uaRef  = parseFloat(document.getElementById('ap-ua-ref')?.value || 1.5);
  const pct    = parseFloat(document.getElementById('ap-pct')?.value    || 70);

  if (!area) { toast('Informe a área de pastagem', 'err'); return; }

  const sgp = area * uaRef;
  let totalUA = 0, totalVal = 0;
  _apRows.forEach(id => {
    const tr = document.getElementById('ap-row-' + id);
    if (!tr) return;
    const exist  = parseInt(tr.querySelector('.ap-exist')?.value || 0);
    const novos  = parseInt(tr.querySelector('.ap-novos')?.value  || 0);
    const catEl  = tr.querySelector('.ap-cat');
    const opt    = catEl?.options[catEl?.selectedIndex];
    const ua_cat = parseFloat(opt?.dataset.ua || 1.0);
    const pu     = parseFloat(tr.querySelector('.ap-pu')?.value || 0);
    totalUA  += (exist + novos) * ua_cat;
    totalVal += (exist + novos) * pu;
  });

  const saldo = sgp - totalUA;
  const ok    = saldo >= 0;
  const fmtR  = v => 'R$ ' + v.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const valorBanco = totalVal * (pct / 100);

  const resultEl = document.getElementById('ap-resultado-inline');
  resultEl.style.display = 'block';
  resultEl.innerHTML = `
    <div class="card" style="border:2px solid ${ok ? '#5aaa47' : '#e53e3e'};padding:20px">
      <div style="font-size:14px;font-weight:700;color:${ok ? '#2d6a4f' : '#c53030'};margin-bottom:14px;display:flex;align-items:center;gap:8px">
        ${ok ? '' : 'ATENCAO:'} Resultado Analítico
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:16px">
        <div style="background:var(--bg-input);border-radius:10px;padding:12px 14px;text-align:center">
          <div style="font-size:11px;color:var(--text-3);margin-bottom:4px;text-transform:uppercase">Suporte Global (UA)</div>
          <div style="font-size:22px;font-weight:800;color:var(--green,#2d6a4f)">${sgp.toFixed(2)}</div>
        </div>
        <div style="background:var(--bg-input);border-radius:10px;padding:12px 14px;text-align:center">
          <div style="font-size:11px;color:var(--text-3);margin-bottom:4px;text-transform:uppercase">UA dos Semoventes</div>
          <div style="font-size:22px;font-weight:800;color:var(--text-1)">${totalUA.toFixed(2)}</div>
        </div>
        <div style="background:${ok ? '#ebf5ee' : '#fff5f5'};border-radius:10px;padding:12px 14px;text-align:center">
          <div style="font-size:11px;color:var(--text-3);margin-bottom:4px;text-transform:uppercase">Saldo (UA)</div>
          <div style="font-size:22px;font-weight:800;color:${ok ? '#2d6a4f' : '#c53030'}">${saldo >= 0 ? '+' : ''}${saldo.toFixed(2)}</div>
        </div>
        <div style="background:var(--bg-input);border-radius:10px;padding:12px 14px;text-align:center">
          <div style="font-size:11px;color:var(--text-3);margin-bottom:4px;text-transform:uppercase">Valor Total</div>
          <div style="font-size:18px;font-weight:800;color:var(--green,#2d6a4f)">${fmtR(totalVal)}</div>
        </div>
        <div style="background:#ebf5ee;border-radius:10px;padding:12px 14px;text-align:center">
          <div style="font-size:11px;color:var(--text-3);margin-bottom:4px;text-transform:uppercase">${pct}% Banco</div>
          <div style="font-size:18px;font-weight:800;color:#2d6a4f">${fmtR(valorBanco)}</div>
        </div>
      </div>
      <div style="padding:12px 16px;border-radius:8px;background:${ok ? '#ebf5ee' : '#fff5f5'};color:${ok ? '#2d6a4f' : '#c53030'};font-weight:700;font-size:13px;text-align:center">
        ${ok
          ? ` VALIDADO — A pastagem suporta os semoventes declarados. Saldo de ${saldo.toFixed(2)} UA disponível.`
          : `ATENCAO: ATENÇÃO — Capacidade insuficiente! Deficit de ${Math.abs(saldo).toFixed(2)} UA. Reduza o rebanho ou amplie a área de pastagem.`}
      </div>
    </div>`;

  resultEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ── GERAR PDF ─────────────────────────────────────────────────────────────
async function apGerarPDF() {
  const area  = parseFloat(document.getElementById('ap-area')?.value   || 0);
  const uaRef = parseFloat(document.getElementById('ap-ua-ref')?.value || 1.5);
  const pct   = parseFloat(document.getElementById('ap-pct')?.value    || 70);

  if (!area) { toast('Informe a área de pastagem', 'err'); return; }

  const cliSel    = document.getElementById('ap-cliente');
  const imovelSel = document.getElementById('ap-imovel');
  const cliOpt    = cliSel?.options[cliSel?.selectedIndex];
  const imOpt     = imovelSel?.options[imovelSel?.selectedIndex];

  const categorias = _apRows.map(id => {
    const tr    = document.getElementById('ap-row-' + id);
    if (!tr) return null;
    const catEl = tr.querySelector('.ap-cat');
    const opt   = catEl?.options[catEl?.selectedIndex];
    const ua_cat = parseFloat(opt?.dataset.ua || 1.0);
    const exist  = parseInt(tr.querySelector('.ap-exist')?.value || 0);
    const novos  = parseInt(tr.querySelector('.ap-novos')?.value  || 0);
    const idade  = tr.querySelector('.ap-idade')?.value || '';
    const pu     = parseFloat(tr.querySelector('.ap-pu')?.value || 0);
    const total  = exist + novos;
    return {
      nome:          catEl?.value || '',
      existente:     exist,
      novos:         novos,
      idade,
      total,
      ua_cat,
      ua_total:      parseFloat((total * ua_cat).toFixed(2)),
      preco_unitario: pu,
      valor_total:   total * pu,
    };
  }).filter(Boolean).filter(c => c.total > 0);

  if (categorias.length === 0) { toast('Adicione pelo menos uma categoria com animais', 'err'); return; }

  let empresaConfig = {};
  try { const { config: ec } = await API.get('/config'); empresaConfig = ec || {}; } catch(e) {}

  const sgp = area * uaRef;
  const payload = {
    cliente: {
      nome: cliOpt?.dataset?.nome || '',
      cpf:  cliOpt?.dataset?.cpf  || '',
      id:   cliSel?.value || '',
    },
    imovel: {
      nome:       imOpt?.dataset?.nome       || '',
      municipio:  imOpt?.dataset?.municipio  || '',
    },
    categorias,
    area_pastagem:   area,
    ua_referencia:   uaRef,
    sgp,
    percentual_banco: pct,
    empresa: empresaConfig,
  };

  toast('Gerando PDF de apascentamento...', 'inf');
  try {
    const resp = await fetch('/api/apascentamento/gerar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + API.token },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) { const dd = await resp.json(); throw new Error(dd.erro || 'Erro ao gerar'); }
    const blob = await resp.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    const nomeCliente = (cliOpt?.dataset?.nome || 'cliente').replace(/\s+/g, '_');
    a.download = `Apascentamento_${nomeCliente}_${new Date().toISOString().slice(0,10)}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Apascentamento gerado com sucesso!');
    // Mostra resultado inline também
    apCalcular();
  } catch(e) { toast('Erro: ' + e.message, 'err'); }
}

// ── CANCELAR ─────────────────────────────────────────────────────────────
function apCancelar() {
  document.getElementById('ap-form-wrap').style.display           = 'none';
  document.getElementById('ap-resultado-wrap').style.display      = 'none';
  document.getElementById('ap-instrucoes-card').style.display     = 'block';
  _apRows = [];
}

// ── BUSCA DE CLIENTE POR CPF ─────────────────────────────────────────────
async function apBuscarPorCPF() {
  const cpfInput = document.getElementById('ap-cpf-busca');
  const cpf = cpfInput?.value?.replace(/\D/g,'') || '';
  if (cpf.length < 11) { toast('Informe um CPF válido (11 dígitos)', 'err'); return; }
  const infoEl = document.getElementById('ap-cpf-info');
  if (infoEl) { infoEl.style.display = 'block'; infoEl.innerHTML = 'Buscando...'; }
  try {
    const { cliente, imoveis } = await API.get(`/clientes/cpf/${encodeURIComponent(cpf)}`);
    // Adiciona ao cache se não existir
    if (!_apClienteCache.find(c => c.id === cliente.id)) _apClienteCache.push(cliente);
    if (imoveis?.length) {
      imoveis.forEach(im => { if (!_apImovelCache.find(x => x.id === im.id)) _apImovelCache.push(im); });
    }
    // Seleciona no select de cliente
    const selCli = document.getElementById('ap-cliente');
    if (selCli) {
      selCli.innerHTML = `<option value="">Selecione o cliente</option>` +
        _apClienteCache.map(c =>
          `<option value="${c.id}" data-nome="${c.nome}" data-cpf="${c.cpf||''}" ${c.id===cliente.id?'selected':''}>${c.nome}${c.cpf ? ' – '+c.cpf : ''}</option>`
        ).join('');
    }
    // Filtra imóveis do cliente no select de imóvel
    const selIm = document.getElementById('ap-imovel');
    if (selIm) {
      const imoveisCli = imoveis?.length ? imoveis : _apImovelCache.filter(im => im.proprietario_id === cliente.id);
      selIm.innerHTML = `<option value="">Selecione o imóvel</option>` +
        imoveisCli.map(im =>
          `<option value="${im.id}" data-nome="${im.nome}" data-municipio="${im.municipio||''}" data-area="${im.area_total||0}">${im.nome} – ${im.municipio||''}</option>`
        ).join('');
    }
    // Pré-preenche semoventes do cliente
    if (cliente.id) apOnClienteChange(document.getElementById('ap-cliente'));
    if (infoEl) {
      infoEl.innerHTML = `<span style="color:var(--green)">✓</span> <strong>${cliente.nome}</strong> — CPF: ${cliente.cpf||'—'}${imoveis?.length ? ` · ${imoveis.length} imóvel(is)` : ''}`;
    }
  } catch(e) {
    if (infoEl) { infoEl.innerHTML = `<span style="color:var(--danger,#e53e3e)">✗ ${e.message === 'Cliente não encontrado' ? 'Nenhum cliente encontrado com este CPF.' : e.message}</span>`; }
  }
}

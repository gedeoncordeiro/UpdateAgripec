// ── ORÇAMENTOS ────────────────────────────────────────────────────────────
let _orcPag = 1, _orcBusca = '', _orcTotal = 0;

async function iniciarOrcamentos() {
  const el = document.getElementById('section-orcamentos');
  el.innerHTML = `
    <div class="page-header">
      <h2 class="page-title"><span class="icon icon-md">${ICONS.money}</span> Orçamentos</h2>
      <button class="btn btn-primary" onclick="abrirFormOrcamento()">
        ${icon('plus','sm')} Novo Orçamento
      </button>
    </div>
    <div class="card">
      <div class="toolbar">
        <input type="search" placeholder="Buscar por título ou cliente..." autocomplete="off"
          oninput="buscarOrcamentos(this.value)" value="${_orcBusca}"/>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th>Título</th><th>Cliente</th><th>Itens</th>
            <th style="text-align:right">Valor Total</th><th>Validade</th>
            <th>Status</th><th>Data</th><th></th>
          </tr></thead>
          <tbody id="orc-tbody">
            <tr><td colspan="8" style="text-align:center;padding:28px;color:var(--text-3)">Carregando...</td></tr>
          </tbody>
        </table>
      </div>
      <div class="pagination" id="orc-paginacao"></div>
    </div>`;
  carregarOrcamentos();
}

function buscarOrcamentos(v) {
  _orcBusca = v; _orcPag = 1;
  clearTimeout(buscarOrcamentos._t);
  buscarOrcamentos._t = setTimeout(carregarOrcamentos, 350);
}

async function carregarOrcamentos() {
  try {
    const { orcamentos, paginacao } = await API.get(
      `/orcamentos?busca=${encodeURIComponent(_orcBusca)}&pagina=${_orcPag}&limite=15`
    );
    _orcTotal = paginacao.total;
    const totalPags = Math.ceil(paginacao.total / 15);
    const STATUS_BADGE = { aberto:'badge-blue', aprovado:'badge-green', recusado:'badge-amber', cancelado:'badge-gray' };
    const STATUS_LABEL = { aberto:'Aberto', aprovado:'Aprovado', recusado:'Recusado', cancelado:'Cancelado' };

    document.getElementById('orc-tbody').innerHTML = orcamentos.length
      ? orcamentos.map(o => `
          <tr>
            <td><strong>${o.titulo}</strong></td>
            <td>${o.cliente_nome||'—'}</td>
            <td style="text-align:center"><span class="badge badge-gray">${o.total_itens||0}</span></td>
            <td style="text-align:right"><strong style="color:var(--green)">${fmt.moeda(o.valor_total||0)}</strong></td>
            <td style="font-size:12px">${o.validade_dias||30} dias</td>
            <td><span class="badge ${STATUS_BADGE[o.status]||'badge-gray'}">${STATUS_LABEL[o.status]||o.status}</span></td>
            <td style="font-size:12px;color:var(--text-3)">${fmt.data(o.criado_em)}</td>
            <td style="white-space:nowrap">
              <button class="btn btn-sm btn-pdf" title="Gerar PDF" onclick="gerarOrcamentoPDF('${o.id}')">
                ${icon('pdf')}
              </button>
              <button class="btn btn-sm" title="Editar" onclick="abrirFormOrcamento('${o.id}')">
                ${icon('edit')}
              </button>
              <button class="btn btn-sm btn-danger" title="Excluir" onclick="removerOrcamento('${o.id}','${o.titulo.replace(/'/g,"\\'")}')">
                ${icon('trash')}
              </button>
            </td>
          </tr>`).join('')
      : `<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--text-3)">
           <span class="icon icon-xl">${ICONS.money}</span>
           <p style="margin-top:12px">Nenhum orçamento cadastrado.</p>
           <button class="btn btn-primary" style="margin-top:12px" onclick="abrirFormOrcamento()">
             ${icon('plus','sm')} Criar primeiro orçamento
           </button>
         </td></tr>`;

    document.getElementById('orc-paginacao').innerHTML = paginacaoHTML(_orcPag, totalPags, 'orcPaginaAnterior', 'orcProximaPagina');
  } catch(e) { toast('Erro ao carregar orçamentos: '+e.message, 'err'); }
}

function orcPaginaAnterior() { if (_orcPag > 1) { _orcPag--; carregarOrcamentos(); } }
function orcProximaPagina()  { const tp = Math.ceil(_orcTotal / 15); if (_orcPag < tp) { _orcPag++; carregarOrcamentos(); } }

// ── FORMULÁRIO ─────────────────────────────────────────────────────────────
let _orcItens = [];

async function abrirFormOrcamento(id) {
  let orc = null;
  _orcItens = [];

  if (id) {
    try {
      const { orcamento } = await API.get('/orcamentos/' + id);
      orc = orcamento;
      _orcItens = (orc.itens || []).map(it => ({ ...it }));
    } catch(e) { toast('Erro ao carregar orçamento', 'err'); return; }
  }

  let clientesCache = [];
  try { const d = await API.get('/clientes?limite=200'); clientesCache = d.clientes; } catch(e) {}

  const STATUS_OPTS = ['aberto','aprovado','recusado','cancelado'];

  const corpo = `
    <div class="form-grid-2">
      <div class="form-group col-span-2">
        <label>Título do Orçamento *</label>
        <input id="f-orc-titulo" value="${orc?.titulo||''}" placeholder="Ex: Orçamento de Insumos – Fazenda São João" autocomplete="off"/>
      </div>
      <div class="form-group">
        <label>Cliente</label>
        <select id="f-orc-cliente" autocomplete="off">
          <option value="">— Sem cliente vinculado —</option>
          ${clientesCache.map(c=>`<option value="${c.id}" data-nome="${c.nome}" ${orc?.cliente_id===c.id?'selected':''}>${c.nome} – ${c.cpf}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Validade (dias)</label>
        <input id="f-orc-validade" type="number" value="${orc?.validade_dias||30}" min="1" autocomplete="off"/>
      </div>
      <div class="form-group">
        <label>Status</label>
        <select id="f-orc-status" autocomplete="off">
          ${STATUS_OPTS.map(s=>`<option value="${s}" ${(orc?.status||'aberto')===s?'selected':''}>${s.charAt(0).toUpperCase()+s.slice(1)}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Descrição / Objeto</label>
        <input id="f-orc-descricao" value="${orc?.descricao||''}" placeholder="Descrição resumida do orçamento" autocomplete="off"/>
      </div>
    </div>

    <!-- ITENS -->
    <div style="margin-top:16px;margin-bottom:8px;font-weight:700;font-size:13px;display:flex;align-items:center;gap:8px">
      <span class="icon icon-sm">${ICONS.filter}</span> Itens do Orçamento
    </div>
    <div style="overflow-x:auto;border:1px solid var(--border);border-radius:var(--r8);margin-bottom:12px">
      <table style="margin:0">
        <thead><tr>
          <th style="min-width:220px">Descrição</th>
          <th style="min-width:60px">Unid.</th>
          <th style="min-width:80px;text-align:right">Qtde</th>
          <th style="min-width:110px;text-align:right">Preço Unit.</th>
          <th style="min-width:70px;text-align:right">Desc. %</th>
          <th style="min-width:110px;text-align:right">Total</th>
          <th style="width:36px"></th>
        </tr></thead>
        <tbody id="orc-itens-tbody"></tbody>
      </table>
    </div>
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
      <button class="btn btn-sm" onclick="adicionarItemOrc()">${icon('plus','sm')} Adicionar Item</button>
      <div style="font-weight:800;font-size:16px;color:var(--green)" id="orc-total-display">Total: R$ 0,00</div>
    </div>

    <div class="form-group">
      <label>Observações</label>
      <textarea id="f-orc-obs" rows="3" placeholder="Condições de pagamento, prazo de entrega, validade, etc." autocomplete="off">${orc?.observacoes||''}</textarea>
    </div>`;

  const rodape = `
    <button class="btn" onclick="fecharModal()">Cancelar</button>
    <button class="btn btn-primary" onclick="salvarOrcamento('${id||''}')">
      ${icon('save','sm')} Salvar Orçamento
    </button>`;

  abrirModal(id ? 'Editar Orçamento' : 'Novo Orçamento', corpo, rodape);

  // Renderiza itens já existentes
  setTimeout(() => {
    if (_orcItens.length > 0) {
      _orcItens.forEach(it => adicionarItemOrc(it));
    } else {
      adicionarItemOrc();
    }
  }, 30);
}

// ── ITEM DE ORÇAMENTO ──────────────────────────────────────────────────────
let _orcItemIds = [];

function adicionarItemOrc(it) {
  if (!_orcItemIds) _orcItemIds = [];
  const id = Date.now() + Math.random();
  _orcItemIds.push(id);
  const tbody = document.getElementById('orc-itens-tbody');
  if (!tbody) return;
  const tr = document.createElement('tr');
  tr.id = 'orc-item-' + id;
  const st = 'width:100%;padding:5px 7px;border:1.5px solid var(--border);border-radius:6px;font-size:12px;background:var(--bg-card);color:var(--text-1);font-family:var(--font)';
  tr.innerHTML = `
    <td><input class="oi-desc" value="${it?.descricao||''}" placeholder="Descrição do item" style="${st}" oninput="calcItemOrc(${id})"/></td>
    <td><input class="oi-unid" value="${it?.unidade||'un'}" style="${st};width:56px" oninput="calcItemOrc(${id})"/></td>
    <td><input class="oi-qtd" type="number" min="0" step="0.01" value="${it?.quantidade||1}" style="${st};text-align:right" oninput="calcItemOrc(${id})"/></td>
    <td><input class="oi-pu" type="number" min="0" step="0.01" value="${it?.preco_unitario||0}" style="${st};text-align:right" oninput="calcItemOrc(${id})"/></td>
    <td><input class="oi-desc-pct" type="number" min="0" max="100" step="0.1" value="${it?.desconto_pct||0}" style="${st};text-align:right;width:60px" oninput="calcItemOrc(${id})"/></td>
    <td id="orc-it-tot-${id}" style="text-align:right;font-weight:700;color:var(--green);padding:0 8px;font-size:12px;white-space:nowrap">R$ 0,00</td>
    <td style="text-align:center">
      <button onclick="removerItemOrc(${id})" style="border:none;background:none;cursor:pointer;color:var(--r600);padding:4px;display:flex;align-items:center">
        <span class="icon icon-sm">${ICONS.x}</span>
      </button>
    </td>`;
  tbody.appendChild(tr);
  calcItemOrc(id);
}

function calcItemOrc(id) {
  const tr = document.getElementById('orc-item-'+id); if (!tr) return;
  const qtd   = parseFloat(tr.querySelector('.oi-qtd')?.value  || 0);
  const pu    = parseFloat(tr.querySelector('.oi-pu')?.value   || 0);
  const desc  = parseFloat(tr.querySelector('.oi-desc-pct')?.value || 0);
  const total = qtd * pu * (1 - desc / 100);
  const el = document.getElementById('orc-it-tot-'+id);
  if (el) el.textContent = fmt.moeda(total);
  atualizarTotalOrc();
}

function removerItemOrc(id) {
  _orcItemIds = (_orcItemIds||[]).filter(x => x !== id);
  document.getElementById('orc-item-'+id)?.remove();
  atualizarTotalOrc();
}

function atualizarTotalOrc() {
  let total = 0;
  (_orcItemIds||[]).forEach(id => {
    const tr = document.getElementById('orc-item-'+id); if (!tr) return;
    const qtd  = parseFloat(tr.querySelector('.oi-qtd')?.value  || 0);
    const pu   = parseFloat(tr.querySelector('.oi-pu')?.value   || 0);
    const desc = parseFloat(tr.querySelector('.oi-desc-pct')?.value || 0);
    total += qtd * pu * (1 - desc/100);
  });
  const el = document.getElementById('orc-total-display');
  if (el) el.textContent = 'Total: ' + fmt.moeda(total);
}

function coletarItensOrc() {
  return (_orcItemIds||[]).map((id, i) => {
    const tr = document.getElementById('orc-item-'+id); if (!tr) return null;
    return {
      descricao:    tr.querySelector('.oi-desc')?.value     || '',
      unidade:      tr.querySelector('.oi-unid')?.value     || 'un',
      quantidade:   parseFloat(tr.querySelector('.oi-qtd')?.value  || 1),
      preco_unitario: parseFloat(tr.querySelector('.oi-pu')?.value || 0),
      desconto_pct: parseFloat(tr.querySelector('.oi-desc-pct')?.value || 0),
      ordem: i,
    };
  }).filter(Boolean);
}

// ── SALVAR ─────────────────────────────────────────────────────────────────
async function salvarOrcamento(id) {
  const titulo = document.getElementById('f-orc-titulo')?.value?.trim();
  if (!titulo) { toast('Título é obrigatório', 'err'); return; }

  const clienteEl = document.getElementById('f-orc-cliente');
  const clienteId  = clienteEl?.value || null;
  const clienteNome = clienteEl?.options[clienteEl.selectedIndex]?.dataset?.nome || '';

  const body = {
    titulo,
    cliente_id:    clienteId,
    cliente_nome:  clienteNome,
    descricao:     document.getElementById('f-orc-descricao')?.value || '',
    validade_dias: parseInt(document.getElementById('f-orc-validade')?.value || 30),
    status:        document.getElementById('f-orc-status')?.value || 'aberto',
    observacoes:   document.getElementById('f-orc-obs')?.value || '',
    itens:         coletarItensOrc(),
  };

  try {
    if (id) {
      await API.put('/orcamentos/'+id, body);
      toast('Orçamento atualizado!');
    } else {
      await API.post('/orcamentos', body);
      toast('Orçamento criado!');
    }
    fecharModal();
    carregarOrcamentos();
  } catch(e) { toast('Erro ao salvar: '+e.message, 'err'); }
}

// ── REMOVER ────────────────────────────────────────────────────────────────
async function removerOrcamento(id, titulo) {
  if (!confirm(`Remover o orçamento "${titulo}"?\n\nEsta ação não pode ser desfeita.`)) return;
  try {
    await API.del('/orcamentos/'+id);
    toast('Orçamento removido');
    carregarOrcamentos();
  } catch(e) { toast('Erro: '+e.message, 'err'); }
}

// ── GERAR PDF ──────────────────────────────────────────────────────────────
async function gerarOrcamentoPDF(id) {
  try {
    const { orcamento } = await API.get('/orcamentos/'+id);
    let empresaConfig = {};
    try { const { config: ec } = await API.get('/config'); empresaConfig = ec || {}; } catch(e) {}

    const itens   = orcamento.itens || [];
    const total   = itens.reduce((s,it) => s + (it.quantidade * it.preco_unitario * (1 - (it.desconto_pct||0)/100)), 0);
    const hoje    = new Date().toLocaleDateString('pt-BR');
    const validade = new Date(); validade.setDate(validade.getDate() + (orcamento.validade_dias||30));
    const dataVal  = validade.toLocaleDateString('pt-BR');

    // Montar HTML do orçamento para impressão como PDF via janela do browser
    const nomeEmpresa = empresaConfig.emp_nome_fantasia || empresaConfig.emp_razao_social || 'AgroGestão';
    const cnpj        = empresaConfig.emp_cnpj       || '';
    const fone        = empresaConfig.emp_fone       || '';
    const emailEmp    = empresaConfig.emp_email      || '';
    const endEmp      = empresaConfig.emp_endereco   || '';
    const responsavel = empresaConfig.emp_responsavel|| '';
    const crea        = empresaConfig.emp_crea       || '';

    const linhasItens = itens.map((it, i) => {
      const subtotal = it.quantidade * it.preco_unitario * (1-(it.desconto_pct||0)/100);
      return `<tr style="border-bottom:1px solid #e5e7eb">
        <td style="padding:8px 10px">${i+1}</td>
        <td style="padding:8px 10px">${it.descricao}</td>
        <td style="padding:8px 10px;text-align:center">${it.unidade||'un'}</td>
        <td style="padding:8px 10px;text-align:right">${parseFloat(it.quantidade).toLocaleString('pt-BR',{maximumFractionDigits:2})}</td>
        <td style="padding:8px 10px;text-align:right">${fmt.moeda(it.preco_unitario)}</td>
        <td style="padding:8px 10px;text-align:right">${it.desconto_pct||0}%</td>
        <td style="padding:8px 10px;text-align:right;font-weight:700">${fmt.moeda(subtotal)}</td>
      </tr>`;
    }).join('');

    const htmlPDF = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8"/>
<title>Orçamento – ${orcamento.titulo}</title>
<style>
  * { box-sizing: border-box; margin:0; padding:0; }
  body { font-family: Arial, sans-serif; font-size: 12px; color: #1a1a1a; padding: 30px; background:#fff; }
  .header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:3px solid #166534; padding-bottom:16px; margin-bottom:20px; }
  .empresa-nome { font-size:20px; font-weight:800; color:#166534; }
  .empresa-info { font-size:11px; color:#555; margin-top:4px; line-height:1.6; }
  .orc-titulo { font-size:16px; font-weight:700; text-align:right; color:#1a1a1a; }
  .orc-num { font-size:11px; color:#888; text-align:right; margin-top:2px; }
  .section { margin-bottom:18px; }
  .section-title { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.08em; color:#166534; border-bottom:1.5px solid #d1fae5; padding-bottom:4px; margin-bottom:10px; }
  .info-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px 24px; font-size:12px; }
  .info-label { font-size:10px; font-weight:700; text-transform:uppercase; color:#888; }
  table { width:100%; border-collapse:collapse; font-size:11.5px; }
  thead tr { background:#166534; color:#fff; }
  th { padding:8px 10px; text-align:left; font-size:11px; }
  tbody tr:nth-child(even) { background:#f0fdf4; }
  .total-row { background:#166534 !important; color:#fff; font-weight:800; }
  .total-row td { padding:10px; }
  .footer { margin-top:28px; font-size:10px; color:#888; text-align:center; border-top:1px solid #e5e7eb; padding-top:10px; }
  .status-badge { display:inline-block; padding:3px 10px; border-radius:20px; font-size:10px; font-weight:700;
    background:${orcamento.status==='aprovado'?'#d1fae5':orcamento.status==='recusado'?'#fef9c3':'#dbeafe'};
    color:${orcamento.status==='aprovado'?'#166534':orcamento.status==='recusado'?'#92400e':'#1d4ed8'}; }
  @media print { body { padding:10px; } }
</style>
</head><body>
<div class="header">
  <div>
    <div class="empresa-nome">${nomeEmpresa}</div>
    <div class="empresa-info">
      ${cnpj?'CNPJ: '+cnpj+'<br/>':''}
      ${responsavel?'Resp.: '+responsavel+(crea?' – '+crea:'')+'<br/>':''}
      ${endEmp?endEmp+'<br/>':''}
      ${fone?'Tel.: '+fone+'  ':''}${emailEmp?'E-mail: '+emailEmp:''}
    </div>
  </div>
  <div>
    <div class="orc-titulo">ORÇAMENTO</div>
    <div class="orc-num">${orcamento.titulo}</div>
    <div style="margin-top:6px"><span class="status-badge">${(orcamento.status||'aberto').toUpperCase()}</span></div>
  </div>
</div>

<div class="section">
  <div class="section-title">Dados do Orçamento</div>
  <div class="info-grid">
    <div><div class="info-label">Cliente</div>${orcamento.cliente_nome||'—'}</div>
    <div><div class="info-label">Data de Emissão</div>${hoje}</div>
    <div><div class="info-label">Validade</div>${dataVal} (${orcamento.validade_dias||30} dias)</div>
    <div><div class="info-label">Objeto</div>${orcamento.descricao||'—'}</div>
  </div>
</div>

<div class="section">
  <div class="section-title">Itens do Orçamento</div>
  <table>
    <thead><tr>
      <th style="width:32px">#</th>
      <th>Descrição</th>
      <th style="text-align:center;width:50px">Unid.</th>
      <th style="text-align:right;width:60px">Qtde</th>
      <th style="text-align:right;width:100px">Preço Unit.</th>
      <th style="text-align:right;width:60px">Desc. %</th>
      <th style="text-align:right;width:110px">Total</th>
    </tr></thead>
    <tbody>
      ${linhasItens || '<tr><td colspan="7" style="text-align:center;padding:20px;color:#888">Nenhum item</td></tr>'}
    </tbody>
    <tfoot>
      <tr class="total-row">
        <td colspan="6" style="padding:10px;text-align:right">VALOR TOTAL DO ORÇAMENTO</td>
        <td style="padding:10px;text-align:right;font-size:14px">${fmt.moeda(total)}</td>
      </tr>
    </tfoot>
  </table>
</div>

${orcamento.observacoes ? `
<div class="section">
  <div class="section-title">Observações / Condições</div>
  <p style="font-size:12px;line-height:1.6;color:#444">${orcamento.observacoes.replace(/\n/g,'<br/>')}</p>
</div>` : ''}

<div style="margin-top:40px;display:grid;grid-template-columns:1fr 1fr;gap:40px">
  <div style="text-align:center">
    <div style="border-top:1.5px solid #333;margin-top:40px;padding-top:6px;font-size:11px">
      ${responsavel||nomeEmpresa}<br/>${crea?crea+'<br/>':''}${nomeEmpresa}
    </div>
  </div>
  <div style="text-align:center">
    <div style="border-top:1.5px solid #333;margin-top:40px;padding-top:6px;font-size:11px">
      ${orcamento.cliente_nome||'Cliente'}<br/>Assinatura / Aprovação
    </div>
  </div>
</div>

<div class="footer">Documento gerado em ${hoje} pelo AgroGestão · Sistema de Gestão Rural</div>
</body></html>`;

    const win = window.open('', '_blank', 'width=900,height=700');
    win.document.write(htmlPDF);
    win.document.close();
    setTimeout(() => { win.focus(); win.print(); }, 600);
    toast('Orçamento aberto para impressão/PDF!');
  } catch(e) { toast('Erro ao gerar PDF: '+e.message, 'err'); }
}

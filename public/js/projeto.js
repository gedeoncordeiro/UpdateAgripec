// ── PROJETO TÉCNICO ───────────────────────────────────────────────────────
let _projetoPag = 1, _projetoBusca = '', _projetoTotal = 0;

async function iniciarProjeto() {
  const el = document.getElementById('section-projeto');
  el.innerHTML = `
    <div class="page-header">
      <h2 class="page-title"><span class="icon icon-md">${ICONS.projeto}</span> Projetos Técnicos de Crédito Rural</h2>
      <button class="btn btn-primary" onclick="abrirNovoProjeto()">
        ${icon('plus','sm')} Novo Projeto
      </button>
    </div>
    <div class="card">
      <div class="toolbar">
        <input type="search" placeholder="Buscar por produtor, CPF ou título..." autocomplete="off"
          oninput="buscarProjetos(this.value)" value="${_projetoBusca}"/>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th>Produtor</th><th>CPF</th><th>Tipo</th><th>Banco</th>
            <th>Safra</th><th>Valor</th><th>Status</th><th>Data</th><th></th>
          </tr></thead>
          <tbody id="proj-tbody">
            <tr><td colspan="9" style="text-align:center;padding:28px;color:var(--text-3)">Carregando...</td></tr>
          </tbody>
        </table>
      </div>
      <div class="pagination" id="proj-paginacao"></div>
    </div>`;
  carregarProjetos();
}

function buscarProjetos(v) {
  _projetoBusca = v; _projetoPag = 1;
  clearTimeout(buscarProjetos._t);
  buscarProjetos._t = setTimeout(carregarProjetos, 350);
}

async function carregarProjetos() {
  try {
    const { projetos, paginacao } = await API.get(
      `/projetos?busca=${encodeURIComponent(_projetoBusca)}&pagina=${_projetoPag}&limite=15`
    );
    _projetoTotal = paginacao.total;
    const totalPags = Math.ceil(paginacao.total / 15);
    const TIPO_LABELS = { custeio: 'Custeio Pecuário', investimento: 'Investimento' };
    const STATUS_BADGE = { rascunho: 'badge-gray', finalizado: 'badge-green' };

    document.getElementById('proj-tbody').innerHTML = projetos.length
      ? projetos.map(p => `
          <tr>
            <td><strong>${p.cliente_nome}</strong></td>
            <td><code>${p.cliente_cpf||'—'}</code></td>
            <td><span class="badge badge-blue" style="font-size:10px">${TIPO_LABELS[p.tipo]||p.tipo}</span></td>
            <td>${p.banco||'—'}</td>
            <td>${p.safra||'—'}</td>
            <td><strong style="color:var(--green)">${fmt.moeda(p.valor||0)}</strong></td>
            <td><span class="badge ${STATUS_BADGE[p.status]||'badge-gray'}">${p.status==='finalizado'?'Finalizado':'Rascunho'}</span></td>
            <td style="font-size:12px;color:var(--text-3)">${fmt.data(p.atualizado_em)}</td>
            <td style="white-space:nowrap">
              <button class="btn btn-sm btn-pdf" title="Gerar PDF" onclick="gerarPDFdeProjeto('${p.id}')">
                ${icon('pdf')}
              </button>
              <button class="btn btn-sm" title="Editar" onclick="editarProjeto('${p.id}')">
                ${icon('edit')}
              </button>
              <button class="btn btn-sm btn-danger" title="Excluir" onclick="removerProjeto('${p.id}','${p.cliente_nome.replace(/'/g,"\\'")}')">
                ${icon('trash')}
              </button>
            </td>
          </tr>`).join('')
      : `<tr><td colspan="9" style="text-align:center;padding:40px;color:var(--text-3)">
           <span class="icon icon-xl">${ICONS.projeto}</span>
           <p style="margin-top:12px">Nenhum projeto cadastrado.</p>
           <button class="btn btn-primary" style="margin-top:12px" onclick="abrirNovoProjeto()">
             ${icon('plus','sm')} Criar primeiro projeto
           </button>
         </td></tr>`;

    document.getElementById('proj-paginacao').innerHTML = paginacaoHTML(_projetoPag, totalPags, 'projPaginaAnterior', 'projProximaPagina');
  } catch(e) { toast('Erro ao carregar projetos: '+e.message, 'err'); }
}

function projPaginaAnterior() { if (_projetoPag > 1) { _projetoPag--; carregarProjetos(); } }
function projProximaPagina()  { const tp = Math.ceil(_projetoTotal / 15); if (_projetoPag < tp) { _projetoPag++; carregarProjetos(); } }

async function abrirNovoProjeto() {
  window._projetoEditId = null;
  window._projetoData   = null;
  _renderFormularioProjeto(null);
}

async function editarProjeto(id) {
  try {
    const { projeto } = await API.get('/projetos/' + id);
    window._projetoEditId = id;
    window._projetoData = {
      cliente: { id: projeto.cliente_id, nome: projeto.cliente_nome, cpf: projeto.cliente_cpf,
        estado_civil: '', enquadramento: 'PRONAF', endereco_cidade: '', endereco_uf: '' },
      imovel:  projeto.imovel  || {},
      imoveis: [projeto.imovel || {}],
      semoventes: [],
    };
    _renderFormularioProjeto(projeto);
  } catch(e) { toast('Erro ao carregar projeto: '+e.message, 'err'); }
}

function _renderFormularioProjeto(proj) {
  const el = document.getElementById('section-projeto');
  const ehEdicao = !!proj;
  el.innerHTML = `
    <div class="page-header">
      <h2 class="page-title"><span class="icon icon-md">${ICONS.projeto}</span>
        ${ehEdicao ? 'Editar Projeto' : 'Novo Projeto Técnico'}
      </h2>
      <button class="btn" onclick="iniciarProjeto()">${icon('chevron_left','sm')} Voltar à lista</button>
    </div>
    ${!ehEdicao ? `
    <div class="cpf-search-hero">
      <span class="hero-deco-icon" id="proj-deco"></span>
      <h3>Buscar Produtor</h3>
      <p>Informe o CPF do produtor para pré-carregar os dados cadastrados</p>
      <div class="cpf-input-wrap">
        <input id="proj-cpf" placeholder="000.000.000-00" maxlength="14" autocomplete="off"
          oninput="mascararCPF(this)" onkeydown="if(event.key==='Enter') buscarProdutorProjeto()"/>
        <button class="btn btn-primary" onclick="buscarProdutorProjeto()">
          <span class="icon icon-sm">${ICONS.search}</span> Buscar
        </button>
      </div>
    </div>` : ''}
    <div id="proj-preview">${ehEdicao ? _htmlFormProjeto(proj) : ''}</div>`;

  const decoEl = document.getElementById('proj-deco');
  if (decoEl) decoEl.innerHTML = ICONS.wheat;

  if (ehEdicao) {
    _rebanhoRows = [];
    if (proj.rebanho && proj.rebanho.length > 0) {
      setTimeout(() => proj.rebanho.forEach(r => adicionarLinhaRebanho(r)), 60);
    } else {
      setTimeout(() => adicionarLinhaRebanho(), 60);
    }
  }
}

function _htmlFormProjeto(proj) {
  const p  = proj || {};
  const im = p.imovel || {};
  return `
    ${p.cliente_nome ? `
    <div class="alert alert-ok" style="margin-bottom:20px">
      <span class="icon icon-sm">${ICONS.check_circle}</span>
      Produtor: <strong>${p.cliente_nome}</strong>
      ${p.cliente_cpf ? ' · CPF: '+p.cliente_cpf : ''}
    </div>
    <div class="card card-body" style="margin-bottom:16px;background:var(--bg-subtle)">
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;font-size:13px">
        <div><span style="color:var(--text-2);font-size:11px;font-weight:700;text-transform:uppercase">Nome</span><br><strong>${p.cliente_nome}</strong></div>
        <div><span style="color:var(--text-2);font-size:11px;font-weight:700;text-transform:uppercase">CPF</span><br>${p.cliente_cpf||'—'}</div>
        <div><span style="color:var(--text-2);font-size:11px;font-weight:700;text-transform:uppercase">Imóvel Principal</span><br>${im.nome||'—'}</div>
      </div>
    </div>` : ''}

    <div class="card" style="margin-bottom:16px">
      <div class="card-body" style="padding-bottom:12px">
        <div style="display:flex;align-items:center;justify-content:space-between">
          <div class="card-title" style="margin-bottom:0"><span class="icon icon-md">${ICONS.cow}</span> Rebanho Bovino do Mutuário Proponente</div>
          <button class="btn btn-primary btn-sm" onclick="adicionarLinhaRebanho()">${icon('plus')} Adicionar Animal</button>
        </div>
      </div>
      <div style="overflow-x:auto">
        <table style="margin:0">
          <thead><tr>
            <th style="min-width:200px">Semoventes</th>
            <th style="min-width:120px">Raça</th>
            <th style="min-width:80px;text-align:right">Qtde</th>
            <th style="min-width:110px;text-align:right">Valor Unit. (R$)</th>
            <th style="min-width:120px;text-align:right">Valor Total</th>
            <th style="width:40px"></th>
          </tr></thead>
          <tbody id="rebanho-tbody"></tbody>
        </table>
      </div>
      <div class="card-body" style="padding-top:10px;border-top:1.5px solid var(--border);display:flex;align-items:center;justify-content:space-between">
        <button class="btn btn-sm" onclick="adicionarLinhaRebanho()">${icon('plus')} Linha</button>
        <span id="rebanho-total" style="font-weight:700;color:var(--g600);font-size:13px">Total: 0 cabeças · R$ 0,00</span>
      </div>
    </div>

    <div class="card card-body" style="margin-bottom:16px">
      <div class="card-title"><span class="icon icon-md">${ICONS.relatorios}</span> Dados do Projeto</div>
      <div class="form-grid-2">
        <div class="form-group"><label>Tipo de Projeto</label>
          <select id="proj-tipo" autocomplete="off">
            <option value="custeio" ${p.tipo==='custeio'||!p.tipo?'selected':''}>Custeio Pecuário – Bovinocultura de Corte</option>
            <option value="investimento" ${p.tipo==='investimento'?'selected':''}>Investimento – Mais Alimentos</option>
          </select></div>
        <div class="form-group"><label>Banco</label>
          <select id="proj-banco" autocomplete="off">
            ${['Banco do Brasil','Caixa Econômica Federal','SICOOB','SICREDI','BNB'].map(b=>`<option ${p.banco===b?'selected':''}>${b}</option>`).join('')}
          </select></div>
        <div class="form-group"><label>Safra</label><input id="proj-safra" value="${p.safra||'2025/2026'}" autocomplete="off"/></div>
        <div class="form-group"><label>Nº da Agência</label><input id="proj-agencia" value="${p.agencia||''}" placeholder="Ex: 16519 – Bom Jardim" autocomplete="off"/></div>
        <div class="form-group"><label>Nº da Conta Corrente</label><input id="proj-num-cc" value="${p.num_cc||''}" placeholder="Ex: 30.528-6" autocomplete="off"/></div>
        <div class="form-group"><label>Valor do Projeto (R$)</label><input id="proj-valor" type="number" step="0.01" value="${p.valor||''}" autocomplete="off"/></div>
        <div class="form-group"><label>Taxa de Juros a.a. (%)</label><input id="proj-juros" type="number" step="0.1" value="${p.juros||6}" autocomplete="off"/></div>
        <div class="form-group"><label>Prazo de Reembolso (meses)</label><input id="proj-prazo" type="number" value="${p.prazo||20}" autocomplete="off"/></div>
        <div class="form-group"><label>Data de Reembolso</label><input id="proj-data-reembolso" type="date" value="${p.data_reembolso||''}" autocomplete="off"/></div>
        <div class="form-group"><label>Status</label>
          <select id="proj-status" autocomplete="off">
            <option value="rascunho" ${p.status==='rascunho'||!p.status?'selected':''}>Rascunho</option>
            <option value="finalizado" ${p.status==='finalizado'?'selected':''}>Finalizado</option>
          </select></div>
      </div>
    </div>

    <div class="card card-body" style="margin-bottom:16px">
      <div class="card-title"><span class="icon icon-md">${ICONS.settings}</span> Assistência Técnica</div>
      <div class="form-grid-2">
        <div class="form-group col-span-2"><label>Descrição da Assistência Técnica</label>
          <input id="proj-tipo-assistencia" value="${p.tipo_assistencia||''}" placeholder="Ex: Projeto > Astec 0,5% - CONVENIADA INDIVIDUAL" autocomplete="off"/></div>
        <div class="form-group"><label>Assistência Financiada?</label>
          <select id="proj-financiada" autocomplete="off">
            <option value="Não" ${p.financiada!=='Sim'?'selected':''}>Não</option>
            <option value="Sim" ${p.financiada==='Sim'?'selected':''}>Sim</option>
          </select></div>
        <div class="form-group"><label>RNP do Responsável Técnico</label><input id="proj-rnp" value="${p.rnp||'1117373800'}" autocomplete="off"/></div>
        <div class="form-group col-span-2"><label>Endereço da ASTEC</label>
          <input id="proj-endereco-astec" value="${p.endereco_astec||'RUA SANTA CRUZ, 15 A, CENTRO - BOM JARDIM / MA'}" autocomplete="off"/></div>
      </div>
    </div>

    <div class="card card-body" style="margin-bottom:16px">
      <div class="card-title"><span class="icon icon-md">${ICONS.clientes}</span> Fiador / Avalista (opcional)</div>
      <div class="form-grid-2">
        <div class="form-group"><label>Nome do Fiador/Avalista</label><input id="proj-fiador-nome" value="${p.fiador_nome||''}" placeholder="Nome completo" autocomplete="off"/></div>
        <div class="form-group"><label>CPF do Fiador/Avalista</label><input id="proj-fiador-cpf" value="${p.fiador_cpf||''}" placeholder="000.000.000-00" maxlength="14" oninput="mascararCPF(this)" autocomplete="off"/></div>
      </div>
    </div>

    <div class="card card-body" style="margin-bottom:20px">
      <div class="card-title"><span class="icon icon-md">${ICONS.area}</span> Finalidade / Empreendimento Financiado</div>
      <div class="form-grid-2">
        <div class="form-group"><label>Atividade</label><input id="proj-atividade" value="${p.atividade||'Bovinocultura de corte'}" autocomplete="off"/></div>
        <div class="form-group"><label>Fase de Produção</label>
          <select id="proj-fase" autocomplete="off">
            ${['Recria / Engorda','Cria','Cria / Recria / Engorda','Engorda','Recria'].map(f=>`<option ${p.fase_producao===f?'selected':''}>${f}</option>`).join('')}
          </select></div>
        <div class="form-group"><label>Sistema de Produção</label>
          <select id="proj-sistema" autocomplete="off">
            ${['Extensivo','Semi-intensivo','Intensivo'].map(s=>`<option ${p.sistema===s?'selected':''}>${s}</option>`).join('')}
          </select></div>
        <div class="form-group"><label>Animais Custeados (cabeças)</label><input id="proj-animais" type="number" value="${p.animais_custeados||''}" placeholder="Ex: 29" autocomplete="off"/></div>
        <div class="form-group"><label>Produtividade Esperada</label><input id="proj-produtividade" value="${p.produtividade||''}" placeholder="Ex: 0,36 KgPV/dia/bezerro" autocomplete="off"/></div>
        <div class="form-group"><label>Produto Final</label><input id="proj-produto" value="${p.produto||''}" placeholder="Ex: Boi Gordo" autocomplete="off"/></div>
      </div>
    </div>

    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:32px">
      <button class="btn btn-primary" style="flex:1;min-width:200px;padding:14px;font-size:15px;border-radius:12px" onclick="salvarProjeto()">
        ${icon('save','sm')} Salvar Projeto
      </button>
      <button class="btn btn-pdf" style="flex:1;min-width:200px;padding:14px;font-size:15px;border-radius:12px" onclick="gerarProjetoPDFdoFormulario()">
        ${icon('pdf','sm')} Gerar PDF
      </button>
      <button class="btn" style="flex:1;min-width:200px;padding:14px;font-size:15px;border-radius:12px;background:var(--green,#2d6a4f);color:#fff;border:none;cursor:pointer" onclick="gerarLaudoProjeto()">
        Gerar Laudo de Opiniao
      </button>
      <button class="btn" style="flex:1;min-width:200px;padding:14px;font-size:15px;border-radius:12px;background:#5aaa47;color:#fff;border:none;cursor:pointer" onclick="gerarApascentamentoProjeto()">
        Apascentamento
      </button>
    </div>`;
}

function mascararCPF(input) {
  let v = input.value.replace(/\D/g,'');
  v = v.replace(/(\d{3})(\d)/,'$1.$2');
  v = v.replace(/(\d{3})(\d)/,'$1.$2');
  v = v.replace(/(\d{3})(\d{1,2})$/,'$1-$2');
  input.value = v;
}

// ── REBANHO ────────────────────────────────────────────────────────────────
let _rebanhoRows = [];

function adicionarLinhaRebanho(semov) {
  const id = Date.now() + Math.random();
  _rebanhoRows.push(id);
  const tbody = document.getElementById('rebanho-tbody');
  if (!tbody) return;
  const tr = document.createElement('tr');
  tr.id = 'rb-' + id;
  const st = 'width:100%;padding:6px 8px;border:1.5px solid var(--border);border-radius:7px;font-family:var(--font);font-size:12px;background:var(--bg-card);color:var(--text-1);autocomplete:off';
  const cats = ['Vaca > 36 meses','Boi > 36 meses','Bezerro Macho até 1 ano','Bezerra Fêmea até 1 ano','Novilho Macho 1 a 2 anos','Novilha Fêmea 1 a 2 anos','Touro Reprodutor','Outro'];
  const sel = cats.map(c=>`<option value="${c}" ${semov?.categoria===c?'selected':''}>${c}</option>`).join('');
  tr.innerHTML = `
    <td><select class="rb-semov" style="${st}" onchange="calcularRebanhoLinha(${id})">${sel}</select></td>
    <td><input class="rb-raca" value="${semov?.raca||'Nelore'}" style="${st}"/></td>
    <td><input class="rb-qtd" type="number" min="0" value="${semov?.quantidade||1}" oninput="calcularRebanhoLinha(${id})" style="${st};text-align:right"/></td>
    <td><input class="rb-pu" type="number" min="0" step="0.01" value="${semov?.preco_unitario||0}" oninput="calcularRebanhoLinha(${id})" style="${st};text-align:right"/></td>
    <td id="rb-vt-${id}" style="font-weight:700;color:var(--g600);text-align:right;padding:6px 10px;font-size:12px">R$ 0,00</td>
    <td style="text-align:center"><button onclick="removerLinhaRebanho(${id})" style="border:none;background:none;cursor:pointer;color:var(--r600);padding:4px;display:flex;align-items:center"><span class="icon icon-sm">${ICONS.x}</span></button></td>`;
  tbody.appendChild(tr);
  if (semov) calcularRebanhoLinha(id);
}

function calcularRebanhoLinha(id) {
  const tr = document.getElementById('rb-'+id); if (!tr) return;
  const vt = parseFloat(tr.querySelector('.rb-qtd')?.value||0) * parseFloat(tr.querySelector('.rb-pu')?.value||0);
  const vtEl = document.getElementById('rb-vt-'+id);
  if (vtEl) vtEl.textContent = 'R$ '+vt.toFixed(2).replace('.',',').replace(/\B(?=(\d{3})+(?!\d))/g,'.');
  atualizarTotalRebanho();
}
function removerLinhaRebanho(id) {
  _rebanhoRows = _rebanhoRows.filter(r=>r!==id);
  document.getElementById('rb-'+id)?.remove();
  atualizarTotalRebanho();
}
function atualizarTotalRebanho() {
  let total=0,cab=0;
  _rebanhoRows.forEach(id=>{
    const tr=document.getElementById('rb-'+id); if(!tr) return;
    const q=parseFloat(tr.querySelector('.rb-qtd')?.value||0), p=parseFloat(tr.querySelector('.rb-pu')?.value||0);
    cab+=q; total+=q*p;
  });
  const el=document.getElementById('rebanho-total');
  if(el) el.textContent=`Total: ${cab} cabeças · R$ ${total.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g,'X').replace(/\./g,',').replace(/X/g,'.')}`;
}
function coletarRebanho() {
  return _rebanhoRows.map(id=>{
    const tr=document.getElementById('rb-'+id); if(!tr) return null;
    return { categoria:tr.querySelector('.rb-semov')?.value||'', raca:tr.querySelector('.rb-raca')?.value||'',
      quantidade:parseFloat(tr.querySelector('.rb-qtd')?.value||0), preco_unitario:parseFloat(tr.querySelector('.rb-pu')?.value||0) };
  }).filter(Boolean);
}

// ── BUSCAR PRODUTOR ────────────────────────────────────────────────────────
async function buscarProdutorProjeto() {
  const cpf = document.getElementById('proj-cpf')?.value?.trim();
  if (!cpf || cpf.replace(/\D/g,'').length < 11) { toast('Informe um CPF válido','err'); return; }
  const preview = document.getElementById('proj-preview');
  preview.innerHTML = '<p style="color:var(--text-2);padding:20px">Buscando...</p>';
  try {
    const { cliente, imoveis, semoventes } = await API.get(`/clientes/cpf/${encodeURIComponent(cpf)}`);
    window._projetoData   = { cliente, imoveis, semoventes };
    window._projetoEditId = null;
    _rebanhoRows = [];
    preview.innerHTML = _htmlFormProjeto({ cliente_nome:cliente.nome, cliente_cpf:cliente.cpf, imovel:imoveis[0]||{} });
    if (semoventes.length > 0) {
      const ag={};
      semoventes.forEach(s=>{ const k=`${s.categoria}|${s.raca}|${s.preco_unitario}`; if(!ag[k]) ag[k]={...s,quantidade:0}; ag[k].quantidade+=parseInt(s.quantidade||0); });
      Object.values(ag).forEach(s=>adicionarLinhaRebanho(s));
    } else adicionarLinhaRebanho();
    try { const{config:cfg}=await API.get('/config'); if(cfg.emp_rnp){const e=document.getElementById('proj-rnp');if(e)e.value=cfg.emp_rnp;} if(cfg.emp_endereco){const e=document.getElementById('proj-endereco-astec');if(e)e.value=cfg.emp_endereco;} } catch(e){}
  } catch(e) {
    preview.innerHTML=`<div class="alert alert-erro"><span class="icon icon-sm">${ICONS.x_circle}</span> ${e.message==='Cliente não encontrado'?'Nenhum produtor encontrado com este CPF.':e.message}</div>`;
  }
}

// ── COLETAR FORM ───────────────────────────────────────────────────────────
function _coletarDadosProjeto() {
  const d=window._projetoData||{};
  const cli=d.cliente||{};
  const imovel=d.imoveis?.[0]||d.imovel||{};
  return {
    cliente_id:cli.id||null, cliente_nome:cli.nome||'', cliente_cpf:cli.cpf||'',
    titulo:`Projeto Técnico – ${cli.nome||'Produtor'}`,
    tipo:document.getElementById('proj-tipo')?.value||'custeio',
    banco:document.getElementById('proj-banco')?.value||'',
    safra:document.getElementById('proj-safra')?.value||'',
    agencia:document.getElementById('proj-agencia')?.value||'',
    num_cc:document.getElementById('proj-num-cc')?.value||'',
    valor:parseFloat(document.getElementById('proj-valor')?.value||0),
    juros:parseFloat(document.getElementById('proj-juros')?.value||6),
    prazo:parseInt(document.getElementById('proj-prazo')?.value||20),
    data_reembolso:document.getElementById('proj-data-reembolso')?.value||'',
    tipo_assistencia:document.getElementById('proj-tipo-assistencia')?.value||'',
    financiada:document.getElementById('proj-financiada')?.value||'Não',
    rnp:document.getElementById('proj-rnp')?.value||'',
    endereco_astec:document.getElementById('proj-endereco-astec')?.value||'',
    fiador_nome:document.getElementById('proj-fiador-nome')?.value||'',
    fiador_cpf:document.getElementById('proj-fiador-cpf')?.value||'',
    atividade:document.getElementById('proj-atividade')?.value||'',
    fase_producao:document.getElementById('proj-fase')?.value||'',
    sistema:document.getElementById('proj-sistema')?.value||'',
    animais_custeados:parseInt(document.getElementById('proj-animais')?.value||0),
    produtividade:document.getElementById('proj-produtividade')?.value||'',
    produto:document.getElementById('proj-produto')?.value||'',
    status:document.getElementById('proj-status')?.value||'rascunho',
    rebanho:coletarRebanho(), imovel,
  };
}

async function salvarProjeto() {
  const dados = _coletarDadosProjeto();
  if (!dados.cliente_nome) { toast('Busque um produtor primeiro','err'); return; }
  try {
    if (window._projetoEditId) {
      await API.put(`/projetos/${window._projetoEditId}`, dados);
      toast('Projeto atualizado!');
    } else {
      const { id } = await API.post('/projetos', dados);
      window._projetoEditId = id;
      toast('Projeto salvo!');
    }
  } catch(e) { toast('Erro ao salvar: '+e.message,'err'); }
}

async function gerarProjetoPDFdoFormulario() {
  const d = _coletarDadosProjeto();
  if (!d.cliente_nome) { toast('Busque um produtor primeiro','err'); return; }
  await _enviarParaPDF(d);
}

async function gerarPDFdeProjeto(id) {
  try {
    const { projeto } = await API.get('/projetos/'+id);
    window._projetoData = { cliente:{ id:projeto.cliente_id, nome:projeto.cliente_nome, cpf:projeto.cliente_cpf,
      estado_civil:'', enquadramento:'PRONAF', endereco_cidade:'', endereco_uf:'' }, imovel:projeto.imovel||{}, imoveis:[projeto.imovel||{}] };
    await _enviarParaPDF(projeto);
  } catch(e) { toast('Erro: '+e.message,'err'); }
}

async function _enviarParaPDF(p) {
  const d=window._projetoData||{};
  const cli=d.cliente||{nome:p.cliente_nome,cpf:p.cliente_cpf};
  const imovel=d.imoveis?.[0]||p.imovel||{};
  let empresaConfig={};
  try{const{config:ec}=await API.get('/config');empresaConfig=ec||{};}catch(e){}
  const rebanho=Array.isArray(p.rebanho)?p.rebanho:coletarRebanho();
  const tituloTipo=p.tipo==='custeio'?'PROJETO TÉCNICO DE CUSTEIO PECUÁRIO - BOVINOCULTURA DE CORTE':'PROJETO TÉCNICO DE CRÉDITO RURAL – INVESTIMENTO';
  const data_reembolso=(()=>{const v=p.data_reembolso||'';if(!v)return'';if(v.includes('/'))return v;const[y,m,dd]=v.split('-');return`${dd}/${m}/${y}`;})();
  const payload={
    tipo:p.tipo,banco:p.banco,safra:p.safra,valor:p.valor,juros:p.juros,prazo:p.prazo,agencia:p.agencia,sistema:p.sistema,
    tituloTipo,hoje:new Date().toLocaleDateString('pt-BR'),
    num_cc:p.num_cc,financiada:p.financiada,tipo_assistencia:p.tipo_assistencia,rnp:p.rnp,endereco_astec:p.endereco_astec,
    fiador_nome:p.fiador_nome,fiador_cpf:p.fiador_cpf,
    atividade:p.atividade,fase_producao:p.fase_producao,data_reembolso,
    animais_custeados:p.animais_custeados,produtividade:p.produtividade,produto:p.produto,
    empresa:empresaConfig,
    cliente:{nome:cli.nome,cpf:cli.cpf,estado_civil:cli.estado_civil?.toUpperCase()||'',enquadramento:cli.enquadramento||'PRONAF',
      cidade:cli.endereco_cidade||'',uf:cli.endereco_uf||'',nome_conjuge:cli.nome_conjuge||'',cpf_conjuge:cli.cpf_conjuge||''},
    imovel:{nome:imovel.nome||'',municipio:imovel.municipio||'',uf:imovel.uf||'',situacao:imovel.situacao||'',
      matricula:imovel.matricula||'',cri:imovel.cri||'',data_registro:imovel.data_registro||'',area_total:imovel.area_total||0,
      car:imovel.car||'',ccir:imovel.ccir||'',latitude:imovel.latitude||'',longitude:imovel.longitude||'',roteiro_acesso:imovel.roteiro_acesso||''},
    rebanho,
    totalRebanho:rebanho.reduce((a,r)=>a+(r.quantidade||0)*(r.preco_unitario||0),0),
    totalCabecas:rebanho.reduce((a,r)=>a+(r.quantidade||0),0),
  };
  toast('Gerando projeto técnico...','inf');
  try {
    const resp=await fetch('/api/projeto/gerar',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+API.token},body:JSON.stringify(payload)});
    if(!resp.ok){const dd=await resp.json();throw new Error(dd.erro||'Erro ao gerar');}
    const blob=await resp.blob();
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;a.download=`Projeto_${cli.nome.replace(/\s+/g,'_')}_${new Date().toISOString().slice(0,10)}.pdf`;
    a.click();URL.revokeObjectURL(url);
    toast('Projeto gerado com sucesso!');
  } catch(e){toast('Erro: '+e.message,'err');}
}

async function gerarLaudoProjeto() {
  const d = window._projetoData || {};
  const cli = d.cliente || {};
  if (!cli.nome && !cli.id) { toast('Busque um produtor primeiro', 'err'); return; }
  const imovel = d.imoveis?.[0] || d.imovel || {};

  // Monta lotes do rebanho atual no formulário
  const rebanho = coletarRebanho();
  const lotes = rebanho.map(r => ({
    categoria:      r.categoria,
    raca:           r.raca,
    mesticagem:     '3/4',
    pelagem:        'BRANCA',
    quantidade:     r.quantidade,
    preco_unitario: r.preco_unitario,
    valor_total:    (r.quantidade || 0) * (r.preco_unitario || 0),
    marca_ferro:    '',
  }));

  // Se cliente tem id, busca foto do ferro dos semoventes cadastrados
  if (cli.id && d.semoventes?.length) {
    d.semoventes.forEach((s, i) => {
      if (lotes[i]) {
        lotes[i].foto_ferro  = s.foto_ferro || null;
        lotes[i].marca_ferro = s.marca_ferro || lotes[i].marca_ferro;
        lotes[i].mesticagem  = s.mesticagem  || lotes[i].mesticagem;
        lotes[i].pelagem     = s.cor         || lotes[i].pelagem;
      }
    });
  }

  let empresaConfig = {};
  try { const { config: ec } = await API.get('/config'); empresaConfig = ec || {}; } catch(e) {}

  const payload = {
    cliente: { nome: cli.nome, cpf: cli.cpf, id: cli.id },
    imovel:  { nome: imovel.nome || '', municipio: imovel.municipio || '' },
    lotes,
    percentual_banco: 70,
    empresa: empresaConfig,
  };

  toast('Gerando laudo de opinião...', 'inf');
  try {
    const resp = await fetch('/api/laudo/gerar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + API.token },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) { const dd = await resp.json(); throw new Error(dd.erro || 'Erro ao gerar'); }
    const blob = await resp.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `Laudo_${cli.nome.replace(/\s+/g,'_')}_${new Date().toISOString().slice(0,10)}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Laudo gerado com sucesso!');
  } catch(e) { toast('Erro: ' + e.message, 'err'); }
}

async function gerarApascentamentoProjeto() {
  const d = window._projetoData || {};
  const cli = d.cliente || {};
  if (!cli.nome && !cli.id) { toast('Busque um produtor primeiro', 'err'); return; }
  const imovel = d.imoveis?.[0] || d.imovel || {};

  // UA padrão por categoria
  const UA_MAP = {
    'vaca':    0.86, 'boi':    1.20, 'bezerro': 0.46, 'bezerra':   0.40,
    'novilho': 0.66, 'novilha':0.60, 'touro':   1.35, 'outro':     1.00,
  };

  const rebanho = coletarRebanho();
  const categorias = rebanho.map(r => {
    const chave = (r.categoria || '').toLowerCase().split(' ')[0];
    const ua_cat  = UA_MAP[chave] || 1.0;
    const total   = parseInt(r.quantidade || 0);
    return {
      nome:           r.categoria,
      existente:      total,
      novos:          0,
      idade:          '',
      total,
      ua_cat,
      ua_total:       parseFloat((total * ua_cat).toFixed(2)),
      preco_unitario: r.preco_unitario,
      valor_total:    total * (r.preco_unitario || 0),
    };
  });

  // Detecta área de pastagem do imóvel se disponível
  const area_pastagem = parseFloat(imovel.area_total || 0) * 0.6; // estima 60% como pastagem

  // ── CORREÇÃO: guarda dados em variável global para evitar quebra de HTML
  // ao passar JSON com caracteres especiais (>, &, aspas) via atributo onclick
  window._apascentamentoPayload = { cli, imovel, categorias };

  // Abre mini-modal para confirmar área de pastagem e UA de referência antes de gerar
  abrirModal('Configurar Apascentamento',
    `<div class="form-grid-2" style="gap:12px">
      <div class="form-group"><label>Área de Pastagem (ha)</label>
        <input id="ap-area" type="number" step="0.01" value="${area_pastagem > 0 ? area_pastagem.toFixed(2) : ''}" placeholder="Ex: 28.28"/></div>
      <div class="form-group"><label>UA Referência (UA/ha)</label>
        <input id="ap-ua" type="number" step="0.1" value="1.5" placeholder="Ex: 1.5"/></div>
      <div class="form-group"><label>% Banco</label>
        <input id="ap-pct" type="number" step="1" value="70" placeholder="70"/></div>
    </div>`,
    `<button class="btn" onclick="fecharModal()">Cancelar</button>
     <button class="btn btn-primary" onclick="_confirmarApascentamento()">
       Gerar PDF
     </button>`
  );
}

async function _confirmarApascentamento() {
  // ── CORREÇÃO: lê dados do store global em vez de receber via argumento inline
  const { cli, imovel, categorias } = window._apascentamentoPayload || {};
  const area_pastagem  = parseFloat(document.getElementById('ap-area')?.value || 0);
  const ua_referencia  = parseFloat(document.getElementById('ap-ua')?.value   || 1.5);
  const percentual_banco = parseFloat(document.getElementById('ap-pct')?.value || 70);
  if (!area_pastagem) { toast('Informe a área de pastagem', 'err'); return; }

  fecharModal();

  let empresaConfig = {};
  try { const { config: ec } = await API.get('/config'); empresaConfig = ec || {}; } catch(e) {}

  const sgp = parseFloat((area_pastagem * ua_referencia).toFixed(2));
  const payload = {
    cliente: { nome: cli.nome, cpf: cli.cpf, id: cli.id },
    imovel:  { nome: imovel.nome || '', municipio: imovel.municipio || '' },
    categorias,
    area_pastagem,
    ua_referencia,
    sgp,
    percentual_banco,
    empresa: empresaConfig,
  };

  toast('Gerando apascentamento...', 'inf');
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
    a.download = `Apascentamento_${cli.nome.replace(/\s+/g,'_')}_${new Date().toISOString().slice(0,10)}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Apascentamento gerado com sucesso!');
  } catch(e) { toast('Erro: ' + e.message, 'err'); }
}

async function removerProjeto(id, nome) {
  if (!confirm(`Remover o projeto de "${nome}"?\n\nEsta ação não pode ser desfeita.`)) return;
  try { await API.del('/projetos/'+id); toast('Projeto removido'); carregarProjetos(); }
  catch(e) { toast('Erro: '+e.message,'err'); }
}

let clientesPag = 1, clientesBusca = '', clientesTotal = 0;

async function iniciarClientes() {
  const el = document.getElementById('section-clientes');
  el.innerHTML = `
    <div class="page-header">
      <h2 class="page-title">Clientes</h2>
      <div style="display:flex;gap:8px">
        <button class="btn btn-csv" onclick="exportarClientesCSV()">${icon('download','sm')} CSV</button>
        <button class="btn btn-primary" onclick="abrirFormCliente()">${icon("plus")} Novo Cliente</button>
      </div>
    </div>
    <div class="card">
      <div class="toolbar">
        <input type="search" placeholder="Buscar por nome, CPF ou e-mail..." oninput="buscarClientes(this.value)" value="${clientesBusca}"/>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Nome</th><th>CPF</th><th>Enquadramento</th><th>Estado Civil</th><th>Telefone</th><th>E-mail</th><th>Imóveis</th><th></th></tr></thead>
          <tbody id="clientes-tbody"><tr><td colspan="8" style="text-align:center;color:var(--text-3);padding:24px">Carregando...</td></tr></tbody>
        </table>
      </div>
      <div class="pagination" id="clientes-paginacao"></div>
    </div>`;
  carregarClientes();
}

const BADGES_ENQUADRAMENTO = {
  'PRONAF': 'badge-green',
  'MÉDIO':  'badge-blue',
  'DEMAIS': 'badge-gray',
};

async function carregarClientes() {
  try {
    const { clientes, paginacao } = await API.get(`/clientes?busca=${encodeURIComponent(clientesBusca)}&pagina=${clientesPag}&limite=15`);
    clientesTotal = paginacao.total;
    const totalPags = Math.ceil(paginacao.total / 15);
    document.getElementById('clientes-tbody').innerHTML = clientes.length ? clientes.map(c => `
      <tr>
        <td><strong>${c.nome}</strong></td>
        <td><code>${c.cpf}</code></td>
        <td><span class="badge ${BADGES_ENQUADRAMENTO[c.enquadramento]||'badge-gray'}">${c.enquadramento||'—'}</span></td>
        <td>${ESTADOS_CIVIS.find(e => e.v === c.estado_civil)?.l || c.estado_civil || '—'}</td>
        <td>${c.telefone || '—'}</td>
        <td>${c.email || '—'}</td>
        <td><span class="badge badge-green">${c.total_imoveis || 0}</span></td>
        <td>
          <button class="btn btn-sm" onclick="abrirFormCliente('${c.id}')">${icon("edit")} Editar</button>
          <button class="btn btn-sm btn-danger" onclick="removerCliente('${c.id}','${c.nome.replace(/'/g,"\\'")}')">${icon("trash")}</button>
        </td>
      </tr>`).join('') : '<tr><td colspan="8" style="text-align:center;color:var(--text-3);padding:24px">Nenhum cliente encontrado.</td></tr>';
    document.getElementById('clientes-paginacao').innerHTML = paginacaoHTML(clientesPag, totalPags);
  } catch (e) { toast('Erro ao carregar clientes', 'err'); }
}

function buscarClientes(v) {
  clientesBusca = v; clientesPag = 1;
  clearTimeout(buscarClientes._t);
  buscarClientes._t = setTimeout(carregarClientes, 350);
}
function paginaAnterior() { if (clientesPag > 1) { clientesPag--; carregarClientes(); } }
function proximaPagina()  { const tp = Math.ceil(clientesTotal/15); if (clientesPag < tp) { clientesPag++; carregarClientes(); } }

async function abrirFormCliente(id) {
  let c = {};
  if (id) {
    try { const d = await API.get(`/clientes/${id}`); c = d.cliente; } catch(e) { toast('Erro ao carregar', 'err'); return; }
  }

  const isCasado = ['casado','uniao_estavel'].includes(c.estado_civil||'');

  const corpo = `
    <div class="form-grid-2">
      <div class="form-section">Dados Pessoais</div>
      <div class="form-group col-span-2"><label>Nome Completo *</label><input id="f-nome" value="${c.nome||''}"/></div>
      <div class="form-group"><label>CPF *</label><input id="f-cpf" value="${c.cpf||''}" placeholder="000.000.000-00" oninput="mascaraCPF(this)"/>
        <small style="color:var(--text-3);font-size:11px">Para alterar o CPF, edite o campo. CPF duplicado não será aceito.</small>
      </div>
      <div class="form-group"><label>RG</label><input id="f-rg" value="${c.rg||''}"/></div>
      <div class="form-group"><label>Estado Civil</label>
        <select id="f-estado_civil" onchange="toggleConjuge(this.value)">
          ${selectOptions(ESTADOS_CIVIS, c.estado_civil)}
        </select>
      </div>
      <div class="form-group"><label>Regime de Casamento</label>
        <select id="f-regime_casamento">${selectOptions(REGIMES, c.regime_casamento)}</select>
      </div>
      <div class="form-group" id="g-nome_conjuge"><label>Nome do Cônjuge</label>
        <input id="f-nome_conjuge" value="${c.nome_conjuge||''}"/>
      </div>
      <div class="form-group" id="g-cpf_conjuge"><label>CPF do Cônjuge</label>
        <input id="f-cpf_conjuge" value="${c.cpf_conjuge||''}" placeholder="000.000.000-00"/>
      </div>
      <div class="form-group"><label>Enquadramento</label>
        <select id="f-enquadramento">
          <option value="PRONAF"  ${(c.enquadramento||'PRONAF')==='PRONAF'?'selected':''}>PRONAF</option>
          <option value="MÉDIO"   ${c.enquadramento==='MÉDIO'?'selected':''}>MÉDIO</option>
          <option value="DEMAIS"  ${c.enquadramento==='DEMAIS'?'selected':''}>DEMAIS</option>
        </select>
      </div>
      <div class="form-group"><label>Inscrição Estadual</label><input id="f-inscricao_estadual" value="${c.inscricao_estadual||''}"/></div>
      <div class="form-group"><label>Telefone</label><input id="f-telefone" value="${c.telefone||''}" placeholder="(00) 00000-0000"/></div>
      <div class="form-group"><label>E-mail</label><input id="f-email" type="email" value="${c.email||''}"/></div>

      <div class="form-section">Endereço</div>
      <div class="form-group col-span-2"><label>Logradouro</label><input id="f-endereco_logradouro" value="${c.endereco_logradouro||''}"/></div>
      <div class="form-group"><label>Número</label><input id="f-endereco_numero" value="${c.endereco_numero||''}"/></div>
      <div class="form-group"><label>Complemento</label><input id="f-endereco_complemento" value="${c.endereco_complemento||''}"/></div>
      <div class="form-group"><label>Bairro</label><input id="f-endereco_bairro" value="${c.endereco_bairro||''}"/></div>
      <div class="form-group"><label>Cidade</label><input id="f-endereco_cidade" value="${c.endereco_cidade||''}"/></div>
      <div class="form-group"><label>UF</label><input id="f-endereco_uf" value="${c.endereco_uf||''}" maxlength="2" style="text-transform:uppercase"/></div>
      <div class="form-group"><label>CEP</label><input id="f-endereco_cep" value="${c.endereco_cep||''}"/></div>

      <div class="form-section">Observações</div>
      <div class="form-group col-span-2"><label>Observações</label>
        <textarea id="f-observacoes" rows="3">${c.observacoes||''}</textarea></div>
    </div>`;

  const rodape = `
    <button class="btn" onclick="fecharModal()">Cancelar</button>
    <button class="btn btn-primary" onclick="salvarCliente('${id||''}')">${icon("save")} Salvar</button>`;

  abrirModal(id ? 'Editar Cliente' : 'Novo Cliente', corpo, rodape);
  if (!isCasado) toggleConjuge(c.estado_civil||'');
}

function toggleConjuge(v) {
  const show = ['casado','uniao_estavel'].includes(v);
  ['g-nome_conjuge','g-cpf_conjuge'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = show ? '' : 'none';
  });
}

async function salvarCliente(id) {
  const campos = ['nome','cpf','rg','estado_civil','regime_casamento','nome_conjuge','cpf_conjuge','enquadramento',
    'inscricao_estadual','endereco_logradouro','endereco_numero','endereco_complemento','endereco_bairro',
    'endereco_cidade','endereco_uf','endereco_cep','telefone','email','observacoes'];
  const body = {};
  campos.forEach(c => { const v = formValue('f-'+c); body[c] = v || ''; });
  if (!body.nome) { toast('Nome é obrigatório', 'err'); return; }
  if (!id && !body.cpf) { toast('CPF é obrigatório', 'err'); return; }
  try {
    if (id) await API.put(`/clientes/${id}`, body);
    else    await API.post('/clientes', body);
    fecharModal();
    toast(id ? 'Cliente atualizado!' : 'Cliente cadastrado!');
    carregarClientes();
  } catch (e) { toast(e.message, 'err'); }
}

async function removerCliente(id, nome) {
  if (!confirm(`Remover "${nome}"?`)) return;
  try { await API.del(`/clientes/${id}`); toast('Cliente removido'); carregarClientes(); }
  catch (e) { toast(e.message, 'err'); }
}

async function exportarClientesCSV() {
  try {
    const { clientes } = await API.get('/clientes?limite=9999');
    const cols = ['nome','cpf','enquadramento','estado_civil','telefone','email','endereco_cidade','endereco_uf'];
    const heads = ['Nome','CPF','Enquadramento','Estado Civil','Telefone','E-mail','Cidade','UF'];
    const linhas = [heads, ...clientes.map(c => cols.map(k => c[k]||''))];
    const csv = linhas.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(';')).join('\n');
    const blob = new Blob(['\uFEFF'+csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `clientes_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    toast(`${clientes.length} clientes exportados!`);
  } catch(e) { toast('Erro ao exportar: '+e.message, 'err'); }
}

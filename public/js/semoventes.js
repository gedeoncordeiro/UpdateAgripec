let semPag = 1, semCategoria = '', semTotal = 0;
let imoveisCache = [], clientesSemCache = [];

async function iniciarSemoventes() {
  const el = document.getElementById('section-semoventes');
  el.innerHTML = `
    <div class="page-header">
      <h2 class="page-title">Semoventes</h2>
      <div style="display:flex;gap:8px">
        <button class="btn btn-csv" onclick="exportarSemoventesCSV()">${icon('download','sm')} CSV</button>
        <button class="btn" style="background:var(--green,#2d6a4f);color:#fff;border:none" onclick="abrirModalLaudoSemoventes()">Gerar Laudo de Opiniao</button>
        <button class="btn btn-primary" onclick="abrirFormSemovente()">${icon("plus")} Novo Lote</button>
      </div>
    </div>
    <div class="card">
      <div class="toolbar">
        <select onchange="filtrarCategoria(this.value)">
          <option value="">Todas as categorias</option>
          ${CATEGORIAS.map(c => `<option value="${c.v}" ${c.v===semCategoria?'selected':''}>${c.l}</option>`).join('')}
        </select>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th>Proprietário</th><th>Imóvel</th>
            <th>Categoria</th><th>Raça/Cor</th><th>Mestiçagem</th><th>Idade</th>
            <th>Qtd</th><th>Preço Unit.</th><th>Total</th><th>Marca</th><th></th>
          </tr></thead>
          <tbody id="sem-tbody"><tr><td colspan="11" style="text-align:center;padding:24px;color:var(--text-3)">Carregando...</td></tr></tbody>
        </table>
      </div>
      <div class="pagination" id="sem-paginacao"></div>
    </div>`;

  try { const d = await API.get('/imoveis?limite=200'); imoveisCache = d.imoveis; } catch(e) {}
  try { const d = await API.get('/clientes?limite=200'); clientesSemCache = d.clientes; } catch(e) {}
  carregarSemoventes();
}

async function carregarSemoventes() {
  try {
    const { semoventes, paginacao } = await API.get(`/semoventes?categoria=${semCategoria}&pagina=${semPag}&limite=15`);
    semTotal = paginacao.total;
    const totalPags = Math.ceil(paginacao.total / 15);
    document.getElementById('sem-tbody').innerHTML = semoventes.length ? semoventes.map(s => `
      <tr>
        <td>${s.proprietario_nome||'—'}</td>
        <td>${s.imovel_nome||'—'}</td>
        <td>${badgeCategoria(s.categoria)}</td>
        <td>${s.raca||'—'}${s.cor ? ' / '+s.cor : ''}</td>
        <td>${s.mesticagem||'—'}</td>
        <td>${s.idade_meses ? s.idade_meses+' m' : '—'}</td>
        <td><strong>${fmt.num(s.quantidade)}</strong></td>
        <td>${fmt.moeda(s.preco_unitario)}</td>
        <td><strong style="color:var(--green)">${fmt.moeda(s.valor_total)}</strong></td>
        <td><code>${s.marca_ferro||'—'}</code></td>
        <td>
          <button class="btn btn-sm" onclick="abrirFormSemovente('${s.id}')">${icon("edit")}</button>
          <button class="btn btn-sm btn-danger" onclick="removerSemovente('${s.id}')">${icon("trash")}</button>
        </td>
      </tr>`).join('') : '<tr><td colspan="11" style="text-align:center;padding:24px;color:var(--text-3)">Nenhum lote encontrado.</td></tr>';
    document.getElementById('sem-paginacao').innerHTML = paginacaoHTML(semPag, totalPags, 'semPaginaAnterior', 'semProximaPagina');
  } catch(e) { toast('Erro ao carregar semoventes', 'err'); }
}

function semPaginaAnterior() { if (semPag > 1) { semPag--; carregarSemoventes(); } }
function semProximaPagina()  { const tp = Math.ceil(semTotal / 15); if (semPag < tp) { semPag++; carregarSemoventes(); } }

function filtrarCategoria(v) { semCategoria = v; semPag = 1; carregarSemoventes(); }

async function abrirFormSemovente(id) {
  let s = {};
  if (id) {
    const rows = (await API.get(`/semoventes?pagina=1&limite=500`)).semoventes;
    s = rows.find(r => r.id === id) || {};
  }

  const optsImoveis = `<option value="">Selecione</option>` +
    imoveisCache.map(im => `<option value="${im.id}" ${im.id===s.imovel_id?'selected':''}>${im.nome} – ${im.municipio||''}</option>`).join('');
  const optsClientes = `<option value="">Selecione</option>` +
    clientesSemCache.map(c => `<option value="${c.id}" ${c.id===s.proprietario_id?'selected':''}>${c.nome}</option>`).join('');

  const corpo = `
    <div class="form-grid-2">
      <div class="form-section">Proprietário e Localização</div>
      <div class="form-group col-span-2">
        <label>Buscar Proprietário pelo CPF</label>
        <div style="display:flex;gap:8px;align-items:center">
          <input id="f-cpf-busca-sem" placeholder="000.000.000-00" style="flex:1" oninput="this.value=this.value.replace(/\D/g,'').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})\.(\d{3})(\d)/,'$1.$2.$3').replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/,'$1.$2.$3-$4').slice(0,14)" onkeydown="if(event.key==='Enter')buscarProprietarioSemovente()"/>
          <button class="btn btn-sm btn-primary" onclick="buscarProprietarioSemovente()" type="button">Buscar</button>
        </div>
        <div id="proprietario-sem-info" style="margin-top:6px;display:none;padding:8px 12px;background:var(--bg-card);border:1px solid var(--border);border-radius:8px;font-size:13px"></div>
      </div>
      <div class="form-group col-span-2"><label>Proprietário</label>
        <select id="f-proprietario_id" onchange="filtrarImoveisPorProprietario(this.value)">${optsClientes}</select></div>
      <div class="form-group col-span-2"><label>Imóvel / Localização</label>
        <select id="f-imovel_id">${optsImoveis}</select></div>

      <div class="form-section">Dados dos Animais</div>
      <div class="form-group"><label>Categoria *</label>
        <select id="f-categoria">${selectOptions(CATEGORIAS, s.categoria||'vaca')}</select></div>
      <div class="form-group"><label>Raça</label><input id="f-raca" value="${s.raca||'Nelore'}" placeholder="Ex: Nelore, Angus"/></div>
      <div class="form-group"><label>Cor</label><input id="f-cor" value="${s.cor||'Branca'}"/></div>
      <div class="form-group"><label>Mestiçagem</label>
        <select id="f-mesticagem">${selectOptions(MESTICAGENS, s.mesticagem||'¾ Sangue')}</select></div>
      <div class="form-group"><label>Idade (meses)</label>
        <input id="f-idade_meses" type="number" value="${s.idade_meses||''}"/></div>
      <div class="form-group"><label>Marca / Ferro</label>
        <input id="f-marca_ferro" value="${s.marca_ferro||''}"/></div>
      <div class="form-group col-span-2">
        <label>Forma e Local de Marcação</label>
        <input id="f-forma_local" value="${s.forma_local||'À ferro e fogo no quarto posterior direito (QPD)'}" readonly style="background:var(--bg-input);color:var(--text-2);cursor:not-allowed"/>
        <small style="color:var(--text-3);font-size:11px">Padrão fixo: À ferro e fogo no quarto posterior direito (QPD)</small>
      </div>
      <div class="form-group"><label>Foto do Ferro <span style="font-size:11px;color:var(--text-3);font-weight:400">(opcional)</span></label>
        <div style="display:flex;flex-direction:column;gap:6px">
          <label for="f-foto_ferro" style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;padding:7px 12px;border:1.5px dashed var(--border);border-radius:8px;font-size:12px;color:var(--text-2);background:var(--bg-input)">
            ${icon('image','sm')} Selecionar imagem do ferro
          </label>
          <input type="file" id="f-foto_ferro" accept="image/*" style="display:none" onchange="previewFotoFerro(this)"/>
          <div id="preview-foto-ferro" style="${s.foto_ferro ? '' : 'display:none'}">
            ${s.foto_ferro ? `<img src="${s.foto_ferro}" style="max-height:80px;max-width:180px;border-radius:6px;border:1px solid var(--border);object-fit:contain"/>
            <button type="button" onclick="limparFotoFerro()" style="display:block;margin-top:4px;font-size:11px;color:var(--danger,#e53e3e);background:none;border:none;cursor:pointer;padding:0">${icon('trash','sm')} Remover foto</button>` : ''}
          </div>
        </div>
      </div>

      <div class="form-section">Quantidade e Valor</div>
      <div class="form-group"><label>Quantidade *</label>
        <input id="f-quantidade" type="number" value="${s.quantidade||''}" oninput="calcTotal()"/></div>
      <div class="form-group"><label>Preço Unitário (R$)</label>
        <input id="f-preco_unitario" type="number" step="0.01" value="${s.preco_unitario||''}" oninput="calcTotal()"/></div>
      <div class="form-group col-span-2" id="total-box" style="display:${s.quantidade&&s.preco_unitario?'block':'none'}">
        <div class="valor-box">
          <div class="label">Valor Total do Lote</div>
          <div class="valor" id="total-val">${fmt.moeda((s.quantidade||0)*(s.preco_unitario||0))}</div>
        </div>
      </div>
      <div class="form-group col-span-2"><label>Observações</label>
        <textarea id="f-observacoes" rows="2">${s.observacoes||''}</textarea></div>
    </div>`;

  abrirModal(id ? 'Editar Lote' : 'Novo Lote de Semoventes', corpo,
    `<button class="btn" onclick="fecharModal()">Cancelar</button>
     <button class="btn btn-primary" onclick="salvarSemovente('${id||''}')">${icon("save")} Salvar</button>`);

  // Se editando e já tem proprietário, mostra info
  if (s.proprietario_id) {
    const cli = clientesSemCache.find(c => c.id === s.proprietario_id);
    if (cli) {
      const infoEl = document.getElementById('proprietario-sem-info');
      if (infoEl) { infoEl.style.display = 'block'; infoEl.innerHTML = `<strong>${cli.nome}</strong>`; }
    }
  }
}

function calcTotal() {
  const q = parseFloat(document.getElementById('f-quantidade')?.value || 0);
  const p = parseFloat(document.getElementById('f-preco_unitario')?.value || 0);
  const box = document.getElementById('total-box');
  const val = document.getElementById('total-val');
  if (box && val) { box.style.display = q && p ? 'block' : 'none'; val.textContent = fmt.moeda(q * p); }
}

async function salvarSemovente(id) {
  const campos = ['categoria','raca','cor','mesticagem','idade_meses','quantidade','preco_unitario','marca_ferro','forma_local','imovel_id','proprietario_id','observacoes'];
  const body = {};
  campos.forEach(c => { body[c] = formValue('f-'+c) || ''; });
  // Forma/local padrão fixo se não preenchido
  if (!body.forma_local) body.forma_local = 'À ferro e fogo no quarto posterior direito (QPD)';
  // Captura foto do ferro (base64 guardada no data attribute do preview)
  const previewDiv = document.getElementById('preview-foto-ferro');
  const img = previewDiv?.querySelector('img');
  if (img?.src && img.src.startsWith('data:')) body.foto_ferro = img.src;
  // Se o usuário removeu a foto, limpa o campo
  if (previewDiv && !previewDiv.querySelector('img')) body.foto_ferro = '';
  if (!body.categoria || !body.quantidade) { toast('Categoria e quantidade obrigatórios', 'err'); return; }
  try {
    if (id) await API.put(`/semoventes/${id}`, body);
    else    await API.post('/semoventes', body);
    fecharModal(); toast(id ? 'Lote atualizado!' : 'Lote cadastrado!'); carregarSemoventes();
  } catch(e) { toast(e.message, 'err'); }
}

async function removerSemovente(id) {
  if (!confirm('Remover este lote?')) return;
  try { await API.del(`/semoventes/${id}`); toast('Lote removido'); carregarSemoventes(); }
  catch(e) { toast(e.message, 'err'); }
}

async function exportarSemoventesCSV() {
  try {
    const { semoventes } = await API.get('/semoventes?limite=9999');
    const cols  = ['proprietario_nome','imovel_nome','categoria','raca','cor','mesticagem','idade_meses','quantidade','preco_unitario','valor_total','marca_ferro'];
    const heads = ['Proprietário','Imóvel','Categoria','Raça','Cor','Mestiçagem','Idade(m)','Qtd','Preço Unit.','Total','Marca'];
    const linhas = [heads, ...semoventes.map(s => cols.map(k => s[k]||''))];
    const csv = linhas.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(';')).join('\n');
    const blob = new Blob(['\uFEFF'+csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `semoventes_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    toast(`${semoventes.length} lotes exportados!`);
  } catch(e) { toast('Erro ao exportar: '+e.message, 'err'); }
}

// ── PREVIEW DA FOTO DO FERRO ──────────────────────────────────────────────
function previewFotoFerro(input) {
  if (!input.files || !input.files[0]) return;
  const file = input.files[0];
  if (!file.type.startsWith('image/')) { toast('Selecione um arquivo de imagem', 'err'); return; }
  if (file.size > 3 * 1024 * 1024) { toast('Imagem muito grande (máx 3 MB)', 'err'); return; }
  const reader = new FileReader();
  reader.onload = e => {
    const div = document.getElementById('preview-foto-ferro');
    if (!div) return;
    div.style.display = 'block';
    div.innerHTML = `
      <img src="${e.target.result}" style="max-height:80px;max-width:180px;border-radius:6px;border:1px solid var(--border);object-fit:contain"/>
      <button type="button" onclick="limparFotoFerro()" style="display:block;margin-top:4px;font-size:11px;color:var(--danger,#e53e3e);background:none;border:none;cursor:pointer;padding:0">
        Remover foto
      </button>`;
  };
  reader.readAsDataURL(file);
}

function limparFotoFerro() {
  const div = document.getElementById('preview-foto-ferro');
  const inp = document.getElementById('f-foto_ferro');
  if (div) { div.style.display = 'none'; div.innerHTML = ''; }
  if (inp) inp.value = '';
}

// ── GERAR LAUDO DE OPINIÃO A PARTIR DA TELA DE SEMOVENTES ─────────────────
function abrirModalLaudoSemoventes() {
  const optsClientes = `<option value="">Selecione o cliente</option>` +
    clientesSemCache.map(c => `<option value="${c.id}" data-nome="${c.nome}" data-cpf="${c.cpf||''}">${c.nome}${c.cpf ? ' – '+c.cpf : ''}</option>`).join('');
  const optsImoveis = `<option value="">Selecione o imóvel (opcional)</option>` +
    imoveisCache.map(im => `<option value="${im.id}" data-nome="${im.nome}" data-municipio="${im.municipio||''}">${im.nome} – ${im.municipio||''}</option>`).join('');

  abrirModal('Gerar Laudo de Opinião de Semoventes',
    `<div class="form-grid-2" style="gap:14px">
      <div class="form-group col-span-2">
        <label>Buscar Produtor pelo CPF</label>
        <div style="display:flex;gap:8px;align-items:center">
          <input id="laudo-cpf-busca" placeholder="000.000.000-00" style="flex:1" oninput="this.value=this.value.replace(/\D/g,'').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})\.(\d{3})(\d)/,'$1.$2.$3').replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/,'$1.$2.$3-$4').slice(0,14)" onkeydown="if(event.key==='Enter')buscarProprietarioLaudo()"/>
          <button class="btn btn-sm btn-primary" onclick="buscarProprietarioLaudo()" type="button">Buscar</button>
        </div>
        <div id="laudo-proprietario-info" style="margin-top:6px;display:none;padding:8px 12px;background:var(--bg-card);border:1px solid var(--border);border-radius:8px;font-size:13px"></div>
      </div>
      <div class="form-group col-span-2">
        <label>Cliente *</label>
        <select id="laudo-cliente" onchange="laudoOnClienteChange(this)">${optsClientes}</select>
      </div>
      <div class="form-group col-span-2">
        <label>Imóvel / Propriedade</label>
        <select id="laudo-imovel">${optsImoveis}</select>
      </div>
      <div class="form-group">
        <label>Percentual para o Banco (%)</label>
        <input id="laudo-pct" type="number" value="70" step="1"/>
      </div>
    </div>
    <p style="font-size:12px;color:var(--text-3);margin-top:8px">
      Os semoventes cadastrados para o cliente selecionado serão incluídos automaticamente no laudo.
    </p>`,
    `<button class="btn" onclick="fecharModal()">Cancelar</button>
     <button class="btn btn-primary" onclick="gerarLaudoDaTelaDetalhes()">Gerar Laudo PDF</button>`
  );
}

async function gerarLaudoDaTelaDetalhes() {
  const cliSel  = document.getElementById('laudo-cliente');
  const imSel   = document.getElementById('laudo-imovel');
  const pct     = parseFloat(document.getElementById('laudo-pct')?.value || 70);

  if (!cliSel?.value) { toast('Selecione um cliente', 'err'); return; }

  const cliOpt = cliSel.options[cliSel.selectedIndex];
  const imOpt  = imSel?.options[imSel?.selectedIndex];

  // Busca dados completos do imóvel se selecionado
  let imovelData = { id: '', nome: '', municipio: '' };
  if (imSel?.value) {
    try {
      const { imovel } = await API.get(`/imoveis/${imSel.value}`);
      imovelData = {
        id:        imovel.id        || '',
        nome:      imovel.nome      || '',
        municipio: imovel.municipio || '',
        area_total: imovel.area_total || '',
        matricula: imovel.matricula || '',
        car:       imovel.car       || '',
      };
    } catch(e) {
      imovelData = {
        id:        imSel.value,
        nome:      imOpt?.dataset?.nome      || '',
        municipio: imOpt?.dataset?.municipio || '',
      };
    }
  }

  let empresaConfig = {};
  try { const { config: ec } = await API.get('/config'); empresaConfig = ec || {}; } catch(e) {}

  const payload = {
    cliente: {
      id:   cliSel.value,
      nome: cliOpt?.dataset?.nome || cliOpt?.text?.split(' –')[0] || '',
      cpf:  cliOpt?.dataset?.cpf  || '',
    },
    imovel: imovelData,
    percentual_banco: pct,
    empresa: empresaConfig,
    lotes: [],
  };

  fecharModal();
  toast('Gerando laudo...', 'inf');
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
    a.download = `Laudo_${(payload.cliente.nome||'cliente').replace(/\s+/g,'_')}_${new Date().toISOString().slice(0,10)}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Laudo gerado com sucesso!');
  } catch(e) { toast('Erro: ' + e.message, 'err'); }
}

// ── BUSCA DE PROPRIETÁRIO POR CPF ──────────────────────────────────────────
async function buscarProprietarioSemovente() {
  const cpfInput = document.getElementById('f-cpf-busca-sem');
  const cpf = cpfInput?.value?.replace(/\D/g,'') || '';
  if (cpf.length < 11) { toast('Informe um CPF válido (11 dígitos)', 'err'); return; }
  const infoEl = document.getElementById('proprietario-sem-info');
  if (infoEl) { infoEl.style.display = 'block'; infoEl.innerHTML = 'Buscando...'; }
  try {
    const { cliente, imoveis } = await API.get(`/clientes/cpf/${encodeURIComponent(cpf)}`);
    // Adiciona ao cache se não existir
    if (!clientesSemCache.find(c => c.id === cliente.id)) clientesSemCache.push(cliente);
    // Seleciona no select de proprietário
    const sel = document.getElementById('f-proprietario_id');
    if (sel) {
      sel.innerHTML = `<option value="">Selecione</option>` +
        clientesSemCache.map(c => `<option value="${c.id}" ${c.id===cliente.id?'selected':''}>${c.nome}</option>`).join('');
    }
    // Filtra imóveis do proprietário
    if (imoveis && imoveis.length > 0) {
      const selIm = document.getElementById('f-imovel_id');
      if (selIm) {
        selIm.innerHTML = `<option value="">Selecione</option>` +
          imoveis.map(im => `<option value="${im.id}">${im.nome} – ${im.municipio||''}</option>`).join('');
      }
    }
    if (infoEl) {
      infoEl.innerHTML = `<span style="color:var(--green)">✓</span> <strong>${cliente.nome}</strong> — CPF: ${cliente.cpf||'—'}${imoveis?.length ? ` · ${imoveis.length} imóvel(is)` : ''}`;
    }
  } catch(e) {
    if (infoEl) { infoEl.innerHTML = `<span style="color:var(--danger,#e53e3e)">✗ ${e.message === 'Cliente não encontrado' ? 'Nenhum produtor encontrado com este CPF.' : e.message}</span>`; }
  }
}

async function filtrarImoveisPorProprietario(proprietarioId) {
  if (!proprietarioId) return;
  const selIm = document.getElementById('f-imovel_id');
  if (!selIm) return;
  const imoveisFiltrados = imoveisCache.filter(im => im.proprietario_id === proprietarioId);
  if (imoveisFiltrados.length > 0) {
    selIm.innerHTML = `<option value="">Selecione</option>` +
      imoveisFiltrados.map(im => `<option value="${im.id}">${im.nome} – ${im.municipio||''}</option>`).join('');
  } else {
    // Se não tem no cache, busca na API
    try {
      const { imoveis } = await API.get(`/imoveis?limite=200`);
      const filtrados = imoveis.filter(im => im.proprietario_id === proprietarioId);
      selIm.innerHTML = `<option value="">Selecione</option>` +
        (filtrados.length ? filtrados : imoveisCache).map(im => `<option value="${im.id}">${im.nome} – ${im.municipio||''}</option>`).join('');
    } catch(e) {}
  }
}

async function buscarProprietarioLaudo() {
  const cpfInput = document.getElementById('laudo-cpf-busca');
  const cpf = cpfInput?.value?.replace(/\D/g,'') || '';
  if (cpf.length < 11) { toast('Informe um CPF válido (11 dígitos)', 'err'); return; }
  const infoEl = document.getElementById('laudo-proprietario-info');
  if (infoEl) { infoEl.style.display = 'block'; infoEl.innerHTML = 'Buscando...'; }
  try {
    const { cliente, imoveis } = await API.get(`/clientes/cpf/${encodeURIComponent(cpf)}`);
    // Adiciona ao cache se não existir
    if (!clientesSemCache.find(c => c.id === cliente.id)) clientesSemCache.push(cliente);
    // Seleciona no select de cliente
    const selCli = document.getElementById('laudo-cliente');
    if (selCli) {
      // Verifica se opção já existe, senão adiciona
      let found = false;
      for (const opt of selCli.options) {
        if (opt.value === cliente.id) { opt.selected = true; found = true; break; }
      }
      if (!found) {
        const opt = document.createElement('option');
        opt.value = cliente.id;
        opt.dataset.nome = cliente.nome;
        opt.dataset.cpf  = cliente.cpf || '';
        opt.textContent  = `${cliente.nome}${cliente.cpf ? ' – '+cliente.cpf : ''}`;
        opt.selected = true;
        selCli.appendChild(opt);
      }
    }
    // Filtra imóveis do produtor no select de imóvel
    if (imoveis && imoveis.length > 0) {
      const selIm = document.getElementById('laudo-imovel');
      if (selIm) {
        selIm.innerHTML = `<option value="">Selecione o imóvel (opcional)</option>` +
          imoveis.map(im => `<option value="${im.id}" data-nome="${im.nome}" data-municipio="${im.municipio||''}">${im.nome} – ${im.municipio||''}</option>`).join('');
      }
    }
    if (infoEl) {
      infoEl.innerHTML = `<span style="color:var(--green)">✓</span> <strong>${cliente.nome}</strong> — CPF: ${cliente.cpf||'—'}${imoveis?.length ? ` · ${imoveis.length} imóvel(is) encontrado(s)` : ''}`;
    }
  } catch(e) {
    if (infoEl) { infoEl.innerHTML = `<span style="color:var(--danger,#e53e3e)">✗ ${e.message === 'Cliente não encontrado' ? 'Nenhum produtor encontrado com este CPF.' : e.message}</span>`; }
  }
}

function laudoOnClienteChange(sel) {
  const clienteId = sel.value;
  if (!clienteId) return;
  const selIm = document.getElementById('laudo-imovel');
  if (!selIm) return;
  const imoveisFiltrados = imoveisCache.filter(im => im.proprietario_id === clienteId);
  if (imoveisFiltrados.length > 0) {
    selIm.innerHTML = `<option value="">Selecione o imóvel (opcional)</option>` +
      imoveisFiltrados.map(im => `<option value="${im.id}" data-nome="${im.nome}" data-municipio="${im.municipio||''}">${im.nome} – ${im.municipio||''}</option>`).join('');
  }
}

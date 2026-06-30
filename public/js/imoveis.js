let imoveisPag = 1, imoveisBusca = '', imoveisSituacao = '', imoveisTotal = 0;
let clientesCache = [];

async function iniciarImoveis() {
  const el = document.getElementById('section-imoveis');
  el.innerHTML = `
    <div class="page-header">
      <h2 class="page-title">Imóveis</h2>
      <div style="display:flex;gap:8px">
        <button class="btn btn-csv" onclick="exportarImoveisCSV()">${icon('download','sm')} CSV</button>
        <button class="btn btn-primary" onclick="abrirFormImovel()">${icon("plus")} Novo Imóvel</button>
      </div>
    </div>
    <div class="card">
      <div class="toolbar">
        <input type="search" placeholder="Buscar por nome ou município..." oninput="buscarImoveis(this.value)" value="${imoveisBusca}"/>
        <select onchange="filtrarSituacao(this.value)">
          <option value="">Todas as situações</option>
          ${SITUACOES.map(s => `<option value="${s.v}" ${s.v===imoveisSituacao?'selected':''}>${s.l}</option>`).join('')}
        </select>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Imóvel</th><th>Área Total</th><th>Município/UF</th><th>Situação</th><th>Matrícula</th><th>CIB/NIRF</th><th>Proprietário</th><th></th></tr></thead>
          <tbody id="imoveis-tbody"><tr><td colspan="8" style="text-align:center;padding:24px;color:var(--text-3)">Carregando...</td></tr></tbody>
        </table>
      </div>
      <div class="pagination" id="imoveis-paginacao"></div>
    </div>`;

  clientesCache = [];
  try { const d = await API.get('/clientes?limite=200'); clientesCache = d.clientes; } catch(e) {}
  carregarImoveis();
}

async function carregarImoveis() {
  try {
    const { imoveis, paginacao } = await API.get(`/imoveis?busca=${encodeURIComponent(imoveisBusca)}&situacao=${imoveisSituacao}&pagina=${imoveisPag}&limite=15`);
    imoveisTotal = paginacao.total;
    const totalPags = Math.ceil(paginacao.total / 15);
    document.getElementById('imoveis-tbody').innerHTML = imoveis.length ? imoveis.map(im => `
      <tr>
        <td><strong>${im.nome}</strong></td>
        <td>${fmt.area(im.area_total)}</td>
        <td>${im.municipio||'—'}${im.uf ? ' – '+im.uf : ''}</td>
        <td>${badgeSituacao(im.situacao)}</td>
        <td>${im.matricula||'—'}</td>
        <td>${im.cib_nirf||'—'}</td>
        <td>${im.proprietario_nome||'—'}</td>
        <td>
          <button class="btn btn-sm" onclick="abrirFormImovel('${im.id}')">${icon("edit")} Editar</button>
          <button class="btn btn-sm btn-pdf" onclick="abrirDocumentos('${im.id}','${im.nome.replace(/'/g,"\\'")}')"><span class="icon icon-xs">${ICONS.file}</span> Docs</button>
          <button class="btn btn-sm btn-danger" onclick="removerImovel('${im.id}','${im.nome.replace(/'/g,"\\'")}')">${icon("trash")}</button>
        </td>
      </tr>`).join('') : '<tr><td colspan="8" style="text-align:center;padding:24px;color:var(--text-3)">Nenhum imóvel encontrado.</td></tr>';
    document.getElementById('imoveis-paginacao').innerHTML = paginacaoHTML(imoveisPag, totalPags, 'imoveisPaginaAnterior', 'imoveisProximaPagina');
  } catch (e) { toast('Erro ao carregar imóveis', 'err'); }
}

function imoveisPaginaAnterior() { if (imoveisPag > 1) { imoveisPag--; carregarImoveis(); } }
function imoveisProximaPagina()  { const tp = Math.ceil(imoveisTotal / 15); if (imoveisPag < tp) { imoveisPag++; carregarImoveis(); } }

function buscarImoveis(v) { imoveisBusca = v; imoveisPag = 1; clearTimeout(buscarImoveis._t); buscarImoveis._t = setTimeout(carregarImoveis, 350); }
function filtrarSituacao(v) { imoveisSituacao = v; imoveisPag = 1; carregarImoveis(); }

async function abrirFormImovel(id) {
  let im = {};
  if (id) { try { const d = await API.get(`/imoveis/${id}`); im = d.imovel; } catch(e) { toast('Erro', 'err'); return; } }
  const optsClientes = `<option value="">Nenhum</option>` + clientesCache.map(c => `<option value="${c.id}" ${c.id===im.proprietario_id?'selected':''}>${c.nome} – ${c.cpf}</option>`).join('');
  const ESTADOS_CONSERVACAO = ['Ótimo','Bom','Regular','Ruim','Péssimo'];
  const isSituacaoRegistrada = (im.situacao || 'registrada') === 'registrada';

  const corpo = `
    <div style="display:flex;gap:8px;margin-bottom:16px;border-bottom:1px solid var(--border);padding-bottom:12px">
      <button class="btn btn-sm" id="tab-dados-btn" onclick="switchTabImovel('dados')" style="background:var(--green);color:#fff">${icon('relatorios','xs')} Dados</button>
      ${id ? `<button class="btn btn-sm" id="tab-docs-btn" onclick="switchTabImovel('docs')">${icon('file','xs')} Documentos</button>` : ''}
    </div>

    <div id="tab-dados">
    <div class="form-grid-2">
      <div class="form-section">Proprietário</div>
      <div class="form-group col-span-2">
        <label>Buscar Proprietário pelo CPF</label>
        <div style="display:flex;gap:8px;align-items:center">
          <input id="f-cpf-busca-imovel" placeholder="000.000.000-00" style="flex:1" oninput="this.value=this.value.replace(/\D/g,'').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})\.(\d{3})(\d)/,'$1.$2.$3').replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/,'$1.$2.$3-$4').slice(0,14)" onkeydown="if(event.key==='Enter')buscarProprietarioImovel()"/>
          <button class="btn btn-sm btn-primary" onclick="buscarProprietarioImovel()" type="button">Buscar</button>
        </div>
        <div id="proprietario-imovel-info" style="margin-top:6px;display:none;padding:8px 12px;background:var(--bg-card);border:1px solid var(--border);border-radius:8px;font-size:13px"></div>
      </div>
      <div class="form-group col-span-2"><label>Proprietário</label>
        <select id="f-proprietario_id">${optsClientes}</select></div>

      <div class="form-section">Identificação</div>
      <div class="form-group col-span-2"><label>Nome do Imóvel *</label><input id="f-nome" value="${im.nome||''}"/></div>
      <div class="form-group"><label>Área Total (ha)</label>
        <input id="f-area_total" type="number" step="0.01" value="${im.area_total||''}" oninput="calcAreaRemanescente()"/>
      </div>
      <div class="form-group"><label>Situação</label>
        <select id="f-situacao" onchange="toggleCertidoesInfo()">${selectOptions(SITUACOES, im.situacao||'registrada')}</select></div>
      <div class="form-group col-span-2"><label>Logradouro / Localização</label><input id="f-logradouro" value="${im.logradouro||''}"/></div>
      <div class="form-group"><label>Município</label><input id="f-municipio" value="${im.municipio||''}"/></div>
      <div class="form-group"><label>UF</label><input id="f-uf" value="${im.uf||''}" maxlength="2" style="text-transform:uppercase"/></div>
      <div class="form-group"><label>Matrícula</label><input id="f-matricula" value="${im.matricula||''}"/></div>
      <div class="form-group"><label>CRI</label><input id="f-cri" value="${im.cri||''}"/></div>
      <div class="form-group"><label>Data de Registro</label><input id="f-data_registro" type="date" value="${im.data_registro?.split('T')[0]||''}"/></div>
      <div class="form-group"><label>Tipo de Documento</label>
        <select id="f-tipo_documento">${selectOptions(TIPOS_DOC, im.tipo_documento)}</select></div>

      <div class="form-section">Identificação Fundiária</div>
      <div class="form-group"><label>CIB / NIRF</label><input id="f-cib_nirf" value="${im.cib_nirf||''}" placeholder="Código CIB ou NIRF"/></div>
      <div class="form-group"><label>CCIR</label><input id="f-ccir" value="${im.ccir||''}" placeholder="Certificado de Cadastro"/></div>
      <div class="form-group col-span-2"><label>SIGEF</label><input id="f-sigef" value="${im.sigef||''}" placeholder="Número do processo SIGEF"/></div>

      <div class="form-section">Coordenadas Geográficas</div>
      <div class="form-group">
        <label>Latitude <span style="font-size:11px;color:var(--text-3)">(formato decimal ou DMS)</span></label>
        <input id="f-latitude" value="${im.latitude||''}" placeholder="Ex: -3.456789 ou 3°27'24.44&quot;S" oninput="atualizarPreviewCoordenada('lat')"/>
        ${im.latitude ? `<div style="font-size:12px;color:var(--text-2);margin-top:4px">📍 Formato CAR: ${fmt.coordenada(im.latitude, 'lat')}</div>` : ''}
      </div>
      <div class="form-group">
        <label>Longitude <span style="font-size:11px;color:var(--text-3)">(formato decimal ou DMS)</span></label>
        <input id="f-longitude" value="${im.longitude||''}" placeholder="Ex: -44.876543 ou 44°52'38.35&quot;O" oninput="atualizarPreviewCoordenada('lng')"/>
        ${im.longitude ? `<div style="font-size:12px;color:var(--text-2);margin-top:4px">📍 Formato CAR: ${fmt.coordenada(im.longitude, 'lng')}</div>` : ''}
      </div>

      <div class="form-section">CAR e Divisão de Área</div>
      <div class="form-group col-span-2"><label>Código CAR</label>
        <input id="f-car" value="${im.car||''}" placeholder="MA-XXXXXXXXXXXXXXXXXXXXXXXXXX"/></div>
      <div class="form-group">
        <label>Área Consolidada (ha)</label>
        <input id="f-area_consolidada" type="number" step="0.01" value="${im.area_consolidada||''}" oninput="calcAreaRemanescente()"/>
      </div>
      <div class="form-group">
        <label>Remanescente de Vegetação Nativa (ha)</label>
        <input id="f-area_vegetacao_nativa" type="number" step="0.01" value="${im.area_vegetacao_nativa||''}" oninput="calcAreaRemanescente()"/>
      </div>
      <div class="form-group">
        <label>Reserva Legal / APP (ha)</label>
        <input id="f-area_reserva_legal" type="number" step="0.01" value="${im.area_reserva_legal||''}" oninput="calcAreaRemanescente()"/>
      </div>
      <div class="form-group">
        <label>Servidão Administrativa (ha)</label>
        <input id="f-area_servidao" type="number" step="0.01" value="${im.area_servidao||''}" oninput="calcAreaRemanescente()"/>
      </div>
      <div class="form-group col-span-2" id="area-check-box" style="display:none">
        <div id="area-check" class="alert"></div>
      </div>

      <div class="form-section">Informações Complementares</div>
      <div class="form-group col-span-2"><label>Roteiro de Acesso</label>
        <textarea id="f-roteiro_acesso" rows="3" placeholder="Descreva o roteiro de acesso ao imóvel...">${im.roteiro_acesso||''}</textarea></div>
      <div class="form-group"><label>Valor de Avaliação (R$)</label>
        <input id="f-valor_avaliacao" type="number" step="0.01" value="${im.valor_avaliacao||''}"/></div>
      <div class="form-group"><label>Data do Valor</label>
        <input id="f-data_valor_avaliacao" type="date" value="${im.data_valor_avaliacao?.split('T')[0]||''}"/></div>
      <div class="form-group"><label>Estado de Conservação</label>
        <select id="f-estado_conservacao">
          <option value="">Selecione</option>
          ${ESTADOS_CONSERVACAO.map(e => `<option value="${e.toLowerCase()}" ${im.estado_conservacao===e.toLowerCase()?'selected':''}>${e}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label>Documento Principal (PDF/Imagem)</label>
        <input id="f-documento" type="file" accept=".pdf,.jpg,.jpeg,.png"/></div>
      <div class="form-group col-span-2"><label>Observações</label>
        <textarea id="f-observacoes" rows="2">${im.observacoes||''}</textarea></div>
    </div>
    </div>

    ${id ? `<div id="tab-docs" style="display:none">
      <div id="docs-painel" data-imovel-id="${id}"></div>
    </div>` : ''}
  `;

  const rodape = `
    <button class="btn" onclick="fecharModal()">Cancelar</button>
    <button class="btn btn-primary" id="btn-salvar-imovel" onclick="salvarImovel('${id||''}')">${icon("save")} Salvar</button>`;

  abrirModal(id ? 'Editar Imóvel' : 'Novo Imóvel', corpo, rodape);
  calcAreaRemanescente();

  // Se editando e já tem proprietário, mostra as infos do proprietário
  if (im.proprietario_id && im.proprietario_nome) {
    const infoEl = document.getElementById('proprietario-imovel-info');
    if (infoEl) {
      infoEl.style.display = 'block';
      infoEl.innerHTML = `<strong>${im.proprietario_nome}</strong>`;
    }
  }
}

function switchTabImovel(tab) {
  document.getElementById('tab-dados').style.display = tab === 'dados' ? '' : 'none';
  const tabDocs = document.getElementById('tab-docs');
  if (tabDocs) tabDocs.style.display = tab === 'docs' ? '' : 'none';

  document.getElementById('tab-dados-btn').style.background = tab === 'dados' ? 'var(--green)' : '';
  document.getElementById('tab-dados-btn').style.color = tab === 'dados' ? '#fff' : '';
  const tdBtn = document.getElementById('tab-docs-btn');
  if (tdBtn) {
    tdBtn.style.background = tab === 'docs' ? 'var(--green)' : '';
    tdBtn.style.color = tab === 'docs' ? '#fff' : '';
  }

  // Botão salvar só aparece na aba dados
  const btnSalvar = document.getElementById('btn-salvar-imovel');
  if (btnSalvar) btnSalvar.style.display = tab === 'dados' ? '' : 'none';

  if (tab === 'docs') {
    const painel = document.getElementById('docs-painel');
    if (painel) carregarDocumentosImovel(painel.dataset.imovelId);
  }
}

function calcAreaRemanescente() {
  const total = parseFloat(document.getElementById('f-area_total')?.value || 0);
  const consolidada = parseFloat(document.getElementById('f-area_consolidada')?.value || 0);
  const nativa = parseFloat(document.getElementById('f-area_vegetacao_nativa')?.value || 0);
  const reserva = parseFloat(document.getElementById('f-area_reserva_legal')?.value || 0);
  const servidao = parseFloat(document.getElementById('f-area_servidao')?.value || 0);
  const box = document.getElementById('area-check-box');
  const el  = document.getElementById('area-check');
  if (!box || !el) return;
  if (!total) { box.style.display = 'none'; return; }
  const soma = consolidada + nativa + reserva + servidao;
  box.style.display = 'block';
  const diff = total - soma;
  const ok = Math.abs(diff) < 0.1;
  el.className = `alert ${ok ? 'alert-ok' : 'alert-erro'}`;
  el.innerHTML = ok
    ? `${ICONS.check_circle} Áreas conferem: ${fmt.area(soma)} de ${fmt.area(total)}`
    : `${ICONS.warning} Soma das áreas (${fmt.area(soma)}) ${diff > 0 ? 'falta' : 'excede'} ${fmt.area(Math.abs(diff))} em relação ao total (${fmt.area(total)})`;
}

async function salvarImovel(id) {
  const campos = ['nome','area_total','logradouro','municipio','uf','cep','situacao','matricula','cri',
    'data_registro','tipo_documento','cib_nirf','ccir','sigef','latitude','longitude',
    'car','area_consolidada','area_vegetacao_nativa','area_reserva_legal','area_servidao',
    'roteiro_acesso','valor_avaliacao','data_valor_avaliacao','estado_conservacao','observacoes','proprietario_id'];
  const form = new FormData();
  campos.forEach(c => { form.append(c, formValue('f-'+c) || ''); });
  const file = document.getElementById('f-documento')?.files[0];
  if (file) form.append('documento', file);
  if (!formValue('f-nome')) { toast('Nome obrigatório', 'err'); return; }
  try {
    if (id) await API.putF(`/imoveis/${id}`, form);
    else    await API.postF('/imoveis', form);
    fecharModal(); toast(id ? 'Imóvel atualizado!' : 'Imóvel cadastrado!'); carregarImoveis();
  } catch (e) { toast(e.message, 'err'); }
}

async function removerImovel(id, nome) {
  if (!confirm(`Remover "${nome}"?`)) return;
  try { await API.del(`/imoveis/${id}`); toast('Imóvel removido'); carregarImoveis(); }
  catch (e) { toast(e.message, 'err'); }
}

function atualizarPreviewCoordenada(tipo) {
  const inputId = tipo === 'lat' ? 'f-latitude' : 'f-longitude';
  const valor = document.getElementById(inputId)?.value;
  if (!valor) return;
  
  const coordenada = fmt.coordenada(valor, tipo === 'lat' ? 'lat' : 'lng');
  const previewId = `preview-${inputId}`;
  let preview = document.getElementById(previewId);
  
  if (coordenada !== '—') {
    if (!preview) {
      preview = document.createElement('div');
      preview.id = previewId;
      preview.style.cssText = 'font-size:12px;color:var(--text-2);margin-top:4px';
      document.getElementById(inputId).parentElement.appendChild(preview);
    }
    preview.innerHTML = `📍 Formato CAR: ${coordenada}`;
  } else if (preview) {
    preview.remove();
  }
}

// ── DOCUMENTOS DO IMÓVEL ──────────────────────────────────────────────────
const TIPOS_DOC_IMOVEL = [
  { v: 'inteiro_teor',      l: 'Inteiro Teor',                   grupo: 'certidao', requerRegistro: true },
  { v: 'cadeia_dominial',   l: 'Cadeia Dominial / Trintenária',   grupo: 'certidao', requerRegistro: true },
  { v: 'onus',              l: 'Ônus Reais',                      grupo: 'certidao', requerRegistro: true },
  { v: 'situacao_juridica', l: 'Situação Jurídica',               grupo: 'certidao', requerRegistro: true },
  { v: 'car',               l: 'CAR',                              grupo: 'fundiario' },
  { v: 'ccir',              l: 'CCIR',                            grupo: 'fundiario' },
  { v: 'itr',               l: 'ITR',                              grupo: 'fundiario' },
  { v: 'mapa_memorial',     l: 'Mapa e Memorial Descritivo',      grupo: 'fundiario' },
  { v: 'outros',            l: 'Outros',                          grupo: 'outros' },
];

function labelDocTipo(tipo) {
  return TIPOS_DOC_IMOVEL.find(t => t.v === tipo)?.l || tipo;
}

async function abrirDocumentos(imovelId, nomeImovel) {
  const corpo = `
    <div style="font-size:13px;color:var(--text-3);margin-bottom:12px">Imóvel: <strong>${nomeImovel}</strong></div>
    <div id="docs-painel" data-imovel-id="${imovelId}">
      <p style="color:var(--text-3);text-align:center;padding:20px">Carregando...</p>
    </div>`;
  abrirModal(`Documentos – ${nomeImovel}`, corpo, `<button class="btn" onclick="fecharModal()">Fechar</button>`);
  carregarDocumentosImovel(imovelId);
}

async function carregarDocumentosImovel(imovelId) {
  const painel = document.getElementById('docs-painel');
  if (!painel) return;
  try {
    const { documentos } = await API.get(`/imoveis/${imovelId}/documentos`);

    const grupos = [
      { id: 'certidao', label: 'Certidões Cartorárias' },
      { id: 'fundiario', label: 'Documentos Fundiários' },
      { id: 'outros', label: 'Outros' },
    ];

    const docPorTipo = {};
    for (const d of documentos) {
      if (!docPorTipo[d.tipo]) docPorTipo[d.tipo] = [];
      docPorTipo[d.tipo].push(d);
    }

    let html = `
      <div style="margin-bottom:14px">
        <button class="btn btn-sm btn-primary" onclick="abrirFormDocumento('${imovelId}')">+ Adicionar Documento</button>
      </div>`;

    for (const grp of grupos) {
      const tiposGrupo = TIPOS_DOC_IMOVEL.filter(t => t.grupo === grp.id);
      let grpHtml = '';
      for (const tipo of tiposGrupo) {
        const docs = docPorTipo[tipo.v] || [];
        const docsHtml = docs.length ? docs.map(d => `
          <div style="display:flex;align-items:center;gap:8px;padding:6px 10px;background:var(--bg-card);border:0.5px solid var(--border);border-radius:6px;margin-top:4px">
            <span style="flex:1;font-size:12px">${d.descricao || '—'} <span style="color:var(--text-3)">${fmt.data(d.criado_em)}</span></span>
            ${d.arquivo_path ? `<button class="btn btn-sm" style="font-size:11px" onclick="downloadDocumento('${d.id}','${(d.arquivo_nome||'documento').replace(/'/g,"\\'")}')">${icon("download")} Baixar</button>` : '<span style="font-size:11px;color:var(--text-3)">Sem arquivo</span>'}
            <button class="btn btn-sm btn-danger" style="font-size:11px" onclick="removerDocumentoImovel('${imovelId}','${d.id}')">${icon("trash")}</button>
          </div>`).join('') : `<div style="color:var(--text-3);font-size:12px;padding:4px 10px">Nenhum anexado</div>`;
        grpHtml += `
          <div style="margin-bottom:8px">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <span style="font-size:12px;font-weight:600">${tipo.l}</span>
              <button class="btn btn-sm" style="font-size:11px" onclick="abrirFormDocumento('${imovelId}','${tipo.v}')">+ Anexar</button>
            </div>
            ${docsHtml}
          </div>`;
      }
      html += `
        <div style="margin-bottom:16px">
          <div style="font-size:13px;font-weight:700;color:var(--green);margin-bottom:8px;border-bottom:1px solid var(--border);padding-bottom:4px">${grp.label}</div>
          ${grpHtml}
        </div>`;
    }

    painel.innerHTML = html;
  } catch(e) { painel.innerHTML = `<div class="alert alert-erro">Erro: ${e.message}</div>`; }
}

function abrirFormDocumento(imovelId, tipoPreSelecionado) {
  const opsTipos = TIPOS_DOC_IMOVEL.map(t =>
    `<option value="${t.v}" ${t.v === tipoPreSelecionado ? 'selected' : ''}>${t.l}</option>`
  ).join('');

  const corpo = `
    <div style="display:flex;flex-direction:column;gap:14px">
      <div class="form-group">
        <label>Tipo de Documento *</label>
        <select id="fd-tipo">${opsTipos}</select>
      </div>
      <div class="form-group">
        <label>Descrição / Referência</label>
        <input id="fd-descricao" placeholder="Ex: Matrícula 12345, emitida em 01/01/2024"/>
      </div>
      <div class="form-group">
        <label>Arquivo (PDF ou Imagem)</label>
        <input id="fd-arquivo" type="file" accept=".pdf,.jpg,.jpeg,.png"/>
      </div>
    </div>`;

  abrirModal('Adicionar Documento', corpo,
    `<button class="btn" onclick="voltarParaDocumentos('${imovelId}')">← Voltar</button>
     <button class="btn btn-primary" onclick="salvarDocumentoImovel('${imovelId}')">${icon("save")} Salvar</button>`);
}

async function salvarDocumentoImovel(imovelId) {
  const tipo = document.getElementById('fd-tipo')?.value;
  const descricao = document.getElementById('fd-descricao')?.value;
  const arquivo = document.getElementById('fd-arquivo')?.files[0];
  if (!tipo) { toast('Selecione o tipo', 'err'); return; }

  const form = new FormData();
  form.append('tipo', tipo);
  if (descricao) form.append('descricao', descricao);
  if (arquivo) form.append('arquivo', arquivo);

  try {
    await API.postF(`/imoveis/${imovelId}/documentos`, form);
    toast('Documento salvo!');
    const corpo = `<div id="docs-painel" data-imovel-id="${imovelId}"><p style="color:var(--text-3);text-align:center;padding:20px">Carregando...</p></div>`;
    document.getElementById('modal-body').innerHTML = corpo;
    document.getElementById('modal-footer').innerHTML = `<button class="btn" onclick="fecharModal()">Fechar</button>`;
    carregarDocumentosImovel(imovelId);
  } catch(e) { toast(e.message, 'err'); }
}

function voltarParaDocumentos(imovelId) {
  const corpo = `<div id="docs-painel" data-imovel-id="${imovelId}"><p style="color:var(--text-3);text-align:center;padding:20px">Carregando...</p></div>`;
  document.getElementById('modal-body').innerHTML = corpo;
  document.getElementById('modal-footer').innerHTML = `<button class="btn" onclick="fecharModal()">Fechar</button>`;
  carregarDocumentosImovel(imovelId);
}

async function removerDocumentoImovel(imovelId, docId) {
  if (!confirm('Remover este documento?')) return;
  try {
    await API.del(`/documentos/${docId}`);
    toast('Documento removido');
    carregarDocumentosImovel(imovelId);
  } catch(e) { toast(e.message, 'err'); }
}

async function downloadDocumento(docId, nomeArquivo) {
  try {
    const res = await fetch(`/api/documentos/${docId}/download`, {
      headers: { 'Authorization': 'Bearer ' + API.token }
    });
    if (!res.ok) { toast('Arquivo não encontrado', 'err'); return; }
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = nomeArquivo;
    a.click();
  } catch(e) { toast('Erro ao baixar: ' + e.message, 'err'); }
}

async function exportarImoveisCSV() {
  try {
    const { imoveis } = await API.get('/imoveis?limite=9999');
    const cols  = ['nome','area_total','municipio','uf','situacao','matricula','cib_nirf','car','proprietario_nome'];
    const heads = ['Imóvel','Área (ha)','Município','UF','Situação','Matrícula','CIB/NIRF','CAR','Proprietário'];
    const linhas = [heads, ...imoveis.map(im => cols.map(k => im[k]||''))];
    const csv = linhas.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(';')).join('\n');
    const blob = new Blob(['\uFEFF'+csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `imoveis_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    toast(`${imoveis.length} imóveis exportados!`);
  } catch(e) { toast('Erro ao exportar: '+e.message, 'err'); }
}

async function buscarProprietarioImovel() {
  const cpfInput = document.getElementById("f-cpf-busca-imovel");
  const cpf = cpfInput?.value?.replace(/\D/g,"") || "";
  if (cpf.length < 11) { toast("Informe um CPF válido (11 dígitos)", "err"); return; }
  const infoEl = document.getElementById("proprietario-imovel-info");
  if (infoEl) { infoEl.style.display = "block"; infoEl.innerHTML = "Buscando..."; }
  try {
    const { cliente } = await API.get(`/clientes/cpf/${encodeURIComponent(cpf)}`);
    // Seleciona no select
    const sel = document.getElementById("f-proprietario_id");
    if (sel) {
      let found = false;
      for (const opt of sel.options) {
        if (opt.value === cliente.id) { opt.selected = true; found = true; break; }
      }
      if (!found) {
        // Adiciona temporariamente ao cache e recria options
        if (!clientesCache.find(c => c.id === cliente.id)) clientesCache.push(cliente);
        sel.innerHTML = `<option value="">Nenhum</option>` + clientesCache.map(c =>
          `<option value="${c.id}" ${c.id===cliente.id?"selected":""}>${c.nome} – ${c.cpf}</option>`).join("");
      }
    }
    if (infoEl) {
      infoEl.innerHTML = `<span style="color:var(--green)">✓</span> <strong>${cliente.nome}</strong> — CPF: ${cliente.cpf||"—"}`;
    }
  } catch(e) {
    if (infoEl) { infoEl.innerHTML = `<span style="color:var(--danger,#e53e3e)">✗ ${e.message === "Cliente não encontrado" ? "Nenhum produtor encontrado com este CPF." : e.message}</span>`; }
  }
}

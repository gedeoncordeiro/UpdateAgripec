// ── LINKS ÚTEIS ───────────────────────────────────────────────────────────
// Módulo para gerenciar links de redirecionamento dentro do sistema

let _linksCache = [];

async function iniciarLinks() {
  const el = document.getElementById('section-links');
  if (!el) return;
  el.innerHTML = `
    <div class="page-header">
      <h2 class="page-title">
        <span class="icon icon-md" id="links-page-icon"></span>
        Links Úteis
      </h2>
      <button class="btn btn-primary" onclick="abrirFormLink()">
        <span class="icon icon-sm" id="links-btn-icon"></span> Adicionar Link
      </button>
    </div>
    <div id="links-grid" class="links-grid">
      <div style="text-align:center;padding:60px 24px;color:var(--text-3)">
        <span class="icon icon-3xl" id="links-empty-icon"></span>
        <p style="margin-top:16px;font-size:15px;font-weight:600;color:var(--text-2)">Carregando links...</p>
      </div>
    </div>`;

  // Injeta ícones
  const pi = document.getElementById('links-page-icon');
  const bi = document.getElementById('links-btn-icon');
  const ei = document.getElementById('links-empty-icon');
  if (pi) pi.innerHTML = ICONS.link || ICONS.info;
  if (bi) bi.innerHTML = ICONS.plus;
  if (ei) ei.innerHTML = ICONS.link || ICONS.info;

  await carregarLinks();
}

async function carregarLinks() {
  try {
    const { links } = await API.get('/links');
    _linksCache = links || [];
    renderizarLinks();
  } catch(e) {
    toast('Erro ao carregar links: ' + e.message, 'err');
    document.getElementById('links-grid').innerHTML =
      `<div style="text-align:center;padding:60px;color:var(--danger,#e53e3e)">Erro ao carregar links.</div>`;
  }
}

function renderizarLinks() {
  const grid = document.getElementById('links-grid');
  if (!grid) return;

  if (_linksCache.length === 0) {
    grid.innerHTML = `
      <div style="text-align:center;padding:60px 24px;color:var(--text-3)">
        <span class="icon icon-3xl" id="links-empty-icon2"></span>
        <p style="margin-top:16px;font-size:15px;font-weight:600;color:var(--text-2)">Nenhum link cadastrado ainda</p>
        <p style="font-size:13px;margin-top:6px">Adicione links úteis para acesso rápido dentro do sistema</p>
        <button class="btn btn-primary" style="margin-top:20px" onclick="abrirFormLink()">
          <span class="icon icon-sm" id="links-add-btn-icon"></span> Adicionar Primeiro Link
        </button>
      </div>`;
    const ei2 = document.getElementById('links-empty-icon2');
    const ab = document.getElementById('links-add-btn-icon');
    if (ei2) ei2.innerHTML = ICONS.link || ICONS.info;
    if (ab)  ab.innerHTML  = ICONS.plus;
    return;
  }

  grid.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;padding:4px 0">
      ${_linksCache.map(link => `
        <div class="card link-card" style="display:flex;flex-direction:column;gap:10px;cursor:default;transition:box-shadow .2s">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px">
            <div style="display:flex;align-items:center;gap:10px;flex:1;min-width:0">
              <div style="flex-shrink:0;width:38px;height:38px;background:var(--primary-light,rgba(34,130,84,.12));border-radius:10px;display:flex;align-items:center;justify-content:center;color:var(--primary)">
                <span class="icon icon-sm link-icon-${link.id}"></span>
              </div>
              <div style="min-width:0">
                <div style="font-weight:700;font-size:14px;color:var(--text-1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(link.titulo)}</div>
                ${link.descricao ? `<div style="font-size:12px;color:var(--text-3);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(link.descricao)}</div>` : ''}
              </div>
            </div>
            <div style="display:flex;gap:4px;flex-shrink:0">
              <button class="btn btn-sm" title="Editar" onclick="abrirFormLink('${link.id}')" style="padding:4px 8px">
                <span class="icon icon-sm link-edit-icon-${link.id}"></span>
              </button>
              <button class="btn btn-sm btn-danger" title="Excluir" onclick="removerLink('${link.id}','${escHtml(link.titulo)}')" style="padding:4px 8px">
                <span class="icon icon-sm link-del-icon-${link.id}"></span>
              </button>
            </div>
          </div>
          <a href="${escHtml(link.url)}" target="_blank" rel="noopener noreferrer"
             style="display:flex;align-items:center;gap:6px;padding:8px 12px;background:var(--bg-hover);border-radius:8px;text-decoration:none;color:var(--primary);font-size:13px;font-weight:500;border:1px solid var(--border);transition:background .15s"
             onmouseover="this.style.background='var(--primary-light,rgba(34,130,84,.12))'"
             onmouseout="this.style.background='var(--bg-hover)'">
            <span class="icon icon-sm link-open-icon-${link.id}"></span>
            <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1">${escHtml(link.url)}</span>
          </a>
        </div>`).join('')}
    </div>`;

  // Injeta ícones nas células criadas
  _linksCache.forEach(link => {
    const icon_el  = document.querySelector(`.link-icon-${link.id}`);
    const edit_el  = document.querySelector(`.link-edit-icon-${link.id}`);
    const del_el   = document.querySelector(`.link-del-icon-${link.id}`);
    const open_el  = document.querySelector(`.link-open-icon-${link.id}`);
    if (icon_el)  icon_el.innerHTML  = ICONS.link   || ICONS.info;
    if (edit_el)  edit_el.innerHTML  = ICONS.edit   || ICONS.pencil || '✏️';
    if (del_el)   del_el.innerHTML   = ICONS.trash;
    if (open_el)  open_el.innerHTML  = ICONS.external_link || ICONS.link || '↗';
  });
}

function escHtml(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function abrirFormLink(id) {
  const link = id ? _linksCache.find(l => l.id === id) : {};
  const L = link || {};

  const corpo = `
    <div class="form-grid-2" style="gap:14px">
      <div class="form-group col-span-2">
        <label>Título *</label>
        <input id="lf-titulo" value="${escHtml(L.titulo||'')}" placeholder="Ex: Portal do Agricultor, INCRA, SISBOV..."/>
      </div>
      <div class="form-group col-span-2">
        <label>URL / Link *</label>
        <input id="lf-url" type="url" value="${escHtml(L.url||'')}" placeholder="https://..."/>
      </div>
      <div class="form-group col-span-2">
        <label>Descrição <span style="font-weight:400;color:var(--text-3)">(opcional)</span></label>
        <input id="lf-descricao" value="${escHtml(L.descricao||'')}" placeholder="Breve descrição do link"/>
      </div>
      <div class="form-group">
        <label>Ordem de exibição</label>
        <input id="lf-ordem" type="number" value="${L.ordem||0}" min="0"/>
      </div>
    </div>`;

  const rodape = `
    <button class="btn" onclick="fecharModal()">Cancelar</button>
    <button class="btn btn-primary" onclick="salvarLink('${id||''}')">
      <span class="icon icon-sm" id="modal-save-icon"></span> Salvar
    </button>`;

  abrirModal(id ? 'Editar Link' : 'Novo Link Útil', corpo, rodape);
  const si = document.getElementById('modal-save-icon');
  if (si) si.innerHTML = ICONS.save || '💾';
}

async function salvarLink(id) {
  const titulo   = document.getElementById('lf-titulo')?.value?.trim();
  const url      = document.getElementById('lf-url')?.value?.trim();
  const descricao= document.getElementById('lf-descricao')?.value?.trim();
  const ordem    = parseInt(document.getElementById('lf-ordem')?.value || 0);

  if (!titulo) { toast('Informe o título do link', 'err'); return; }
  if (!url)    { toast('Informe a URL do link', 'err'); return; }
  if (!url.startsWith('http')) { toast('A URL deve começar com http:// ou https://', 'err'); return; }

  try {
    if (id) {
      await API.put(`/links/${id}`, { titulo, url, descricao, ordem });
      toast('Link atualizado!');
    } else {
      await API.post('/links', { titulo, url, descricao, ordem });
      toast('Link adicionado!');
    }
    fecharModal();
    await carregarLinks();
  } catch(e) { toast('Erro: ' + e.message, 'err'); }
}

async function removerLink(id, titulo) {
  if (!confirm(`Remover o link "${titulo}"?`)) return;
  try {
    await API.del(`/links/${id}`);
    toast('Link removido');
    await carregarLinks();
  } catch(e) { toast('Erro: ' + e.message, 'err'); }
}

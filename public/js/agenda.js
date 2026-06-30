// ── AGENDA / LEMBRETES ────────────────────────────────────────────────────
// Lembretes de vencimentos, vacinações e tarefas — armazenado localmente

let _agDados = null;

function _agCarregar() {
  try {
    const raw = localStorage.getItem('ag_agenda');
    _agDados = raw ? JSON.parse(raw) : { lembretes: [] };
  } catch(e) { _agDados = { lembretes: [] }; }
  return _agDados;
}

function _agSalvar() {
  localStorage.setItem('ag_agenda', JSON.stringify(_agDados));
}

const TIPOS_LEMBRETE = [
  { v: 'vacinacao',     l: 'Vacinação',           icone: 'bolt'      },
  { v: 'vencimento',    l: 'Vencimento Doc.',      icone: 'calendar'  },
  { v: 'manutencao',   l: 'Manutenção',           icone: 'settings'  },
  { v: 'reuniao',       l: 'Reunião/Visita',       icone: 'clientes'  },
  { v: 'pagamento',     l: 'Pagamento',            icone: 'money'     },
  { v: 'tarefa',        l: 'Tarefa Geral',         icone: 'check'     },
];

const STATUS_LEMBRETE = [
  { v: 'pendente',   l: 'Pendente',   badge: 'badge-amber' },
  { v: 'concluido',  l: 'Concluído',  badge: 'badge-green' },
  { v: 'cancelado',  l: 'Cancelado',  badge: 'badge-gray'  },
];

async function iniciarAgenda() {
  const el = document.getElementById('section-agenda');
  _agCarregar();
  _agRenderizar(el);
}

function _agRenderizar(el) {
  const hoje = new Date();
  hoje.setHours(0,0,0,0);

  const filtro = el._filtro || 'pendente';
  el._filtro = filtro;

  _agCarregar();
  let lista = [..._agDados.lembretes].sort((a,b) => a.data.localeCompare(b.data));
  if (filtro !== 'todos') lista = lista.filter(l => l.status === filtro);

  // Contagens
  const pendentes  = _agDados.lembretes.filter(l => l.status === 'pendente').length;
  const vencidos   = _agDados.lembretes.filter(l => l.status === 'pendente' && new Date(l.data+'T23:59:59') < hoje).length;
  const hojeLista  = _agDados.lembretes.filter(l => l.status === 'pendente' && l.data === hoje.toISOString().slice(0,10)).length;

  el.innerHTML = `
    <div class="page-header">
      <h2 class="page-title">${icon('calendar','md')} Agenda</h2>
      <button class="btn btn-primary" onclick="abrirFormLembrete()">
        ${icon('plus','sm')} Novo Lembrete
      </button>
    </div>

    <div class="metrics" style="grid-template-columns:repeat(3,1fr);margin-bottom:24px">
      <div class="metric-card" style="cursor:pointer" onclick="_agSetFiltro('pendente')">
        <div class="metric-icon amber"><span class="icon icon-lg">${ICONS.calendar}</span></div>
        <div class="metric-label">Pendentes</div>
        <div class="metric-value">${pendentes}</div>
        <div class="metric-sub">lembretes ativos</div>
      </div>
      <div class="metric-card" style="cursor:pointer" onclick="_agSetFiltro('pendente')">
        <div class="metric-icon" style="background:rgba(239,68,68,.12)"><span class="icon icon-lg" style="color:#ef4444">${ICONS.warning}</span></div>
        <div class="metric-label">Vencidos</div>
        <div class="metric-value" style="color:#ef4444">${vencidos}</div>
        <div class="metric-sub">prazo expirado</div>
      </div>
      <div class="metric-card" style="cursor:pointer" onclick="_agSetFiltro('pendente')">
        <div class="metric-icon green"><span class="icon icon-lg">${ICONS.check_circle}</span></div>
        <div class="metric-label">Para Hoje</div>
        <div class="metric-value" style="color:var(--green)">${hojeLista}</div>
        <div class="metric-sub">tarefas de hoje</div>
      </div>
    </div>

    <div class="card">
      <div class="card-body" style="padding-bottom:0;display:flex;justify-content:space-between;align-items:center">
        <div class="card-title" style="margin-bottom:0">${icon('filter','md')} Lembretes</div>
        <div style="display:flex;gap:6px">
          ${['pendente','concluido','cancelado','todos'].map(f => `
            <button class="btn btn-sm ${filtro===f?'btn-primary':''}" onclick="_agSetFiltro('${f}')">
              ${f==='todos'?'Todos':STATUS_LEMBRETE.find(s=>s.v===f)?.l||f}
            </button>`).join('')}
        </div>
      </div>
      <div style="padding:16px">
      ${lista.length === 0
        ? `<div style="text-align:center;padding:40px;color:var(--text-3)">
             <span class="icon icon-xl">${ICONS.calendar}</span>
             <p style="margin-top:12px">Nenhum lembrete ${filtro!=='todos'?'com status "'+filtro+'"':''} encontrado.</p>
             <button class="btn btn-primary" style="margin-top:12px" onclick="abrirFormLembrete()">
               ${icon('plus','sm')} Criar lembrete
             </button>
           </div>`
        : lista.map(l => {
            const dataLembrete = new Date(l.data+'T23:59:59');
            const vencido = l.status === 'pendente' && dataLembrete < hoje;
            const ehHoje  = l.data === hoje.toISOString().slice(0,10);
            const tipo = TIPOS_LEMBRETE.find(t => t.v === l.tipo) || TIPOS_LEMBRETE.at(-1);
            const stObj = STATUS_LEMBRETE.find(s => s.v === l.status) || STATUS_LEMBRETE[0];
            return `
            <div style="display:flex;align-items:start;gap:14px;padding:14px;border:1px solid ${vencido?'#fca5a5':ehHoje?'var(--green)':'var(--border)'};border-radius:var(--r12);margin-bottom:10px;background:${vencido?'rgba(239,68,68,.04)':ehHoje?'rgba(22,163,74,.04)':'var(--bg-card)'}">
              <div style="width:36px;height:36px;border-radius:8px;background:var(--bg-subtle);display:flex;align-items:center;justify-content:center;flex-shrink:0">
                <span class="icon icon-sm">${ICONS[tipo.icone]||ICONS.check}</span>
              </div>
              <div style="flex:1;min-width:0">
                <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px">
                  <strong style="font-size:14px">${l.titulo}</strong>
                  <span class="badge ${stObj.badge}">${stObj.l}</span>
                  ${vencido ? `<span class="badge" style="background:rgba(239,68,68,.12);color:#ef4444;border-color:rgba(239,68,68,.2)">Vencido</span>` : ''}
                  ${ehHoje && l.status==='pendente' ? `<span class="badge" style="background:rgba(22,163,74,.12);color:var(--green);border-color:rgba(22,163,74,.2)">Hoje</span>` : ''}
                </div>
                <div style="font-size:12px;color:var(--text-3)">
                  <span class="icon icon-xs">${ICONS.calendar}</span>
                  ${fmt.data(l.data+'T12:00:00')}
                  ${l.descricao ? ` · ${l.descricao}` : ''}
                </div>
              </div>
              <div style="display:flex;gap:6px;flex-shrink:0">
                ${l.status==='pendente' ? `<button class="btn btn-sm" title="Marcar concluído" onclick="_agConcluir('${l.id}')" style="color:var(--green)"><span class="icon icon-xs">${ICONS.check}</span></button>` : ''}
                <button class="btn btn-sm" onclick="abrirFormLembrete('${l.id}')">${icon('edit')}</button>
                <button class="btn btn-sm btn-danger" onclick="_agRemover('${l.id}')">${icon('trash')}</button>
              </div>
            </div>`}).join('')
      }
      </div>
    </div>`;
}

function _agSetFiltro(f) {
  const el = document.getElementById('section-agenda');
  if (el) { el._filtro = f; _agRenderizar(el); }
}

function _agConcluir(id) {
  _agCarregar();
  const l = _agDados.lembretes.find(x => x.id === id);
  if (l) { l.status = 'concluido'; _agSalvar(); }
  toast('Marcado como concluído!');
  const el = document.getElementById('section-agenda');
  if (el) _agRenderizar(el);
}

function _agRemover(id) {
  if (!confirm('Remover este lembrete?')) return;
  _agCarregar();
  _agDados.lembretes = _agDados.lembretes.filter(x => x.id !== id);
  _agSalvar();
  toast('Lembrete removido');
  const el = document.getElementById('section-agenda');
  if (el) _agRenderizar(el);
}

function abrirFormLembrete(id) {
  _agCarregar();
  const l = id ? _agDados.lembretes.find(x => x.id === id) : null;

  const corpo = `
    <div class="form-grid-2">
      <div class="form-group col-span-2">
        <label>Título *</label>
        <input id="f-ag-titulo" value="${l?.titulo||''}" placeholder="Ex: Vacinação febre aftosa"/>
      </div>
      <div class="form-group">
        <label>Tipo</label>
        <select id="f-ag-tipo">
          ${TIPOS_LEMBRETE.map(t => `<option value="${t.v}" ${l?.tipo===t.v?'selected':''}>${t.l}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Data *</label>
        <input id="f-ag-data" type="date" value="${l?.data||new Date().toISOString().slice(0,10)}"/>
      </div>
      <div class="form-group">
        <label>Status</label>
        <select id="f-ag-status">
          ${STATUS_LEMBRETE.map(s => `<option value="${s.v}" ${l?.status===s.v?'selected':''}>${s.l}</option>`).join('')}
        </select>
      </div>
      <div class="form-group col-span-2">
        <label>Descrição / Observação</label>
        <textarea id="f-ag-descricao" rows="3" placeholder="Detalhes adicionais...">${l?.descricao||''}</textarea>
      </div>
    </div>`;

  const rodape = `
    <button class="btn" onclick="fecharModal()">Cancelar</button>
    <button class="btn btn-primary" onclick="_agSalvarForm('${id||''}')">
      ${icon('save','sm')} Salvar
    </button>`;

  abrirModal(id ? 'Editar Lembrete' : 'Novo Lembrete', corpo, rodape);
}

function _agSalvarForm(id) {
  const titulo   = document.getElementById('f-ag-titulo')?.value?.trim();
  const tipo     = document.getElementById('f-ag-tipo')?.value;
  const data     = document.getElementById('f-ag-data')?.value;
  const status   = document.getElementById('f-ag-status')?.value || 'pendente';
  const descricao = document.getElementById('f-ag-descricao')?.value?.trim();

  if (!titulo) { toast('Título obrigatório', 'err'); return; }
  if (!data)   { toast('Data obrigatória', 'err'); return; }

  _agCarregar();
  if (id) {
    const idx = _agDados.lembretes.findIndex(x => x.id === id);
    if (idx >= 0) _agDados.lembretes[idx] = { ..._agDados.lembretes[idx], titulo, tipo, data, status, descricao };
  } else {
    _agDados.lembretes.push({
      id: 'ag_' + Date.now(),
      titulo, tipo, data, status, descricao,
      criado_em: new Date().toISOString(),
    });
  }
  _agSalvar();
  fecharModal();
  toast(id ? 'Lembrete atualizado!' : 'Lembrete criado!');
  const el = document.getElementById('section-agenda');
  if (el) _agRenderizar(el);
}

// Notificação de lembretes pendentes no login
function verificarLembretesUrgentes() {
  _agCarregar();
  const hoje = new Date(); hoje.setHours(0,0,0,0);
  const amanha = new Date(hoje); amanha.setDate(amanha.getDate() + 1);

  const urgentes = _agDados.lembretes.filter(l => {
    if (l.status !== 'pendente') return false;
    const d = new Date(l.data+'T00:00:00');
    return d <= amanha;
  });

  if (urgentes.length > 0) {
    setTimeout(() => {
      toast(`${urgentes.length} lembrete(s) urgente(s) na Agenda!`, 'warn');
    }, 2000);
  }
}

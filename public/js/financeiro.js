// ── FINANCEIRO ────────────────────────────────────────────────────────────
// Módulo de controle financeiro (despesas e receitas) — armazenado localmente

let _finDados = null;

function _finCarregar() {
  try {
    const raw = localStorage.getItem('ag_financeiro');
    _finDados = raw ? JSON.parse(raw) : { lancamentos: [] };
  } catch(e) { _finDados = { lancamentos: [] }; }
  return _finDados;
}

function _finSalvar() {
  localStorage.setItem('ag_financeiro', JSON.stringify(_finDados));
}

const CATEGORIAS_FIN = {
  receita: [
    { v: 'venda_animais',    l: 'Venda de Animais'     },
    { v: 'venda_producao',   l: 'Venda de Produção'    },
    { v: 'arrendamento',     l: 'Arrendamento'         },
    { v: 'credito_rural',    l: 'Crédito Rural'        },
    { v: 'outra_receita',    l: 'Outra Receita'        },
  ],
  despesa: [
    { v: 'alimentacao',      l: 'Alimentação Animal'   },
    { v: 'sanidade',         l: 'Sanidade / Veterinário'},
    { v: 'mao_obra',         l: 'Mão de Obra'          },
    { v: 'combustivel',      l: 'Combustível'          },
    { v: 'manutencao',       l: 'Manutenção'           },
    { v: 'insumos',          l: 'Insumos Agrícolas'    },
    { v: 'impostos',         l: 'Impostos / Taxas'     },
    { v: 'documentacao',     l: 'Documentação'         },
    { v: 'outra_despesa',    l: 'Outra Despesa'        },
  ],
};

async function iniciarFinanceiro() {
  const el = document.getElementById('section-financeiro');
  _finCarregar();
  _finRenderizar(el);
}

function _finRenderizar(el) {
  const dados = _finDados;
  const hoje = new Date();
  const mesAtual = hoje.getFullYear() + '-' + String(hoje.getMonth()+1).padStart(2,'0');

  // Filtro de mês
  const mesesDisp = [...new Set(dados.lancamentos.map(l => l.data.slice(0,7)))].sort().reverse();
  if (!mesesDisp.includes(mesAtual)) mesesDisp.unshift(mesAtual);

  const filtroMes = el._filtroMes || mesAtual;
  el._filtroMes = filtroMes;

  const lancsFiltrados = dados.lancamentos.filter(l => l.data.slice(0,7) === filtroMes);
  const totalReceitas  = lancsFiltrados.filter(l => l.tipo==='receita').reduce((s,l) => s+l.valor, 0);
  const totalDespesas  = lancsFiltrados.filter(l => l.tipo==='despesa').reduce((s,l) => s+l.valor, 0);
  const saldo = totalReceitas - totalDespesas;

  el.innerHTML = `
    <div class="page-header">
      <h2 class="page-title">${icon('money','md')} Financeiro</h2>
      <div style="display:flex;gap:8px;align-items:center">
        <select onchange="document.getElementById('section-financeiro')._filtroMes=this.value;_finRenderizar(document.getElementById('section-financeiro'))" style="padding:8px 12px;border-radius:var(--r8);border:1px solid var(--border);background:var(--bg-card);color:var(--text-1);font-size:13px">
          ${mesesDisp.map(m => `<option value="${m}" ${m===filtroMes?'selected':''}>${_finNomeMes(m)}</option>`).join('')}
        </select>
        <button class="btn btn-primary" onclick="abrirFormLancamento()">
          ${icon('plus','sm')} Novo Lançamento
        </button>
        <button class="btn" onclick="exportarFinanceiroCSV()">
          ${icon('download','sm')} CSV
        </button>
      </div>
    </div>

    <div class="metrics" style="grid-template-columns:repeat(3,1fr);margin-bottom:24px">
      <div class="metric-card">
        <div class="metric-icon green"><span class="icon icon-lg">${ICONS.money}</span></div>
        <div class="metric-label">Receitas</div>
        <div class="metric-value" style="color:var(--green);font-size:20px">${fmt.moeda(totalReceitas)}</div>
        <div class="metric-sub">${lancsFiltrados.filter(l=>l.tipo==='receita').length} lançamentos</div>
      </div>
      <div class="metric-card">
        <div class="metric-icon" style="background:rgba(239,68,68,.12)"><span class="icon icon-lg" style="color:#ef4444">${ICONS.money}</span></div>
        <div class="metric-label">Despesas</div>
        <div class="metric-value" style="color:#ef4444;font-size:20px">${fmt.moeda(totalDespesas)}</div>
        <div class="metric-sub">${lancsFiltrados.filter(l=>l.tipo==='despesa').length} lançamentos</div>
      </div>
      <div class="metric-card">
        <div class="metric-icon ${saldo>=0?'green':'amber'}"><span class="icon icon-lg">${ICONS.area}</span></div>
        <div class="metric-label">Saldo</div>
        <div class="metric-value" style="color:${saldo>=0?'var(--green)':'#f59e0b'};font-size:20px">${fmt.moeda(saldo)}</div>
        <div class="metric-sub">${saldo>=0?'Positivo':'Negativo'}</div>
      </div>
    </div>

    <div class="card">
      <div class="card-body" style="padding-bottom:0">
        <div class="card-title">${icon('filter','md')} Lançamentos — ${_finNomeMes(filtroMes)}</div>
      </div>
      ${lancsFiltrados.length === 0
        ? `<div style="text-align:center;padding:40px;color:var(--text-3)">
             <span class="icon icon-xl">${ICONS.money}</span>
             <p style="margin-top:12px">Nenhum lançamento neste mês.</p>
             <button class="btn btn-primary" style="margin-top:12px" onclick="abrirFormLancamento()">
               ${icon('plus','sm')} Adicionar primeiro lançamento
             </button>
           </div>`
        : `<div class="table-wrap">
            <table>
              <thead><tr>
                <th>Data</th><th>Tipo</th><th>Categoria</th><th>Descrição</th><th style="text-align:right">Valor</th><th></th>
              </tr></thead>
              <tbody>
                ${[...lancsFiltrados].sort((a,b)=>b.data.localeCompare(a.data)).map(l => `
                  <tr>
                    <td>${fmt.data(l.data+'T12:00:00')}</td>
                    <td><span class="badge ${l.tipo==='receita'?'badge-green':'badge-amber'}">${l.tipo==='receita'?'Receita':'Despesa'}</span></td>
                    <td>${_finLabelCat(l.tipo, l.categoria)}</td>
                    <td>${l.descricao||'—'}</td>
                    <td style="text-align:right;font-weight:700;color:${l.tipo==='receita'?'var(--green)':'#ef4444'}">${l.tipo==='despesa'?'-':''}${fmt.moeda(l.valor)}</td>
                    <td>
                      <button class="btn btn-sm" onclick="editarLancamento('${l.id}')">${icon('edit')}</button>
                      <button class="btn btn-sm btn-danger" onclick="removerLancamento('${l.id}')">${icon('trash')}</button>
                    </td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>`
      }
    </div>`;
}

function _finNomeMes(ym) {
  const [y, m] = ym.split('-');
  return new Date(y, m-1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

function _finLabelCat(tipo, val) {
  const lista = CATEGORIAS_FIN[tipo] || [];
  return lista.find(c => c.v === val)?.l || val || '—';
}

function abrirFormLancamento(id) {
  _finCarregar();
  let l = id ? _finDados.lancamentos.find(x => x.id === id) : null;
  const tipo = l?.tipo || 'despesa';

  const corpo = `
    <div class="form-grid-2">
      <div class="form-group">
        <label>Tipo *</label>
        <select id="f-fin-tipo" onchange="atualizarCatsFin(this.value)">
          <option value="despesa" ${tipo==='despesa'?'selected':''}>Despesa</option>
          <option value="receita" ${tipo==='receita'?'selected':''}>Receita</option>
        </select>
      </div>
      <div class="form-group">
        <label>Data *</label>
        <input id="f-fin-data" type="date" value="${l?.data || new Date().toISOString().slice(0,10)}"/>
      </div>
      <div class="form-group col-span-2">
        <label>Categoria *</label>
        <select id="f-fin-categoria">
          ${(CATEGORIAS_FIN[tipo]||[]).map(c => `<option value="${c.v}" ${l?.categoria===c.v?'selected':''}>${c.l}</option>`).join('')}
        </select>
      </div>
      <div class="form-group col-span-2">
        <label>Descrição</label>
        <input id="f-fin-descricao" value="${l?.descricao||''}" placeholder="Detalhe do lançamento"/>
      </div>
      <div class="form-group col-span-2">
        <label>Valor (R$) *</label>
        <input id="f-fin-valor" type="number" step="0.01" min="0" value="${l?.valor||''}"/>
      </div>
    </div>`;

  const rodape = `
    <button class="btn" onclick="fecharModal()">Cancelar</button>
    <button class="btn btn-primary" onclick="salvarLancamento('${id||''}')">
      ${icon('save','sm')} Salvar
    </button>`;

  abrirModal(id ? 'Editar Lançamento' : 'Novo Lançamento', corpo, rodape);
}

function atualizarCatsFin(tipo) {
  const sel = document.getElementById('f-fin-categoria');
  if (!sel) return;
  sel.innerHTML = (CATEGORIAS_FIN[tipo]||[]).map(c => `<option value="${c.v}">${c.l}</option>`).join('');
}

function editarLancamento(id) { abrirFormLancamento(id); }

function salvarLancamento(id) {
  const tipo      = document.getElementById('f-fin-tipo')?.value;
  const data      = document.getElementById('f-fin-data')?.value;
  const categoria = document.getElementById('f-fin-categoria')?.value;
  const descricao = document.getElementById('f-fin-descricao')?.value?.trim();
  const valor     = parseFloat(document.getElementById('f-fin-valor')?.value);

  if (!data)         { toast('Data obrigatória', 'err'); return; }
  if (!categoria)    { toast('Categoria obrigatória', 'err'); return; }
  if (!valor || valor <= 0) { toast('Valor inválido', 'err'); return; }

  _finCarregar();
  if (id) {
    const idx = _finDados.lancamentos.findIndex(x => x.id === id);
    if (idx >= 0) _finDados.lancamentos[idx] = { ..._finDados.lancamentos[idx], tipo, data, categoria, descricao, valor };
  } else {
    _finDados.lancamentos.push({
      id: 'fin_' + Date.now(),
      tipo, data, categoria, descricao, valor,
      criado_em: new Date().toISOString(),
    });
  }
  _finSalvar();
  fecharModal();
  toast(id ? 'Lançamento atualizado!' : 'Lançamento adicionado!');
  const el = document.getElementById('section-financeiro');
  if (el) _finRenderizar(el);
}

function removerLancamento(id) {
  if (!confirm('Remover este lançamento?')) return;
  _finCarregar();
  _finDados.lancamentos = _finDados.lancamentos.filter(x => x.id !== id);
  _finSalvar();
  toast('Lançamento removido');
  const el = document.getElementById('section-financeiro');
  if (el) _finRenderizar(el);
}

function exportarFinanceiroCSV() {
  _finCarregar();
  const linhas = [
    ['Data','Tipo','Categoria','Descrição','Valor'],
    ..._finDados.lancamentos
      .sort((a,b) => b.data.localeCompare(a.data))
      .map(l => [
        l.data,
        l.tipo === 'receita' ? 'Receita' : 'Despesa',
        _finLabelCat(l.tipo, l.categoria),
        l.descricao || '',
        (l.tipo === 'despesa' ? '-' : '') + l.valor.toFixed(2).replace('.',','),
      ])
  ];
  const csv = linhas.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(';')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `financeiro_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  toast('CSV exportado!');
}

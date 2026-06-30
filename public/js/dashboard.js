async function carregarDashboard() {
  const el = document.getElementById('section-dashboard');
  el.innerHTML = '<p style="color:var(--text-2);padding:20px">Carregando...</p>';
  try {
    const [{ totais, graficos }, cfgRes] = await Promise.all([
      API.get('/dashboard/resumo'),
      API.get('/config').catch(() => ({ config: {} })),
    ]);
    const cfg = cfgRes.config || {};
    const nomeEmpresa = cfg.emp_nome_fantasia || cfg.emp_razao_social || 'AgroGestão';

    const cats = graficos.semoventes_por_categoria || [];
    const maxCabecas = Math.max(...cats.map(c => parseInt(c.total)), 1);

    const barras = cats.map(c => {
      const cat = CATEGORIAS.find(x => x.v === c.categoria) || { l: c.categoria, cor: 'var(--g400)' };
      const pct  = Math.round((parseInt(c.total) / maxCabecas) * 100);
      return `
        <div class="chart-col">
          <div class="chart-val">${fmt.num(c.total)}</div>
          <div class="chart-bar" style="height:${Math.max(pct,4)}%;background:${cat.cor}" title="${cat.l}: ${fmt.num(c.total)} cabeças"></div>
          <div class="chart-lbl">${cat.l}</div>
        </div>`;
    }).join('');

    const situacaoRows = (graficos.imoveis_por_situacao || []).map(s => `
      <tr>
        <td>${badgeSituacao(s.situacao)}</td>
        <td style="text-align:right;font-weight:700">${s.total}</td>
      </tr>`).join('') || '<tr><td colspan="2" style="color:var(--text-3);text-align:center;padding:16px">Sem dados</td></tr>';

    const hora = new Date().getHours();
    const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';

    el.innerHTML = `
      <div style="background:linear-gradient(135deg,var(--g800) 0%,var(--g600) 100%);
                  border-radius:var(--r16);padding:28px 32px;margin-bottom:24px;
                  position:relative;overflow:hidden;">
        <span class="hero-deco-icon" id="dash-deco"></span>
        <div style="color:rgba(255,255,255,.65);font-size:13px;margin-bottom:4px">${saudacao}, <strong style="color:#fff">${usuarioAtual?.nome?.split(' ')[0] || ''}</strong></div>
        <div style="color:#fff;font-size:21px;font-weight:800;letter-spacing:-.4px;margin-bottom:2px">${nomeEmpresa}</div>
        <div style="color:rgba(255,255,255,.55);font-size:12px">Painel de Gestão Rural · ${new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</div>
      </div>

      <div class="metrics">
        <div class="metric-card">
          <div class="metric-icon green"><span class="icon icon-lg" id="mi-clientes"></span></div>
          <div class="metric-label">Clientes</div>
          <div class="metric-value">${totais.clientes}</div>
          <div class="metric-sub">Produtores cadastrados</div>
        </div>
        <div class="metric-card">
          <div class="metric-icon amber"><span class="icon icon-lg" id="mi-imoveis"></span></div>
          <div class="metric-label">Imóveis</div>
          <div class="metric-value">${totais.imoveis}</div>
          <div class="metric-sub">${fmt.area(totais.area_total)} no total</div>
        </div>
        <div class="metric-card">
          <div class="metric-icon green"><span class="icon icon-lg" id="mi-plantel"></span></div>
          <div class="metric-label">Plantel</div>
          <div class="metric-value">${fmt.num(totais.cabecas)}</div>
          <div class="metric-sub">Cabeças de gado</div>
        </div>
        <div class="metric-card">
          <div class="metric-icon stone"><span class="icon icon-lg" id="mi-valor"></span></div>
          <div class="metric-label">Valor do Plantel</div>
          <div class="metric-value" style="font-size:18px">${fmt.moeda(totais.valor_plantel)}</div>
          <div class="metric-sub">Estimativa atual</div>
        </div>
      </div>

      <div class="grid-2">
        <div class="card card-body">
          <div class="card-title"><span class="icon icon-md" id="ct-plantel"></span> Distribuição do Plantel</div>
          ${cats.length
            ? `<div class="chart-bars">${barras}</div>`
            : '<p style="color:var(--text-3);font-size:13px;text-align:center;padding:40px 0">Cadastre semoventes para visualizar o gráfico</p>'
          }
        </div>
        <div class="card card-body">
          <div class="card-title"><span class="icon icon-md" id="ct-situacao"></span> Imóveis por Situação</div>
          <table>
            <thead><tr><th>Situação</th><th style="text-align:right">Qtd</th></tr></thead>
            <tbody>${situacaoRows}</tbody>
          </table>
          <div class="divider" style="margin-top:20px">estimativa financeira</div>
          <div class="valor-box">
            <div class="label">Valor Estimado do Plantel</div>
            <div class="valor">${fmt.moeda(totais.valor_plantel)}</div>
          </div>
        </div>
      </div>

      <div class="card card-body" style="margin-top:0">
        <div class="card-title"><span class="icon icon-md" id="ct-atalhos"></span> Acesso Rápido</div>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <button class="btn btn-primary" onclick="navegarPara('clientes',document.querySelector('[data-section=clientes]'))">
            <span class="icon icon-sm" id="qs-cli"></span> Novo Cliente
          </button>
          <button class="btn" onclick="navegarPara('imoveis',document.querySelector('[data-section=imoveis]'))">
            <span class="icon icon-sm" id="qs-imo"></span> Novo Imóvel
          </button>
          <button class="btn" onclick="navegarPara('semoventes',document.querySelector('[data-section=semoventes]'))">
            <span class="icon icon-sm" id="qs-sem"></span> Novo Lote
          </button>
          <button class="btn" onclick="navegarPara('projeto',document.querySelector('[data-section=projeto]'))">
            <span class="icon icon-sm" id="qs-proj"></span> Gerar Projeto
          </button>
          <button class="btn" onclick="navegarPara('relatorios',document.querySelector('[data-section=relatorios]'))">
            <span class="icon icon-sm" id="qs-rel"></span> Relatórios
          </button>
          <button class="btn" onclick="navegarPara('financeiro',document.querySelector('[data-section=financeiro]'))">
            <span class="icon icon-sm" id="qs-fin"></span> Financeiro
          </button>
          <button class="btn" onclick="navegarPara('agenda',document.querySelector('[data-section=agenda]'))">
            <span class="icon icon-sm" id="qs-ag"></span> Agenda
        </div>
      </div>`;

    // Injeta ícones
    const si = (id, k) => { const e = document.getElementById(id); if (e) e.innerHTML = ICONS[k]; };
    si('dash-deco',   'wheat');
    si('mi-clientes', 'users');
    si('mi-imoveis',  'home');
    si('mi-plantel',  'cow');
    si('mi-valor',    'money');
    si('ct-plantel',  'cow');
    si('ct-situacao', 'imoveis');
    si('ct-atalhos',  'bolt');
    si('qs-cli',      'plus');
    si('qs-imo',      'plus');
    si('qs-sem',      'plus');
    si('qs-proj',     'projeto');
    si('qs-rel',      'relatorios');
    si('qs-fin',      'money');
    si('qs-ag',       'calendar');

  } catch (e) {
    el.innerHTML = `<div class="alert alert-erro"><span class="icon icon-sm">${ICONS.x_circle}</span> Erro ao carregar painel: ${e.message}</div>`;
  }
}

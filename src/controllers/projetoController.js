'use strict';
const fs  = require('fs');
const db  = require('../database/db');
const { gerarProjeto, gerarLaudo, gerarApascentamento } = require('../utils/gerador_pdf');

exports.gerarProjeto = async (req, res) => {
  try {
    const payload = { ...req.body };

    // Injeta logomarca se existir
    const logoRow = db.prepare("SELECT valor FROM config_sistema WHERE chave='logomarca_path'").get();
    if (logoRow?.valor && fs.existsSync(logoRow.valor)) {
      payload.logomarca_path = logoRow.valor;
    }

    // Injeta textos configuráveis do sistema
    const configRows = db.prepare(
      "SELECT chave, valor FROM config_sistema WHERE chave IN (?,?,?,?,?)"
    ).all(
      'txt_rec_tecnica', 'txt_preservacao_ambiental',
      'txt_conservacao_solo', 'txt_croqui_localizacao', 'txt_ateste'
    );
    const cfg = {};
    for (const r of configRows) cfg[r.chave] = r.valor;
    payload.textos = {
      rec_tecnica: cfg.txt_rec_tecnica ||
        'A área produtiva da propriedade encontra-se em regular estado de conservação, boa capacidade hídrica, o que leva a bons parâmetros que possibilitam a aquisição de bezerros e sua respectiva produção.',
      preservacao_ambiental: cfg.txt_preservacao_ambiental ||
        'O proponente foi orientado em relação às leis ambientais vigentes, principalmente no que tange à reserva legal, mata ciliar e demais áreas de preservação permanente. Imóvel possui DCAA e Outorga de uso de água, conforme legislação do Estado do Maranhão.',
      conservacao_solo: cfg.txt_conservacao_solo ||
        'Serão recomendadas, caso necessário, a adoção de técnicas de manejo do solo que visem a melhoria deste, focando na garantia da produção.',
      croqui_localizacao: cfg.txt_croqui_localizacao ||
        'Apresentado no dossiê da operação de crédito e no cadastro do cliente, no ambiente glebas geomapa.',
      ateste: cfg.txt_ateste ||
        'Fica dado ciência sobre o acompanhamento técnico da ASTEC/ATNI ao longo do contrato objeto do projeto ao imóvel beneficiado, com fins de produção de laudos, levantamento de execução de inversões financiadas, recomendações técnicas, eventuais prejuízos e demais ocorrências relevantes, inclusive eventuais irregularidades.',
    };

    const pdfBytes = await gerarProjeto(payload);

    const nomeCli  = (payload.cliente?.nome || 'projeto').replace(/\s+/g, '_');
    const nome     = `Projeto_${nomeCli}_${new Date().toISOString().slice(0,10)}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${nome}"`);
    res.setHeader('Content-Length', pdfBytes.length);
    res.send(Buffer.from(pdfBytes));

  } catch (e) {
    console.error('Erro gerarProjeto:', e);
    res.status(500).json({ erro: e.message });
  }
};

// ── LAUDO DE OPINIÃO DE SEMOVENTES ────────────────────────────────────────
exports.gerarLaudo = async (req, res) => {
  try {
    const payload = { ...req.body };

    // Injeta logomarca
    const logoRow = db.prepare("SELECT valor FROM config_sistema WHERE chave='logomarca_path'").get();
    if (logoRow?.valor && fs.existsSync(logoRow.valor)) {
      payload.logomarca_path = logoRow.valor;
    }

    // Injeta config da empresa
    const cfgRows = db.prepare("SELECT chave, valor FROM config_sistema").all();
    const cfg = {};
    for (const r of cfgRows) cfg[r.chave] = r.valor;
    payload.empresa = cfg;

    // Garante percentual_banco numérico (padrão 70)
    payload.percentual_banco = parseFloat(payload.percentual_banco || 70);

    // Carrega dados completos do imóvel do banco se tiver imovel.id mas faltar dados
    if (payload.imovel?.id && !payload.imovel?.nome) {
      try {
        const imRow = db.prepare('SELECT * FROM imoveis WHERE id = ?').get(payload.imovel.id);
        if (imRow) payload.imovel = { ...imRow };
      } catch(e) {}
    } else if (!payload.imovel?.id && payload.cliente?.id) {
      // Tenta buscar imóvel vinculado ao cliente
      try {
        const imRow = db.prepare('SELECT * FROM imoveis WHERE proprietario_id = ? LIMIT 1').get(payload.cliente.id);
        if (imRow) payload.imovel = { ...imRow };
      } catch(e) {}
    }

    // Se não vieram lotes no payload, busca semoventes do cliente no banco
    if (!payload.lotes || payload.lotes.length === 0) {
      const clienteId = payload.cliente?.id || payload.cliente_id;
      if (clienteId) {
        // Filtra por imóvel se informado
        let query, params;
        if (payload.imovel?.id) {
          query = `SELECT s.*, i.nome as imovel_nome, i.municipio
                   FROM semoventes s
                   LEFT JOIN imoveis i ON i.id = s.imovel_id
                   WHERE s.proprietario_id = ? AND s.imovel_id = ? AND s.ativo = 1
                   ORDER BY s.categoria`;
          params = [clienteId, payload.imovel.id];
        } else {
          query = `SELECT s.*, i.nome as imovel_nome, i.municipio
                   FROM semoventes s
                   LEFT JOIN imoveis i ON i.id = s.imovel_id
                   WHERE s.proprietario_id = ? AND s.ativo = 1
                   ORDER BY s.categoria`;
          params = [clienteId];
        }
        const rows = db.prepare(query).all(...params);
        payload.lotes = rows.map(r => ({
          categoria:      r.categoria,
          raca:           r.raca,
          cor:            r.cor,
          mesticagem:     r.mesticagem,
          pelagem:        r.cor || '',
          idade_meses:    r.idade_meses,
          quantidade:     parseInt(r.quantidade || 0),
          preco_unitario: parseFloat(r.preco_unitario || 0),
          valor_total:    parseInt(r.quantidade || 0) * parseFloat(r.preco_unitario || 0),
          marca_ferro:    r.marca_ferro,
          forma_local:    r.forma_local || 'À ferro e fogo no quarto posterior direito (QPD)',
          foto_ferro:     r.foto_ferro || null,
        }));
      }
    } else {
      // Garante que lotes vindos do frontend também tenham valor_total numérico
      payload.lotes = payload.lotes.map(l => ({
        ...l,
        quantidade:     parseInt(l.quantidade || 0),
        preco_unitario: parseFloat(l.preco_unitario || 0),
        valor_total:    parseInt(l.quantidade || 0) * parseFloat(l.preco_unitario || 0),
      }));
    }

    payload.hoje = new Date().toLocaleDateString('pt-BR');
    const pdfBytes = await gerarLaudo(payload);

    const nomeCli = (payload.cliente?.nome || 'cliente').replace(/\s+/g, '_');
    const nome    = `Laudo_Semoventes_${nomeCli}_${new Date().toISOString().slice(0,10)}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${nome}"`);
    res.setHeader('Content-Length', pdfBytes.length);
    res.send(Buffer.from(pdfBytes));

  } catch (e) {
    console.error('Erro gerarLaudo:', e);
    res.status(500).json({ erro: e.message });
  }
};

// ── CÁLCULO DE APASCENTAMENTO ─────────────────────────────────────────────
exports.gerarApascentamento = async (req, res) => {
  try {
    const payload = { ...req.body };

    const cfgRows = db.prepare("SELECT chave, valor FROM config_sistema").all();
    const cfg = {};
    for (const r of cfgRows) cfg[r.chave] = r.valor;
    payload.empresa = cfg;

    // Se não vieram categorias, monta automaticamente a partir dos semoventes do cliente
    if (!payload.categorias || payload.categorias.length === 0) {
      const clienteId = payload.cliente?.id || payload.cliente_id;
      if (clienteId) {
        const rows = db.prepare(
          `SELECT categoria, raca, mesticagem, idade_meses, quantidade, preco_unitario
           FROM semoventes WHERE proprietario_id = ? AND ativo = 1`
        ).all(clienteId);

        // UA por categoria (valores padrão do sistema)
        const UA_MAP = {
          'vaca': 0.86, 'boi': 1.2, 'bezerro': 0.46, 'bezerra': 0.4,
          'novilho': 0.66, 'novilha': 0.6, 'touro': 1.35, 'outro': 1.0,
        };
        payload.categorias = rows.map(r => {
          const chave = (r.categoria || '').toLowerCase().split(' ')[0];
          const ua_cat = UA_MAP[chave] || 1.0;
          const total = parseInt(r.quantidade || 0);
          return {
            nome:          r.categoria,
            existente:     total,
            novos:         0,
            idade:         r.idade_meses,
            total,
            ua_cat,
            ua_total:      parseFloat((total * ua_cat).toFixed(2)),
            preco_unitario: r.preco_unitario,
            valor_total:   (total * (r.preco_unitario || 0)),
          };
        });
      }
    }

    payload.hoje = new Date().toLocaleDateString('pt-BR');
    const pdfBytes = await gerarApascentamento(payload);

    const nomeCli = (payload.cliente?.nome || 'cliente').replace(/\s+/g, '_');
    const nome    = `Apascentamento_${nomeCli}_${new Date().toISOString().slice(0,10)}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${nome}"`);
    res.setHeader('Content-Length', pdfBytes.length);
    res.send(Buffer.from(pdfBytes));

  } catch (e) {
    console.error('Erro gerarApascentamento:', e);
    res.status(500).json({ erro: e.message });
  }
};

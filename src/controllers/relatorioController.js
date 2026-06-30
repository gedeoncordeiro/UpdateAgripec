'use strict';
const db = require('../database/db');
const { gerarRelatorio } = require('../utils/gerador_pdf');

exports.gerarRelatorioPDF = async (req, res) => {
  const tipo = req.params.tipo;
  const allowed = ['clientes', 'imoveis', 'semoventes'];
  if (!allowed.includes(tipo)) {
    return res.status(400).json({ erro: 'Tipo inválido' });
  }

  try {
    let rows;

    if (tipo === 'clientes') {
      rows = db.prepare(`
        SELECT nome, cpf, rg, estado_civil, telefone, email,
               endereco_cidade, endereco_uf
        FROM clientes WHERE ativo = 1 ORDER BY nome
      `).all();

    } else if (tipo === 'imoveis') {
      rows = db.prepare(`
        SELECT i.nome, i.area_total, i.municipio, i.uf, i.situacao,
               i.matricula, i.cri, c.nome AS proprietario_nome
        FROM imoveis i LEFT JOIN clientes c ON c.id = i.proprietario_id
        WHERE i.ativo = 1 ORDER BY i.nome
      `).all();

    } else {
      // semoventes — calcula valor_total em JS para garantir
      rows = db.prepare(`
        SELECT s.categoria, s.raca, s.cor, s.mesticagem, s.idade_meses,
               s.quantidade, s.preco_unitario,
               i.nome AS imovel_nome, s.marca_ferro
        FROM semoventes s
        LEFT JOIN imoveis i ON i.id = s.imovel_id
        WHERE s.ativo = 1
        ORDER BY s.categoria, s.raca
      `).all().map(r => ({
        ...r,
        valor_total: (r.quantidade || 0) * (r.preco_unitario || 0)
      }));
    }

    const pdfBytes = await gerarRelatorio({ tipo, rows });

    const nome = `relatorio_${tipo}_${new Date().toISOString().slice(0,10)}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${nome}"`);
    res.setHeader('Content-Length', pdfBytes.length);
    res.send(Buffer.from(pdfBytes));

  } catch (e) {
    console.error('Erro gerarRelatorioPDF:', e);
    res.status(500).json({ erro: e.message });
  }
};

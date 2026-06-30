const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const { auth, adminOnly } = require('../middleware/auth');
const ctrl = require('../controllers');

const router = express.Router();

const uploadDir = path.join(__dirname, '../../data/uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_, __, cb) => cb(null, uploadDir),
    filename: (_, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
  }),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    const ok = ['.pdf','.jpg','.jpeg','.png'].includes(path.extname(file.originalname).toLowerCase());
    cb(ok ? null : new Error('Tipo não permitido'), ok);
  },
});

router.post('/auth/login',    ctrl.login);
router.get ('/auth/me',       auth, ctrl.me);
router.get ('/auth/usuarios', auth, adminOnly, ctrl.listarUsuarios);
router.post('/auth/usuarios', auth, adminOnly, ctrl.criarUsuario);

router.get('/dashboard/resumo', auth, ctrl.resumo);

router.get   ('/clientes',          auth, ctrl.listarClientes);
router.get   ('/clientes/cpf/:cpf', auth, ctrl.buscarClientePorCPF);
router.get   ('/clientes/:id',      auth, ctrl.buscarCliente);
router.post  ('/clientes',          auth, ctrl.criarCliente);
router.put   ('/clientes/:id',      auth, ctrl.atualizarCliente);
router.delete('/clientes/:id',      auth, ctrl.removerCliente);

router.get   ('/imoveis/mapa', auth, ctrl.listarImoveisMapa); // ← ANTES de /imoveis/:id para evitar conflito de rota
router.get   ('/imoveis',      auth, ctrl.listarImoveis);
router.get   ('/imoveis/:id',  auth, ctrl.buscarImovel);
router.post  ('/imoveis',      auth, upload.single('documento'), ctrl.criarImovel);
router.put   ('/imoveis/:id',  auth, upload.single('documento'), ctrl.atualizarImovel);
router.delete('/imoveis/:id',  auth, ctrl.removerImovel);

router.get   ('/semoventes',                   auth, ctrl.listarSemoventes);
router.get   ('/semoventes/resumo/categorias', auth, ctrl.resumoSemoventes);
router.post  ('/semoventes',                   auth, ctrl.criarSemovente);
router.put   ('/semoventes/:id',               auth, ctrl.atualizarSemovente);
router.delete('/semoventes/:id',               auth, ctrl.removerSemovente);

// Projeto – gera PDF
const projetoCtrl = require('../controllers/projetoController');
router.post('/projeto/gerar', auth, projetoCtrl.gerarProjeto);
router.post('/laudo/gerar',        auth, projetoCtrl.gerarLaudo);
router.post('/apascentamento/gerar', auth, projetoCtrl.gerarApascentamento);

// Projetos salvos – CRUD
const projetosCtrl = require('../controllers/projetosController');
router.get   ('/projetos',     auth, projetosCtrl.listar);
router.get   ('/projetos/:id', auth, projetosCtrl.buscar);
router.post  ('/projetos',     auth, projetosCtrl.criar);
router.put   ('/projetos/:id', auth, projetosCtrl.atualizar);
router.delete('/projetos/:id', auth, projetosCtrl.remover);

// Orçamentos – CRUD
const orcamentosCtrl = require('../controllers/orcamentosController');
router.get   ('/orcamentos',     auth, orcamentosCtrl.listar);
router.get   ('/orcamentos/:id', auth, orcamentosCtrl.buscar);
router.post  ('/orcamentos',     auth, orcamentosCtrl.criar);
router.put   ('/orcamentos/:id', auth, orcamentosCtrl.atualizar);
router.delete('/orcamentos/:id', auth, orcamentosCtrl.remover);

// Relatórios – exporta PDF por tipo (clientes / imoveis / semoventes)
const relatorioCtrl = require('../controllers/relatorioController');
router.get('/relatorios/pdf/:tipo', auth, relatorioCtrl.gerarRelatorioPDF);

// Documentos do imóvel (certidões, CAR, CCIR, ITR, etc.)
const docCtrl = require('../controllers/documentosController');

const uploadDocs = multer({
  storage: multer.diskStorage({
    destination: (_, __, cb) => {
      const dir = path.join(__dirname, '../../data/documentos');
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (_, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `doc_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`);
    },
  }),
  limits: { fileSize: 30 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    const ok = ['.pdf','.jpg','.jpeg','.png'].includes(path.extname(file.originalname).toLowerCase());
    cb(ok ? null : new Error('Tipo não permitido'), ok);
  },
});

const uploadLogo = multer({
  storage: multer.diskStorage({
    destination: (_, __, cb) => {
      const dir = path.join(__dirname, '../../data/config');
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (_, __, cb) => cb(null, `logomarca_${Date.now()}${path.extname(__.originalname)}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    const ok = ['.jpg','.jpeg','.png','.gif','.webp'].includes(path.extname(file.originalname).toLowerCase());
    cb(ok ? null : new Error('Apenas imagens são permitidas'), ok);
  },
});

router.get   ('/imoveis/:imovel_id/documentos',      auth, docCtrl.listarDocumentos);
router.post  ('/imoveis/:imovel_id/documentos',      auth, uploadDocs.single('arquivo'), docCtrl.adicionarDocumento);
router.delete('/documentos/:id',                     auth, docCtrl.removerDocumento);
router.get   ('/documentos/:id/download',            auth, docCtrl.downloadDocumento);

// Configuração do sistema
router.get ('/config',             auth, docCtrl.getConfig);
router.post('/config',             auth, adminOnly, docCtrl.salvarConfig);
router.post('/config/logomarca',   auth, adminOnly, uploadLogo.single('logomarca'), docCtrl.uploadLogomarca);
router.get ('/config/logomarca',   docCtrl.getLogomarca);


// ── BACKUP ───────────────────────────────────────────────────────────────
const backupCtrl = require('../controllers/backupController');
const backupUpload = multer({
  storage: multer.diskStorage({
    destination: (_, __, cb) => {
      const dir = path.join(__dirname, '../../data/tmp');
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (_, __, cb) => cb(null, `backup_import_${Date.now()}.zip`),
  }),
  limits: { fileSize: 500 * 1024 * 1024 },
});
router.get ('/backup/exportar', auth, backupCtrl.exportar);
router.post('/backup/importar', auth, adminOnly, backupUpload.single('backup'), backupCtrl.importar);

// ── LINKS ÚTEIS ─────────────────────────────────────────────────────────
const linksCtrl = require('../controllers/linksController');
router.get   ('/links',     auth, linksCtrl.listar);
router.post  ('/links',     auth, linksCtrl.criar);
router.put   ('/links/:id', auth, linksCtrl.atualizar);
router.delete('/links/:id', auth, linksCtrl.remover);

// ── UPDATE ONLINE ────────────────────────────────────────────────────────
const updateCtrl = require('../controllers/updateController');
router.get   ('/update/check',      auth, adminOnly, updateCtrl.check);
router.post  ('/update/baixar',     auth, adminOnly, updateCtrl.baixar);
router.post  ('/update/aplicar',    auth, adminOnly, updateCtrl.aplicar);
router.post  ('/update/rollback',   auth, adminOnly, updateCtrl.rollback);
router.get   ('/update/versoes',    auth, updateCtrl.historico);
router.get   ('/update/config',     auth, adminOnly, updateCtrl.getConfig);
router.post  ('/update/config',     auth, adminOnly, updateCtrl.config);

module.exports = router;

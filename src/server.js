const express = require('express');
const path    = require('path');
const { exec } = require('child_process');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, '../data/uploads')));
app.use('/api', require('./routes'));
app.use(express.static(path.join(__dirname, '../public')));

app.get('*', (req, res) => {
  if (!req.path.startsWith('/api'))
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║       🌾 AgroGestão - Sistema Rural       ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log(`\n[OK] Rodando em: http://localhost:${PORT}`);
  console.log('[DB] Banco:      data/agrogestao.db');
  console.log('[USR] Admin:    admin@agrogestao.com / admin123');
  console.log('[USR] Operador: operador@agrogestao.com / op123456');
  console.log('\n⚠️  Mantenha esta janela aberta.\n');

  const url = `http://localhost:${PORT}`;
  const cmd = process.platform === 'win32' ? `start ${url}`
    : process.platform === 'darwin' ? `open ${url}`
    : `xdg-open ${url}`;
  exec(cmd);
});

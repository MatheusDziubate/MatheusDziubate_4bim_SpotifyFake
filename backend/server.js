const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

if (!process.env.SESSION_SECRET) {
    throw new Error("❌ A variável de ambiente 'SESSION_SECRET' não está definida no arquivo backend/.env");
}

// Importa a funcao de consulta do banco
const { query } = require('./database');

// Importa as rotas
const loginRoutes = require('./routes/loginRoutes');
const usuarioRoutes = require('./routes/usuarioRoutes');
const perfilRoutes = require('./routes/perfilRoutes');
const artistaRoutes = require('./routes/artistaRoutes');
const musicaRoutes = require('./routes/musicaRoutes');
const catalogoRoutes = require('./routes/catalogoRoutes');
const curtidaRoutes = require('./routes/curtidaRoutes');
const playlistRoutes = require('./routes/playlistRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser(process.env.SESSION_SECRET));

// Arquivos estaticos: telas, capas/fotos e MP3
app.use('/frontend', express.static(path.join(__dirname, '../frontend')));
app.use('/imagens', express.static(path.join(__dirname, '../imagens')));
app.use('/musicas', express.static(path.join(__dirname, '../musicas')));

// Pagina inicial -> tela de login
app.get('/', (req, res) => res.redirect('/frontend/login/login.html'));

// Rotas da API
app.use('/login', loginRoutes);
app.use('/usuario', usuarioRoutes);
app.use('/perfil', perfilRoutes);
app.use('/artista', artistaRoutes);
app.use('/musica', musicaRoutes);
app.use('/catalogo', catalogoRoutes);
app.use('/curtida', curtidaRoutes);
app.use('/playlist', playlistRoutes);
app.use('/admin', adminRoutes);

// Erros do multer (arquivo grande demais etc.)
app.use((err, req, res, next) => {
    if (err && err.name === 'MulterError') {
        const msg = err.code === 'LIMIT_FILE_SIZE' ? 'Arquivo muito grande.' : 'Erro no envio do arquivo.';
        return res.status(400).json({ sucesso: false, mensagem: msg });
    }
    console.error(err);
    res.status(500).json({ sucesso: false, mensagem: 'Erro interno do servidor.' });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, async () => {
    console.log(`\n=================================`);
    console.log(`🚀 Servidor executando na porta ${PORT}`);
    console.log(`🌐 Acesse: http://localhost:${PORT}`);

    try {
        await query('SELECT 1');
        console.log(`✅ Banco de Dados ${process.env.DB_NAME} conectado com sucesso!`);
    } catch (error) {
        console.error(`❌ FALHA NA CONEXÃO COM O BANCO DE DADOS:`);
        console.error(`   Motivo: ${error.message}`);
        console.error(`👉 Ajuste o arquivo backend/.env com a senha correta do seu PostgreSQL.`);
    }
    console.log(`=================================\n`);
    const { exec } = require('child_process');

exec('start http://localhost:3001/');
});

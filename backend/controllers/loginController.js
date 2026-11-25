const bcrypt = require('bcryptjs');
const { query } = require('../database');

const OPCOES_COOKIE = {
    signed: true,      // assinado com SESSION_SECRET (nao da para adulterar)
    httpOnly: true,    // o JavaScript do navegador nao le o cookie
    sameSite: 'lax',
    maxAge: 8 * 60 * 60 * 1000 // 8 horas
};

// O unico administrador do sistema e o usuario chamado "admin"
function ehAdmin(nome) {
    return String(nome).trim().toLowerCase() === 'admin';
}

// POST /login  { nome, senha }  (nome pode ser o nome de usuario ou o email)
exports.login = async (req, res) => {
    try {
        const { nome, senha } = req.body;
        if (!nome || !senha) {
            return res.status(400).json({ sucesso: false, mensagem: 'Preencha todos os campos!' });
        }

        const result = await query(
            `SELECT id_usuario, nome_usuario, senha_usuario
               FROM public.usuario
              WHERE LOWER(nome_usuario) = LOWER($1) OR LOWER(email_usuario) = LOWER($1)
              ORDER BY (LOWER(nome_usuario) = LOWER($1)) DESC
              LIMIT 1`,
            [nome.trim()]
        );

        const usuario = result.rows[0];
        const senhaOk = usuario ? await bcrypt.compare(senha, usuario.senha_usuario) : false;
        if (!senhaOk) {
            return res.status(401).json({ sucesso: false, mensagem: 'Usuário ou senha incorretos!' });
        }

        const admin = ehAdmin(usuario.nome_usuario);
        // Admin ainda precisa escolher o modo (usuario ou admin). Os demais entram como usuario.
        const sessao = {
            id: usuario.id_usuario,
            nome: usuario.nome_usuario,
            admin,
            modo: admin ? null : 'usuario'
        };
        res.cookie('sessao', sessao, OPCOES_COOKIE);
        res.json({ sucesso: true, mensagem: 'Login realizado!', usuario: { id: sessao.id, nome: sessao.nome, admin } });
    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({ sucesso: false, mensagem: 'Erro no servidor.' });
    }
};

// POST /login/modo  { modo: 'usuario' | 'admin' }  (so o admin escolhe)
exports.escolherModo = (req, res) => {
    const { modo } = req.body;
    if (modo !== 'usuario' && modo !== 'admin') {
        return res.status(400).json({ sucesso: false, mensagem: 'Modo inválido.' });
    }
    if (modo === 'admin' && !req.usuario.admin) {
        return res.status(403).json({ sucesso: false, mensagem: 'Acesso restrito ao administrador.' });
    }
    res.cookie('sessao', { ...req.usuario, modo }, OPCOES_COOKIE);
    res.json({ sucesso: true, modo });
};

// GET /login/me  -> quem esta logado
exports.me = (req, res) => {
    const { id, nome, admin, modo } = req.usuario;
    res.json({ sucesso: true, usuario: { id, nome, admin, modo } });
};

// POST /login/logout
exports.logout = (req, res) => {
    res.clearCookie('sessao', { signed: true, httpOnly: true, sameSite: 'lax' });
    res.json({ sucesso: true, mensagem: 'Logout realizado.' });
};

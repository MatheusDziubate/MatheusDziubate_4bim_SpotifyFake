const bcrypt = require('bcryptjs');
const { query } = require('../database');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Nunca devolvemos a senha (nem o hash) para o navegador
function semSenha(u) {
    if (!u) return u;
    const { senha_usuario, ...resto } = u;
    return resto;
}

function mensagemDuplicado(error) {
    if (error.constraint === 'usuario_email_unique') return 'Já existe um usuário com esse email.';
    if (error.constraint === 'usuario_pkey') return 'Já existe um usuário com esse ID.';
    return 'Já existe um usuário com esse nome.';
}

// ---------- CADASTRO PUBLICO (tela de cadastro) ----------
// POST /usuario/cadastro  { nome, email, senha }
exports.cadastrar = async (req, res) => {
    try {
        const nome = String(req.body.nome || '').trim();
        const email = String(req.body.email || '').trim();
        const senha = String(req.body.senha || '');

        if (!nome || !email || !senha) {
            return res.status(400).json({ sucesso: false, mensagem: 'Preencha todos os campos!' });
        }
        if (nome.length < 3 || nome.length > 100) {
            return res.status(400).json({ sucesso: false, mensagem: 'O nome deve ter entre 3 e 100 caracteres.' });
        }
        if (nome.toLowerCase() === 'admin') {
            return res.status(400).json({ sucesso: false, mensagem: 'Esse nome de usuário não pode ser usado.' });
        }
        if (!EMAIL_REGEX.test(email)) {
            return res.status(400).json({ sucesso: false, mensagem: 'Formato de email inválido.' });
        }
        if (senha.length < 6) {
            return res.status(400).json({ sucesso: false, mensagem: 'A senha deve ter pelo menos 6 caracteres!' });
        }

        const hash = await bcrypt.hash(senha, 10);
        await query(
            'INSERT INTO public.usuario (nome_usuario, email_usuario, senha_usuario) VALUES ($1, $2, $3)',
            [nome, email, hash]
        );
        res.status(201).json({ sucesso: true, mensagem: 'Cadastro realizado com sucesso!' });
    } catch (error) {
        console.error('Erro no cadastro:', error);
        if (error.code === '23505') {
            return res.status(400).json({ sucesso: false, mensagem: mensagemDuplicado(error) });
        }
        res.status(500).json({ sucesso: false, mensagem: 'Erro ao cadastrar usuário.' });
    }
};

// ---------- CRUD (somente admin) ----------
exports.listarUsuarios = async (req, res) => {
    try {
        // LEFT JOIN: traz o perfil (e a foto) de cada usuario, se existir (relacionamento 1:1)
        const result = await query(`
            SELECT u.*, p.id_perfil, p.nome_exibicao_perfil, p.foto_perfil
              FROM public.usuario u
              LEFT JOIN public.perfil p ON p.usuario_id_usuario = u.id_usuario
             ORDER BY u.id_usuario`);
        res.json({ sucesso: true, usuarios: result.rows.map(semSenha) });
    } catch (error) {
        console.error('Erro ao listar usuarios:', error);
        res.status(500).json({ sucesso: false, mensagem: 'Erro ao listar usuarios.' });
    }
};

exports.obterUsuario = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) {
            return res.status(400).json({ sucesso: false, mensagem: 'ID inválido.' });
        }
        const result = await query('SELECT * FROM public.usuario WHERE id_usuario = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ sucesso: false, mensagem: 'Usuário não encontrado.' });
        }
        res.json({ sucesso: true, usuario: semSenha(result.rows[0]) });
    } catch (error) {
        console.error('Erro ao obter usuario:', error);
        res.status(500).json({ sucesso: false, mensagem: 'Erro interno do servidor.' });
    }
};

exports.criarUsuario = async (req, res) => {
    try {
        const { id_usuario, nome_usuario, email_usuario, senha_usuario, data_criacao_usuario } = req.body;

        if (!nome_usuario || !email_usuario || !senha_usuario) {
            return res.status(400).json({ sucesso: false, mensagem: 'Nome, email e senha são obrigatórios.' });
        }
        if (!EMAIL_REGEX.test(email_usuario)) {
            return res.status(400).json({ sucesso: false, mensagem: 'Formato de email inválido.' });
        }

        const hash = await bcrypt.hash(senha_usuario, 10);
        const sql = `
            INSERT INTO public.usuario (id_usuario, nome_usuario, email_usuario, senha_usuario, data_criacao_usuario)
            VALUES (COALESCE($1, nextval('public.usuario_id_usuario_seq')), $2, $3, $4, COALESCE($5, CURRENT_DATE))
            RETURNING *
        `;
        const result = await query(sql, [id_usuario || null, nome_usuario, email_usuario, hash, data_criacao_usuario || null]);
        res.status(201).json({ sucesso: true, mensagem: 'Usuário inserido com sucesso!', usuario: semSenha(result.rows[0]) });
    } catch (error) {
        console.error('Erro ao criar usuario:', error);
        if (error.code === '23505') {
            return res.status(400).json({ sucesso: false, mensagem: mensagemDuplicado(error) });
        }
        res.status(500).json({ sucesso: false, mensagem: 'Erro ao inserir usuário no banco de dados.' });
    }
};

// Senha em branco = manter a senha atual
exports.atualizarUsuario = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const { nome_usuario, email_usuario, senha_usuario, data_criacao_usuario } = req.body;

        if (!nome_usuario || !email_usuario) {
            return res.status(400).json({ sucesso: false, mensagem: 'Nome e email são obrigatórios.' });
        }
        if (!EMAIL_REGEX.test(email_usuario)) {
            return res.status(400).json({ sucesso: false, mensagem: 'Formato de email inválido.' });
        }

        const novoHash = senha_usuario ? await bcrypt.hash(senha_usuario, 10) : null;
        const sql = `
            UPDATE public.usuario
            SET nome_usuario = $1,
                email_usuario = $2,
                senha_usuario = COALESCE($3, senha_usuario),
                data_criacao_usuario = COALESCE($4, data_criacao_usuario)
            WHERE id_usuario = $5
            RETURNING *
        `;
        const result = await query(sql, [nome_usuario, email_usuario, novoHash, data_criacao_usuario || null, id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ sucesso: false, mensagem: 'Usuário não encontrado.' });
        }
        res.json({ sucesso: true, mensagem: 'Usuário alterado com sucesso!', usuario: semSenha(result.rows[0]) });
    } catch (error) {
        console.error('Erro ao atualizar usuario:', error);
        if (error.code === '23505') {
            return res.status(400).json({ sucesso: false, mensagem: mensagemDuplicado(error) });
        }
        res.status(500).json({ sucesso: false, mensagem: 'Erro ao atualizar usuário.' });
    }
};

exports.deletarUsuario = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);

        // O admin nao pode ser excluido (ele e o unico que gerencia o sistema)
        const alvo = await query('SELECT nome_usuario FROM public.usuario WHERE id_usuario = $1', [id]);
        if (alvo.rows.length && alvo.rows[0].nome_usuario.toLowerCase() === 'admin') {
            return res.status(400).json({ sucesso: false, mensagem: 'O usuário admin não pode ser excluído.' });
        }

        const result = await query('DELETE FROM public.usuario WHERE id_usuario = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ sucesso: false, mensagem: 'Usuário não encontrado.' });
        }
        res.json({ sucesso: true, mensagem: 'Usuário excluído com sucesso!' });
    } catch (error) {
        console.error('Erro ao deletar usuario:', error);
        if (error.code === '23503') {
            return res.status(400).json({ sucesso: false, mensagem: 'Não é possível excluir: este usuário possui um perfil vinculado. Exclua o perfil primeiro.' });
        }
        res.status(500).json({ sucesso: false, mensagem: 'Erro ao excluir usuário.' });
    }
};

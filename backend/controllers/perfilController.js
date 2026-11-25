const { query } = require('../database');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Aceita somente links http/https para a foto
function linkValido(texto) {
    try {
        const u = new URL(String(texto).trim());
        return (u.protocol === 'http:' || u.protocol === 'https:') && String(texto).trim().length <= 500;
    } catch (e) {
        return false;
    }
}

// Listar todos os perfis (com o nome do usuario, via JOIN - relacionamento 1:1)
exports.listarPerfis = async (req, res) => {
    try {
        const sql = `
            SELECT p.*, u.nome_usuario, u.email_usuario
            FROM public.perfil p
            JOIN public.usuario u ON u.id_usuario = p.usuario_id_usuario
            ORDER BY p.id_perfil
        `;
        const result = await query(sql);
        res.json({ sucesso: true, perfis: result.rows });
    } catch (error) {
        console.error('Erro ao listar perfis:', error);
        res.status(500).json({ sucesso: false, mensagem: 'Erro ao listar perfis.' });
    }
};

// Obter perfil por ID
exports.obterPerfil = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) {
            return res.status(400).json({ sucesso: false, mensagem: 'ID inválido.' });
        }

        const result = await query('SELECT * FROM public.perfil WHERE id_perfil = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ sucesso: false, mensagem: 'Perfil não encontrado.' });
        }

        res.json({ sucesso: true, perfil: result.rows[0] });
    } catch (error) {
        console.error('Erro ao obter perfil:', error);
        res.status(500).json({ sucesso: false, mensagem: 'Erro interno do servidor.' });
    }
};

// Criar perfil (cada usuario so pode ter 1 perfil - relacionamento 1:1)
exports.criarPerfil = async (req, res) => {
    try {
        const { id_perfil, usuario_id_usuario, nome_exibicao_perfil, bio_perfil, data_nascimento_perfil } = req.body;
        const foto = String(req.body.foto_perfil || '').trim();

        if (!usuario_id_usuario || !nome_exibicao_perfil) {
            return res.status(400).json({ sucesso: false, mensagem: 'Usuário e nome de exibição são obrigatórios.' });
        }
        if (foto && !linkValido(foto)) {
            return res.status(400).json({ sucesso: false, mensagem: 'O link da foto é inválido (use um link http:// ou https://).' });
        }

        const sql = `
            INSERT INTO public.perfil (id_perfil, usuario_id_usuario, nome_exibicao_perfil, bio_perfil, data_nascimento_perfil, foto_perfil)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `;
        const values = [id_perfil, usuario_id_usuario, nome_exibicao_perfil, bio_perfil || null, data_nascimento_perfil || null, foto || null];

        const result = await query(sql, values);
        res.status(201).json({ sucesso: true, mensagem: 'Perfil inserido com sucesso!', perfil: result.rows[0] });
    } catch (error) {
        console.error('Erro ao criar perfil:', error);
        if (error.code === '23505') {
            return res.status(400).json({ sucesso: false, mensagem: 'Este usuário já possui um perfil cadastrado (relacionamento 1:1).' });
        }
        if (error.code === '23503') {
            return res.status(400).json({ sucesso: false, mensagem: 'O usuário informado não existe no cadastro.' });
        }
        res.status(500).json({ sucesso: false, mensagem: 'Erro ao inserir perfil no banco de dados.' });
    }
};

// Atualizar perfil
exports.atualizarPerfil = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const { usuario_id_usuario, nome_exibicao_perfil, bio_perfil, data_nascimento_perfil } = req.body;
        const foto = String(req.body.foto_perfil || '').trim();

        if (foto && !linkValido(foto)) {
            return res.status(400).json({ sucesso: false, mensagem: 'O link da foto é inválido (use um link http:// ou https://).' });
        }

        // foto em branco = manter a foto atual
        const sql = `
            UPDATE public.perfil
            SET usuario_id_usuario = $1,
                nome_exibicao_perfil = $2,
                bio_perfil = $3,
                data_nascimento_perfil = $4,
                foto_perfil = COALESCE($6, foto_perfil)
            WHERE id_perfil = $5
            RETURNING *
        `;
        const values = [usuario_id_usuario, nome_exibicao_perfil, bio_perfil || null, data_nascimento_perfil || null, id, foto || null];

        const result = await query(sql, values);
        if (result.rows.length === 0) {
            return res.status(404).json({ sucesso: false, mensagem: 'Perfil não encontrado.' });
        }

        res.json({ sucesso: true, mensagem: 'Perfil alterado com sucesso!', perfil: result.rows[0] });
    } catch (error) {
        console.error('Erro ao atualizar perfil:', error);
        if (error.code === '23505') {
            return res.status(400).json({ sucesso: false, mensagem: 'Este usuário já possui outro perfil cadastrado.' });
        }
        if (error.code === '23503') {
            return res.status(400).json({ sucesso: false, mensagem: 'O usuário informado não existe no cadastro.' });
        }
        res.status(500).json({ sucesso: false, mensagem: 'Erro ao atualizar perfil.' });
    }
};

// Upload e salvamento da foto de perfil com Sharp
exports.uploadImagem = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) {
            return res.status(400).json({ sucesso: false, mensagem: 'ID inválido.' });
        }
        if (!req.file) {
            return res.status(400).json({ sucesso: false, mensagem: 'Nenhum arquivo enviado.' });
        }

        const pastaImagens = path.join(__dirname, '../../imagens');
        if (!fs.existsSync(pastaImagens)) {
            fs.mkdirSync(pastaImagens, { recursive: true });
        }

        const caminhoDestino = path.join(pastaImagens, `perfil_${id}.png`);

        await sharp(req.file.buffer)
            .resize(300, 300, { fit: 'cover' })
            .toFormat('png')
            .toFile(caminhoDestino);

        await query('UPDATE public.perfil SET foto_perfil = $1 WHERE id_perfil = $2',
            [`imagens/perfil_${id}.png`, id]);

        res.json({ sucesso: true, mensagem: 'Foto de perfil salva com sucesso!' });
    } catch (error) {
        console.error('Erro ao salvar foto de perfil:', error);
        res.status(500).json({ sucesso: false, mensagem: 'Erro ao processar imagem.' });
    }
};

// Deletar perfil
exports.deletarPerfil = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);

        const result = await query('DELETE FROM public.perfil WHERE id_perfil = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ sucesso: false, mensagem: 'Perfil não encontrado.' });
        }

        const imgPath = path.join(__dirname, '../../imagens', `perfil_${id}.png`);
        if (fs.existsSync(imgPath)) {
            fs.unlinkSync(imgPath);
        }

        res.json({ sucesso: true, mensagem: 'Perfil excluído com sucesso!' });
    } catch (error) {
        console.error('Erro ao deletar perfil:', error);
        res.status(500).json({ sucesso: false, mensagem: 'Erro ao excluir perfil.' });
    }
};

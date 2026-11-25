const { query } = require('../database');

// GET /curtida/listar -> músicas curtidas por quem está logado (as mais recentes primeiro)
exports.listarCurtidas = async (req, res) => {
    try {
        const result = await query(
            `SELECT m.id_musica, m.titulo_musica, m.genero_musica, m.duracao_musica,
                    m.arquivo_musica, m.capa_musica, m.artista_id_artista, a.nome_artista
               FROM public.curtida c
               JOIN public.musica m ON m.id_musica = c.musica_id_musica
               JOIN public.artista a ON a.id_artista = m.artista_id_artista
              WHERE c.usuario_id_usuario = $1
              ORDER BY c.data_curtida DESC, m.id_musica DESC`,
            [req.usuario.id]);
        res.json({ sucesso: true, musicas: result.rows });
    } catch (error) {
        console.error('Erro ao listar curtidas:', error);
        res.status(500).json({ sucesso: false, mensagem: 'Erro ao listar músicas curtidas.' });
    }
};

// POST /curtida/:idMusica -> curtir (se já curtiu, não faz nada)
exports.curtir = async (req, res) => {
    try {
        const idMusica = parseInt(req.params.idMusica, 10);
        if (isNaN(idMusica)) return res.status(400).json({ sucesso: false, mensagem: 'ID inválido.' });

        await query(
            `INSERT INTO public.curtida (usuario_id_usuario, musica_id_musica)
             VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [req.usuario.id, idMusica]);
        res.status(201).json({ sucesso: true, curtida: true });
    } catch (error) {
        if (error.code === '23503') {
            return res.status(404).json({ sucesso: false, mensagem: 'Música não encontrada.' });
        }
        console.error('Erro ao curtir:', error);
        res.status(500).json({ sucesso: false, mensagem: 'Erro ao curtir a música.' });
    }
};

// DELETE /curtida/:idMusica -> descurtir
exports.descurtir = async (req, res) => {
    try {
        const idMusica = parseInt(req.params.idMusica, 10);
        if (isNaN(idMusica)) return res.status(400).json({ sucesso: false, mensagem: 'ID inválido.' });

        await query(
            'DELETE FROM public.curtida WHERE usuario_id_usuario = $1 AND musica_id_musica = $2',
            [req.usuario.id, idMusica]);
        res.json({ sucesso: true, curtida: false });
    } catch (error) {
        console.error('Erro ao descurtir:', error);
        res.status(500).json({ sucesso: false, mensagem: 'Erro ao descurtir a música.' });
    }
};

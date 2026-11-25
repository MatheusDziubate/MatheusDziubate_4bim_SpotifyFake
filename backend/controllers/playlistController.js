const { query } = require('../database');

const MAX_PLAYLISTS = 50;

function nomeValido(nome) {
    const n = String(nome || '').trim();
    return n.length >= 1 && n.length <= 100 ? n : null;
}

// Confere se a playlist existe E é de quem está logado
async function minhaPlaylist(idPlaylist, idUsuario) {
    const r = await query(
        `SELECT id_playlist, nome_playlist, data_criacao_playlist
           FROM public.playlist WHERE id_playlist = $1 AND usuario_id_usuario = $2`,
        [idPlaylist, idUsuario]);
    return r.rows[0] || null;
}

const SQL_MUSICAS_DA_PLAYLIST = `
    SELECT m.id_musica, m.titulo_musica, m.genero_musica, m.duracao_musica,
           m.arquivo_musica, m.capa_musica, m.artista_id_artista, a.nome_artista
      FROM public.playlist_musica pm
      JOIN public.musica m ON m.id_musica = pm.musica_id_musica
      JOIN public.artista a ON a.id_artista = m.artista_id_artista
     WHERE pm.playlist_id_playlist = $1
     ORDER BY pm.data_adicao, m.id_musica`;

// GET /playlist/listar -> minhas playlists (com total de músicas e até 4 capas)
exports.listarPlaylists = async (req, res) => {
    try {
        const r = await query(
            `SELECT p.id_playlist, p.nome_playlist,
                    (SELECT COUNT(*) FROM public.playlist_musica pm
                      WHERE pm.playlist_id_playlist = p.id_playlist)::int AS total_musicas,
                    ARRAY(SELECT m.capa_musica FROM public.playlist_musica pm
                            JOIN public.musica m ON m.id_musica = pm.musica_id_musica
                           WHERE pm.playlist_id_playlist = p.id_playlist
                           ORDER BY pm.data_adicao, m.id_musica LIMIT 4) AS capas
               FROM public.playlist p
              WHERE p.usuario_id_usuario = $1
              ORDER BY p.id_playlist`,
            [req.usuario.id]);
        res.json({ sucesso: true, playlists: r.rows });
    } catch (error) {
        console.error('Erro ao listar playlists:', error);
        res.status(500).json({ sucesso: false, mensagem: 'Erro ao listar playlists.' });
    }
};

// GET /playlist/:id -> a playlist e suas músicas
exports.obterPlaylist = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) return res.status(400).json({ sucesso: false, mensagem: 'ID inválido.' });
        const playlist = await minhaPlaylist(id, req.usuario.id);
        if (!playlist) return res.status(404).json({ sucesso: false, mensagem: 'Playlist não encontrada.' });
        const m = await query(SQL_MUSICAS_DA_PLAYLIST, [id]);
        res.json({ sucesso: true, playlist, musicas: m.rows });
    } catch (error) {
        console.error('Erro ao obter playlist:', error);
        res.status(500).json({ sucesso: false, mensagem: 'Erro ao abrir a playlist.' });
    }
};

// POST /playlist  { nome }
exports.criarPlaylist = async (req, res) => {
    try {
        const nome = nomeValido(req.body.nome);
        if (!nome) return res.status(400).json({ sucesso: false, mensagem: 'Dê um nome à playlist (até 100 letras).' });

        const total = await query('SELECT COUNT(*)::int AS n FROM public.playlist WHERE usuario_id_usuario = $1', [req.usuario.id]);
        if (total.rows[0].n >= MAX_PLAYLISTS) {
            return res.status(400).json({ sucesso: false, mensagem: `Limite de ${MAX_PLAYLISTS} playlists atingido.` });
        }
        const r = await query(
            `INSERT INTO public.playlist (usuario_id_usuario, nome_playlist)
             VALUES ($1, $2) RETURNING id_playlist, nome_playlist`,
            [req.usuario.id, nome]);
        res.status(201).json({ sucesso: true, playlist: { ...r.rows[0], total_musicas: 0, capas: [] } });
    } catch (error) {
        console.error('Erro ao criar playlist:', error);
        res.status(500).json({ sucesso: false, mensagem: 'Erro ao criar a playlist.' });
    }
};

// PUT /playlist/:id  { nome }
exports.renomearPlaylist = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const nome = nomeValido(req.body.nome);
        if (isNaN(id)) return res.status(400).json({ sucesso: false, mensagem: 'ID inválido.' });
        if (!nome) return res.status(400).json({ sucesso: false, mensagem: 'Dê um nome à playlist (até 100 letras).' });

        const r = await query(
            `UPDATE public.playlist SET nome_playlist = $1
              WHERE id_playlist = $2 AND usuario_id_usuario = $3 RETURNING id_playlist, nome_playlist`,
            [nome, id, req.usuario.id]);
        if (!r.rows.length) return res.status(404).json({ sucesso: false, mensagem: 'Playlist não encontrada.' });
        res.json({ sucesso: true, playlist: r.rows[0] });
    } catch (error) {
        console.error('Erro ao renomear playlist:', error);
        res.status(500).json({ sucesso: false, mensagem: 'Erro ao renomear a playlist.' });
    }
};

// DELETE /playlist/:id
exports.excluirPlaylist = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) return res.status(400).json({ sucesso: false, mensagem: 'ID inválido.' });
        const r = await query(
            'DELETE FROM public.playlist WHERE id_playlist = $1 AND usuario_id_usuario = $2 RETURNING id_playlist',
            [id, req.usuario.id]);
        if (!r.rows.length) return res.status(404).json({ sucesso: false, mensagem: 'Playlist não encontrada.' });
        res.json({ sucesso: true });
    } catch (error) {
        console.error('Erro ao excluir playlist:', error);
        res.status(500).json({ sucesso: false, mensagem: 'Erro ao excluir a playlist.' });
    }
};

// POST /playlist/:id/musica  { id_musica }
exports.adicionarMusica = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const idMusica = parseInt(req.body.id_musica, 10);
        if (isNaN(id) || isNaN(idMusica)) return res.status(400).json({ sucesso: false, mensagem: 'ID inválido.' });
        if (!(await minhaPlaylist(id, req.usuario.id))) {
            return res.status(404).json({ sucesso: false, mensagem: 'Playlist não encontrada.' });
        }
        const r = await query(
            `INSERT INTO public.playlist_musica (playlist_id_playlist, musica_id_musica)
             VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING musica_id_musica`,
            [id, idMusica]);
        res.status(r.rows.length ? 201 : 200).json({ sucesso: true, jaExistia: r.rows.length === 0 });
    } catch (error) {
        if (error.code === '23503') {
            return res.status(404).json({ sucesso: false, mensagem: 'Música não encontrada.' });
        }
        console.error('Erro ao adicionar musica na playlist:', error);
        res.status(500).json({ sucesso: false, mensagem: 'Erro ao adicionar à playlist.' });
    }
};

// DELETE /playlist/:id/musica/:idMusica
exports.removerMusica = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const idMusica = parseInt(req.params.idMusica, 10);
        if (isNaN(id) || isNaN(idMusica)) return res.status(400).json({ sucesso: false, mensagem: 'ID inválido.' });
        if (!(await minhaPlaylist(id, req.usuario.id))) {
            return res.status(404).json({ sucesso: false, mensagem: 'Playlist não encontrada.' });
        }
        await query(
            'DELETE FROM public.playlist_musica WHERE playlist_id_playlist = $1 AND musica_id_musica = $2',
            [id, idMusica]);
        res.json({ sucesso: true });
    } catch (error) {
        console.error('Erro ao remover musica da playlist:', error);
        res.status(500).json({ sucesso: false, mensagem: 'Erro ao remover da playlist.' });
    }
};

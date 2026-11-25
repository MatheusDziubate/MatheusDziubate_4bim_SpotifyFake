const { query } = require('../database');

// Nome que o sistema usa para músicas cujo artista ainda não foi informado
const ARTISTA_PADRAO = 'Artista não informado';

// GET /admin/estatisticas  (admin) -> números e rankings para o painel da tela inicial
exports.estatisticas = async (req, res) => {
    try {
        const [totais, maisCurtidas, artistasTop, generos, recentes] = await Promise.all([
            query(
                `SELECT
                    (SELECT COUNT(*) FROM public.usuario)::int AS usuarios,
                    (SELECT COUNT(*) FROM public.artista WHERE nome_artista <> $1)::int AS artistas,
                    (SELECT COUNT(*) FROM public.musica)::int AS musicas,
                    (SELECT COUNT(*) FROM public.playlist)::int AS playlists,
                    (SELECT COUNT(*) FROM public.curtida)::int AS curtidas,
                    (SELECT COUNT(*) FROM public.musica m
                       JOIN public.artista a ON a.id_artista = m.artista_id_artista
                      WHERE a.nome_artista = $1)::int AS musicas_sem_artista,
                    (SELECT COUNT(*) FROM public.artista a
                      WHERE a.nome_artista <> $1 AND a.foto_artista IS NULL
                        AND EXISTS (SELECT 1 FROM public.musica m WHERE m.artista_id_artista = a.id_artista))::int AS artistas_sem_foto`,
                [ARTISTA_PADRAO]),
            query(
                `SELECT m.id_musica, m.titulo_musica, m.capa_musica, a.nome_artista, COUNT(*)::int AS curtidas
                   FROM public.curtida c
                   JOIN public.musica m ON m.id_musica = c.musica_id_musica
                   JOIN public.artista a ON a.id_artista = m.artista_id_artista
                  GROUP BY m.id_musica, m.titulo_musica, m.capa_musica, a.nome_artista
                  ORDER BY curtidas DESC, m.titulo_musica
                  LIMIT 5`),
            query(
                `SELECT a.id_artista, a.nome_artista, a.foto_artista, COUNT(m.id_musica)::int AS musicas
                   FROM public.artista a
                   JOIN public.musica m ON m.artista_id_artista = a.id_artista
                  WHERE a.nome_artista <> $1
                  GROUP BY a.id_artista, a.nome_artista, a.foto_artista
                  ORDER BY musicas DESC, a.nome_artista
                  LIMIT 5`,
                [ARTISTA_PADRAO]),
            query(
                `SELECT COALESCE(NULLIF(TRIM(genero_musica), ''), 'Sem gênero') AS genero, COUNT(*)::int AS musicas
                   FROM public.musica
                  GROUP BY 1
                  ORDER BY musicas DESC, 1
                  LIMIT 6`),
            query(
                `SELECT m.id_musica, m.titulo_musica, m.capa_musica, a.nome_artista
                   FROM public.musica m
                   JOIN public.artista a ON a.id_artista = m.artista_id_artista
                  ORDER BY m.id_musica DESC
                  LIMIT 5`)
        ]);

        res.json({
            sucesso: true,
            totais: totais.rows[0],
            mais_curtidas: maisCurtidas.rows,
            artistas_top: artistasTop.rows,
            generos: generos.rows,
            recentes: recentes.rows
        });
    } catch (error) {
        console.error('Erro nas estatisticas do admin:', error);
        res.status(500).json({ sucesso: false, mensagem: 'Erro ao carregar o resumo.' });
    }
};

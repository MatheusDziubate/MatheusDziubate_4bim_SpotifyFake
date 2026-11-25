-- ============================================================
-- Migração do player (busca, perfil do artista, curtidas e playlists)
-- Para quem JÁ tem o banco criado: NÃO apaga nada, pode rodar mais de uma vez.
-- Execute no banco "spotifyfake" (pgAdmin > Query Tool). Depois: npm run popular
-- ============================================================

ALTER TABLE public.artista ADD COLUMN IF NOT EXISTS foto_artista VARCHAR(500);
ALTER TABLE public.artista ADD COLUMN IF NOT EXISTS bio_artista VARCHAR(500);

CREATE TABLE IF NOT EXISTS public.curtida (
    usuario_id_usuario INTEGER NOT NULL,
    musica_id_musica INTEGER NOT NULL,
    data_curtida TIMESTAMP DEFAULT NOW(),
    CONSTRAINT pk_curtida PRIMARY KEY (usuario_id_usuario, musica_id_musica),
    CONSTRAINT fk_curtida_usuario FOREIGN KEY (usuario_id_usuario) REFERENCES public.usuario (id_usuario) ON DELETE CASCADE,
    CONSTRAINT fk_curtida_musica FOREIGN KEY (musica_id_musica) REFERENCES public.musica (id_musica) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.playlist (
    id_playlist SERIAL PRIMARY KEY,
    usuario_id_usuario INTEGER NOT NULL,
    nome_playlist VARCHAR(100) NOT NULL,
    data_criacao_playlist DATE DEFAULT CURRENT_DATE,
    CONSTRAINT fk_playlist_usuario FOREIGN KEY (usuario_id_usuario) REFERENCES public.usuario (id_usuario) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.playlist_musica (
    playlist_id_playlist INTEGER NOT NULL,
    musica_id_musica INTEGER NOT NULL,
    data_adicao TIMESTAMP DEFAULT NOW(),
    CONSTRAINT pk_playlist_musica PRIMARY KEY (playlist_id_playlist, musica_id_musica),
    CONSTRAINT fk_pm_playlist FOREIGN KEY (playlist_id_playlist) REFERENCES public.playlist (id_playlist) ON DELETE CASCADE,
    CONSTRAINT fk_pm_musica FOREIGN KEY (musica_id_musica) REFERENCES public.musica (id_musica) ON DELETE CASCADE
);

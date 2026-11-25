-- ============================================================
-- SpotifyFake - 4º Bimestre - DW1 (PostgreSQL)
-- Autor: Matheus Dziubate - Turma M32 - 2026
-- DDL (CREATE TABLE) + carga inicial (INSERT, mínimo 10 por tabela)
-- Execute no banco "spotifyfake". ATENÇÃO: recria as tabelas (apaga os dados).
-- Depois, para encher o catálogo com artistas, músicas e fotos: npm run popular
-- Login de teste:  admin / 1234   |   demais usuários / 123456
-- (as senhas ficam salvas como hash bcrypt, nunca em texto puro)
-- ============================================================

DROP TABLE IF EXISTS public.playlist_musica CASCADE;
DROP TABLE IF EXISTS public.playlist CASCADE;
DROP TABLE IF EXISTS public.curtida CASCADE;
DROP TABLE IF EXISTS public.perfil CASCADE;
DROP TABLE IF EXISTS public.musica CASCADE;
DROP TABLE IF EXISTS public.artista CASCADE;
DROP TABLE IF EXISTS public.usuario CASCADE;

-- Tabela independente: usuario  (o único administrador é o usuário "admin")
CREATE TABLE public.usuario (
    id_usuario SERIAL PRIMARY KEY,
    nome_usuario VARCHAR(100) NOT NULL,
    email_usuario VARCHAR(100) NOT NULL,
    senha_usuario VARCHAR(100) NOT NULL,
    data_criacao_usuario DATE DEFAULT CURRENT_DATE,
    CONSTRAINT usuario_email_unique UNIQUE (email_usuario)
);
CREATE UNIQUE INDEX usuario_nome_unique ON public.usuario (LOWER(nome_usuario));

-- Tabela independente: artista
CREATE TABLE public.artista (
    id_artista SERIAL PRIMARY KEY,
    nome_artista VARCHAR(100) NOT NULL,
    genero_artista VARCHAR(50),
    pais_artista VARCHAR(50),
    foto_artista VARCHAR(500),   -- link http(s) da foto (opcional; sem foto aparece a silhueta)
    bio_artista VARCHAR(500)     -- texto curto do perfil do artista (opcional)
);

-- Relacionamento 1:1 com usuario (UNIQUE na chave estrangeira)
CREATE TABLE public.perfil (
    id_perfil SERIAL PRIMARY KEY,
    usuario_id_usuario INTEGER NOT NULL,
    nome_exibicao_perfil VARCHAR(100) NOT NULL,
    bio_perfil VARCHAR(255),
    data_nascimento_perfil DATE,
    foto_perfil VARCHAR(500),   -- caminho local (imagens/perfil_1.png) ou link http(s)
    CONSTRAINT perfil_usuario_unique UNIQUE (usuario_id_usuario),
    CONSTRAINT fk_perfil_usuario FOREIGN KEY (usuario_id_usuario) REFERENCES public.usuario (id_usuario)
);

-- Relacionamento 1:N com artista (um artista -> várias músicas)
CREATE TABLE public.musica (
    id_musica SERIAL PRIMARY KEY,
    titulo_musica VARCHAR(150) NOT NULL,
    genero_musica VARCHAR(50),
    duracao_musica INTEGER,
    arquivo_musica VARCHAR(500),   -- ex.: musicas/musica_1.mp3 ou link http(s) do MP3
    capa_musica VARCHAR(500),      -- ex.: imagens/musica_1.png ou link http(s) da capa
    artista_id_artista INTEGER NOT NULL,
    CONSTRAINT fk_musica_artista FOREIGN KEY (artista_id_artista) REFERENCES public.artista (id_artista)
);


-- ------------------------------------------------------------
-- Player: músicas curtidas e playlists (cada usuário tem as suas)
-- ------------------------------------------------------------
-- N:N usuario <-> musica (músicas curtidas)
CREATE TABLE public.curtida (
    usuario_id_usuario INTEGER NOT NULL,
    musica_id_musica INTEGER NOT NULL,
    data_curtida TIMESTAMP DEFAULT NOW(),
    CONSTRAINT pk_curtida PRIMARY KEY (usuario_id_usuario, musica_id_musica),
    CONSTRAINT fk_curtida_usuario FOREIGN KEY (usuario_id_usuario) REFERENCES public.usuario (id_usuario) ON DELETE CASCADE,
    CONSTRAINT fk_curtida_musica FOREIGN KEY (musica_id_musica) REFERENCES public.musica (id_musica) ON DELETE CASCADE
);

-- 1:N usuario -> playlist
CREATE TABLE public.playlist (
    id_playlist SERIAL PRIMARY KEY,
    usuario_id_usuario INTEGER NOT NULL,
    nome_playlist VARCHAR(100) NOT NULL,
    data_criacao_playlist DATE DEFAULT CURRENT_DATE,
    CONSTRAINT fk_playlist_usuario FOREIGN KEY (usuario_id_usuario) REFERENCES public.usuario (id_usuario) ON DELETE CASCADE
);

-- N:N playlist <-> musica
CREATE TABLE public.playlist_musica (
    playlist_id_playlist INTEGER NOT NULL,
    musica_id_musica INTEGER NOT NULL,
    data_adicao TIMESTAMP DEFAULT NOW(),
    CONSTRAINT pk_playlist_musica PRIMARY KEY (playlist_id_playlist, musica_id_musica),
    CONSTRAINT fk_pm_playlist FOREIGN KEY (playlist_id_playlist) REFERENCES public.playlist (id_playlist) ON DELETE CASCADE,
    CONSTRAINT fk_pm_musica FOREIGN KEY (musica_id_musica) REFERENCES public.musica (id_musica) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- CARGA INICIAL
-- ------------------------------------------------------------
INSERT INTO public.usuario (id_usuario, nome_usuario, email_usuario, senha_usuario, data_criacao_usuario) VALUES
(1, 'admin', 'admin@spotifyfake.com', '$2a$10$HsnZefS3ZMcwnsM3wNmk3Ou3BkPKv/uo5Iag/PGpMgvRly1M/Pxn2', '2026-01-01'),
(2, 'Matheus Dziubate', 'matheus@email.com', '$2a$10$1e5cWay2v89XO7NzaNhKIuFVyBGncWl0Rf7ZQ1PFo1DzXUyICHKE2', '2026-01-10'),
(3, 'Maria Souza', 'maria@email.com', '$2a$10$zMtV6Ddk7cnWLfls7BlESuKLzmHTmeVKYNt1scRAdwEI/4VPCbFeW', '2026-01-12'),
(4, 'Joao Silva', 'joao@email.com', '$2a$10$qEufRPsYPIqDdr6i8XguoeMifImdf3feJKT3/wkqNneXZtVbIZOWG', '2026-01-15'),
(5, 'Ana Lima', 'ana@email.com', '$2a$10$rPCk91W/LFbdbbjA0XUdPej1674en9GgmsDMmwGP5Jdgoy2/NiIuS', '2026-01-18'),
(6, 'Lucas Mendes', 'lucas@email.com', '$2a$10$x4o03UOgavE3YqWFrm5e0uigoXHlv4GEssiYPQHdSIriDHpvAAQ62', '2026-01-20'),
(7, 'Fernanda Costa', 'fernanda@email.com', '$2a$10$.UaK07TlvxfePJdhpJlsR.Q/WQCIm1YvIfUGFqkAm0k0.L/gT7M/S', '2026-01-22'),
(8, 'Ricardo Alves', 'ricardo@email.com', '$2a$10$fe9.PnlWnsZ9d.sA7BVWxeLBDbR2HpDBQciWyqupCe5jL2kqyIbZe', '2026-01-25'),
(9, 'Patricia Gomes', 'patricia@email.com', '$2a$10$YkiZEo4/KLyuxUpbxoDcmu0Iv2e.ND1Y4ZZgppHjtFqJL4kKNLKjm', '2026-01-28'),
(10, 'Marcos Rocha', 'marcos@email.com', '$2a$10$tvOBjRp5baz/Oxb08sE9aeOMrSt32hJcqAoQSoU.KjWjO4W6q0a9K', '2026-02-01'),
(11, 'Carlos Pereira', 'carlos@email.com', '$2a$10$nSRIinr3N3B00BHjrY68ze2f7G0nKRLMM6akVx3UjR7bpxUHwKcS.', '2026-02-03'),
(12, 'Julia Fernandes', 'julia@email.com', '$2a$10$i8Vx6eXjJ3PmeUXZaKrQFupxGWiYsyV/Qi3qtpWZQTDFJoGOsH7Ya', '2026-02-05'),
(13, 'Rafael Torres', 'rafael@email.com', '$2a$10$kG6gyz99UWKtyKuMwbp3ieHlVqNqWlhP69cSf2rb0GFbB//LpxklG', '2026-02-08');

INSERT INTO public.artista (id_artista, nome_artista, genero_artista, pais_artista) VALUES
(1, 'Melanie Martinez', 'Pop', 'Estados Unidos'),
(2, 'Billie Eilish', 'Pop Alternativo', 'Estados Unidos'),
(3, 'The Weeknd', 'R&B', 'Canadá'),
(4, 'Dua Lipa', 'Pop', 'Reino Unido'),
(5, 'Ed Sheeran', 'Pop', 'Reino Unido'),
(6, 'Imagine Dragons', 'Rock', 'Estados Unidos'),
(7, 'Ariana Grande', 'Pop', 'Estados Unidos'),
(8, 'Post Malone', 'Hip Hop', 'Estados Unidos'),
(9, 'Anitta', 'Pop/Funk', 'Brasil'),
(10, 'NX Zero', 'Rock', 'Brasil'),
(11, 'Artista não informado', NULL, NULL),
(12, 'Justin Bieber', 'Pop', 'Canadá'),
(13, 'Pitty', 'Rock', 'Brasil');

INSERT INTO public.perfil (id_perfil, usuario_id_usuario, nome_exibicao_perfil, bio_perfil, data_nascimento_perfil) VALUES
(1, 2, 'Matheus D.', 'Apaixonado por musica eletronica e pop.', '2007-05-14'),
(2, 3, 'Maria S.', 'Fã de rock e indie desde sempre.', '1999-03-22'),
(3, 4, 'Joao S.', 'Adoro descobrir artistas novos.', '2001-07-30'),
(4, 5, 'Ana L.', 'Playlist boa é playlist variada.', '1998-11-05'),
(5, 6, 'Lucas M.', 'Hip hop e R&B o dia inteiro.', '2000-02-18'),
(6, 7, 'Fernanda C.', 'Pop internacional é vida.', '2002-09-09'),
(7, 8, 'Ricardo A.', 'Rock clássico e moderno.', '1995-12-01'),
(8, 9, 'Patricia G.', 'Sempre no repeat com Anitta.', '2003-04-27'),
(9, 10, 'Marcos R.', 'Funk e pop brasileiro.', '1997-06-15'),
(10, 11, 'Carlos P.', 'Explorando novos gêneros toda semana.', '1996-08-08');

-- As 10 músicas abaixo já têm MP3 (pasta musicas/) e capa (pasta imagens/)
INSERT INTO public.musica (id_musica, titulo_musica, duracao_musica, arquivo_musica, capa_musica, artista_id_artista) VALUES
(1, 'Obsessed', 242, 'musicas/musica_1.mp3', 'imagens/musica_1.png', 1),
(2, 'Baby Doll', 98, 'musicas/musica_2.mp3', 'imagens/musica_2.png', 11),
(3, 'Needy', 171, 'musicas/musica_3.mp3', 'imagens/musica_3.png', 7),
(4, 'From The Start', 169, 'musicas/musica_4.mp3', 'imagens/musica_4.png', 11),
(5, 'Drowning', 209, 'musicas/musica_5.mp3', 'imagens/musica_5.png', 11),
(6, 'Life Goes On', 206, 'musicas/musica_6.mp3', 'imagens/musica_6.png', 11),
(7, 'Baby', 219, 'musicas/musica_7.mp3', 'imagens/musica_7.png', 12),
(8, 'City Of Angels', 135, 'musicas/musica_8.mp3', 'imagens/musica_8.png', 11),
(9, 'Admirável Chip Novo', 206, 'musicas/musica_9.mp3', 'imagens/musica_9.png', 13),
(10, 'Duality', 214, 'musicas/musica_10.mp3', 'imagens/musica_10.png', 11);

-- Curtidas, playlists e músicas das playlists (mínimo de 10 registros em cada tabela)
INSERT INTO public.curtida (usuario_id_usuario, musica_id_musica) VALUES
(2, 1), (2, 3), (2, 7), (2, 9), (3, 1), (3, 2), (4, 5), (5, 7), (6, 3), (7, 9), (8, 10), (9, 4);

INSERT INTO public.playlist (id_playlist, usuario_id_usuario, nome_playlist) VALUES
(1, 2, 'Minhas favoritas'),
(2, 2, 'Para treinar'),
(3, 3, 'Estudar'),
(4, 4, 'Festa'),
(5, 5, 'Viagem'),
(6, 6, 'Relaxar'),
(7, 7, 'Só pop'),
(8, 8, 'Rock pesado'),
(9, 9, 'Madrugada'),
(10, 10, 'Domingo');

INSERT INTO public.playlist_musica (playlist_id_playlist, musica_id_musica) VALUES
(1, 1), (1, 3), (1, 9), (2, 7), (2, 10), (3, 4), (3, 5), (4, 1), (5, 7), (6, 3), (7, 1), (8, 10);

-- Sincroniza as sequences (os INSERTs acima informaram os IDs manualmente)
SELECT setval('public.usuario_id_usuario_seq', (SELECT MAX(id_usuario) FROM public.usuario));
SELECT setval('public.artista_id_artista_seq', (SELECT MAX(id_artista) FROM public.artista));
SELECT setval('public.perfil_id_perfil_seq', (SELECT MAX(id_perfil) FROM public.perfil));
SELECT setval('public.musica_id_musica_seq', (SELECT MAX(id_musica) FROM public.musica));
SELECT setval('public.playlist_id_playlist_seq', (SELECT MAX(id_playlist) FROM public.playlist));

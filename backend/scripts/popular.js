// ============================================================
// npm run popular
// Enche o catálogo com artistas, músicas e fotos usando links públicos:
//   - músicas + capas: iTunes Search API (sem chave). O MP3/M4A é a PRÉVIA de 30 s
//     que a Apple libera para divulgação (a música inteira não é liberada por nenhuma API gratuita).
//   - fotos dos artistas: Deezer API (sem chave).
// Só grava LINKS no banco (nada é baixado). Pode rodar de novo: não duplica nada.
// Precisa de internet e do Node 18 ou mais novo.
// ============================================================
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { query, pool } = require('../database');

const MUSICAS_POR_ARTISTA = 6;
const DURACAO_PREVIA = 30; // segundos: é o tamanho do arquivo que toca

// [nome, gênero, país]
const ARTISTAS = [
    ['Melanie Martinez', 'Pop', 'Estados Unidos'],
    ['Billie Eilish', 'Pop Alternativo', 'Estados Unidos'],
    ['The Weeknd', 'R&B', 'Canadá'],
    ['Dua Lipa', 'Pop', 'Reino Unido'],
    ['Ed Sheeran', 'Pop', 'Reino Unido'],
    ['Imagine Dragons', 'Rock', 'Estados Unidos'],
    ['Ariana Grande', 'Pop', 'Estados Unidos'],
    ['Post Malone', 'Hip Hop', 'Estados Unidos'],
    ['Anitta', 'Pop/Funk', 'Brasil'],
    ['NX Zero', 'Rock', 'Brasil'],
    ['Justin Bieber', 'Pop', 'Canadá'],
    ['Pitty', 'Rock', 'Brasil'],
    ['Taylor Swift', 'Pop', 'Estados Unidos'],
    ['Olivia Rodrigo', 'Pop', 'Estados Unidos'],
    ['Harry Styles', 'Pop', 'Reino Unido'],
    ['Bruno Mars', 'Pop', 'Estados Unidos'],
    ['Coldplay', 'Rock', 'Reino Unido'],
    ['Rihanna', 'Pop/R&B', 'Barbados'],
    ['Lady Gaga', 'Pop', 'Estados Unidos'],
    ['Sabrina Carpenter', 'Pop', 'Estados Unidos'],
    ['Charlie Puth', 'Pop', 'Estados Unidos'],
    ['Twenty One Pilots', 'Rock Alternativo', 'Estados Unidos'],
    ['Linkin Park', 'Rock', 'Estados Unidos'],
    ['Legião Urbana', 'Rock', 'Brasil'],
    ['Charlie Brown Jr.', 'Rock', 'Brasil'],
    ['Marília Mendonça', 'Sertanejo', 'Brasil'],
    ['Luan Santana', 'Sertanejo', 'Brasil'],
    ['Skank', 'Pop Rock', 'Brasil']
];

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const normalizar = (t) => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

async function buscarJson(url, tentativas = 3) {
    for (let i = 1; i <= tentativas; i++) {
        try {
            const r = await fetch(url, { headers: { 'User-Agent': 'SpotifyFake-aula/1.0' } });
            if (r.ok) return await r.json();
            if (r.status !== 403 && r.status !== 429 && r.status < 500) return null;
        } catch (e) { /* tenta de novo */ }
        await esperar(4000 * i); // a API limita ~20 pedidos por minuto
    }
    return null;
}

async function fotoDoArtista(nome) {
    const dados = await buscarJson(`https://api.deezer.com/search/artist?q=${encodeURIComponent(nome)}&limit=5`);
    const lista = (dados && dados.data) || [];
    const achou = lista.find((a) => normalizar(a.name) === normalizar(nome)) || null;
    const foto = achou && (achou.picture_xl || achou.picture_big || achou.picture_medium);
    // artistas sem foto cadastrada no Deezer devolvem uma imagem padrão (sem hash no caminho)
    return foto && !/\/images\/artist\/\/|\/artist\/(?:\/|$)/.test(foto) ? foto : null;
}

async function musicasDoArtista(nome) {
    const url = 'https://itunes.apple.com/search?media=music&entity=song&attribute=artistTerm&limit=40&country=BR'
        + `&term=${encodeURIComponent(nome)}`;
    const dados = await buscarJson(url);
    const vistos = new Set();
    const saida = [];
    for (const r of (dados && dados.results) || []) {
        if (!r.previewUrl || !r.trackName || normalizar(r.artistName) !== normalizar(nome)) continue;
        // "Song (Remastered)", "Song - Live" etc. contam como a mesma música
        const chave = normalizar(r.trackName.replace(/\(.*?\)|\[.*?\]|-.*$/g, ''));
        if (!chave || vistos.has(chave)) continue;
        vistos.add(chave);
        saida.push({
            titulo: r.trackName.slice(0, 150),
            genero: (r.primaryGenreName || '').slice(0, 50) || null,
            arquivo: r.previewUrl,
            capa: r.artworkUrl100 ? r.artworkUrl100.replace(/\/\d+x\d+bb\./, '/600x600bb.') : null
        });
        if (saida.length >= MUSICAS_POR_ARTISTA) break;
    }
    return saida;
}

async function acharOuCriarArtista(nome, genero, pais) {
    const achou = await query('SELECT id_artista FROM public.artista WHERE LOWER(nome_artista) = LOWER($1) LIMIT 1', [nome]);
    if (achou.rows.length) return { id: achou.rows[0].id_artista, novo: false };
    const novo = await query(
        `INSERT INTO public.artista (id_artista, nome_artista, genero_artista, pais_artista)
         VALUES ((SELECT COALESCE(MAX(id_artista), 0) + 1 FROM public.artista), $1, $2, $3)
         RETURNING id_artista`, [nome, genero, pais]);
    return { id: novo.rows[0].id_artista, novo: true };
}

async function main() {
    console.log('🎧 Populando o SpotifyFake (artistas, músicas e fotos)...\n');
    // se o banco ainda não tem as colunas novas, avisa em vez de dar erro estranho
    try { await query('SELECT foto_artista FROM public.artista LIMIT 1'); }
    catch (e) {
        console.error('❌ O banco ainda não tem as colunas/tabelas do player.');
        console.error('   Rode documentacao/migracao_player.sql (ou o spotifyfake.sql) e tente de novo.');
        process.exit(1);
    }

    let totalMusicas = 0, totalFotos = 0, semRede = 0;
    for (const [nome, genero, pais] of ARTISTAS) {
        const { id } = await acharOuCriarArtista(nome, genero, pais);

        // foto (só se o artista ainda não tem)
        const atual = await query('SELECT foto_artista FROM public.artista WHERE id_artista = $1', [id]);
        let foto = '';
        if (!atual.rows[0].foto_artista) {
            const f = await fotoDoArtista(nome);
            if (f) {
                await query('UPDATE public.artista SET foto_artista = $1 WHERE id_artista = $2', [f, id]);
                totalFotos++; foto = ' 📷';
            }
        }

        const faixas = await musicasDoArtista(nome);
        if (!faixas.length) semRede++;
        let novas = 0;
        for (const f of faixas) {
            const existe = await query(
                'SELECT 1 FROM public.musica WHERE artista_id_artista = $1 AND LOWER(titulo_musica) = LOWER($2)', [id, f.titulo]);
            if (existe.rows.length) continue;
            await query(
                `INSERT INTO public.musica (titulo_musica, genero_musica, duracao_musica, arquivo_musica, capa_musica, artista_id_artista)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [f.titulo, f.genero, DURACAO_PREVIA, f.arquivo, f.capa || 'imagens/capa_padrao.png', id]);
            novas++;
        }
        totalMusicas += novas;
        console.log(`  ${nome.padEnd(20)} +${novas} músicas${foto}`);
        await esperar(3200); // respeita o limite de pedidos por minuto da API
    }

    // artistas que já existiam (ex.: os do SQL inicial) e ficaram sem foto
    console.log(`\n✅ Pronto! ${totalMusicas} músicas novas e ${totalFotos} fotos de artistas.`);
    if (semRede === ARTISTAS.length) {
        console.log('⚠ Nada foi encontrado: confira a internet (ou se a rede da escola bloqueia itunes.apple.com).');
    }
    await pool.end();
}

main().catch(async (erro) => {
    console.error('❌ Erro:', erro.message);
    await pool.end().catch(() => {});
    process.exit(1);
});

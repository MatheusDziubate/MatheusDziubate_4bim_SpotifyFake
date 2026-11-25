// ============================================================
// npm run popular:jamendo
// Enche o catálogo com músicas COMPLETAS e legais do Jamendo (Creative Commons).
// Só grava LINKS no banco (música, capa e foto do artista): nada é baixado.
//
// Antes de rodar:
//   1) crie uma conta em https://devportal.jamendo.com e copie o "Client ID" do seu aplicativo
//   2) coloque no arquivo backend/.env uma linha:   JAMENDO_CLIENT_ID=seu_client_id
//   3) rode:  npm run popular:jamendo     (precisa de internet e Node 18+)
//
// Pode rodar de novo: não duplica músicas nem artistas.
//
// MÚSICA INTEIRA x PRÉVIA: o campo "audio" do Jamendo costuma ser só uma prévia de 30 s.
// A música inteira vem em "audiodownload" e só pode ser usada quando o artista permite
// (audiodownload_allowed). Por isso este script só importa músicas com download liberado.
//   node backend/scripts/popular_jamendo.js              -> importa só músicas inteiras e corrige links de prévia já salvos
//   node backend/scripts/popular_jamendo.js --com-previa -> se o artista não liberou a inteira, importa a prévia de 30 s mesmo assim
//   node backend/scripts/popular_jamendo.js --limpar     -> apaga as músicas do Jamendo que ficaram só com prévia
//                                                          (mostra quantas são e PEDE CONFIRMAÇÃO antes de apagar)
// ============================================================
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { query, pool } = require('../database');

const API = 'https://api.jamendo.com/v3.0';
const POR_GENERO = 15;     // quantas músicas buscar em cada gênero (artistas diferentes)
const BUSCAR = 50;         // busca mais, porque nem todo artista libera a música inteira
const LIMPAR = process.argv.includes('--limpar');
const COM_PREVIA = process.argv.includes('--com-previa');
const readline = require('readline');

function perguntar(texto) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise((resolve) => rl.question(texto, (resp) => { rl.close(); resolve(resp.trim().toLowerCase()); }));
}

// música inteira só quando o artista liberou o download
const linkInteiro = (f) => (f.audiodownload && f.audiodownload_allowed !== false ? f.audiodownload : null);
const GENEROS = [          // [tag do Jamendo, nome mostrado no site]
    ['pop', 'Pop'], ['rock', 'Rock'], ['electronic', 'Eletrônica'], ['hiphop', 'Hip Hop'],
    ['jazz', 'Jazz'], ['lounge', 'Lounge'], ['classical', 'Clássica'], ['metal', 'Metal'],
    ['reggae', 'Reggae'], ['folk', 'Folk'], ['blues', 'Blues'], ['ambient', 'Ambient']
];
const BIO = 'Artista independente do Jamendo. Músicas sob licença Creative Commons.';

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

async function chamar(rota, params) {
    const url = `${API}/${rota}/?` + new URLSearchParams({ client_id: process.env.JAMENDO_CLIENT_ID, format: 'json', ...params });
    for (let i = 1; i <= 3; i++) {
        try {
            const r = await fetch(url, { headers: { 'User-Agent': 'SpotifyFake-aula/1.0' } });
            const dados = await r.json();
            if (dados.headers && dados.headers.status === 'failed') {
                throw Object.assign(new Error(dados.headers.error_message || 'Pedido recusado pelo Jamendo.'), { fatal: true });
            }
            return dados.results || [];
        } catch (e) {
            if (e.fatal || i === 3) throw e;
            await esperar(2000 * i);
        }
    }
}

async function acharOuCriarArtista(nome, genero) {
    const achou = await query('SELECT id_artista, foto_artista FROM public.artista WHERE LOWER(nome_artista) = LOWER($1) LIMIT 1', [nome]);
    if (achou.rows.length) return { id: achou.rows[0].id_artista, foto: achou.rows[0].foto_artista, novo: false };
    const novo = await query(
        `INSERT INTO public.artista (id_artista, nome_artista, genero_artista, bio_artista)
         VALUES ((SELECT COALESCE(MAX(id_artista), 0) + 1 FROM public.artista), $1, $2, $3)
         RETURNING id_artista`, [nome.slice(0, 100), genero, BIO]);
    return { id: novo.rows[0].id_artista, foto: null, novo: true };
}

async function main() {
    if (!process.env.JAMENDO_CLIENT_ID) {
        console.error('❌ Falta o Client ID do Jamendo.');
        console.error('   1) Crie uma conta e um aplicativo em https://devportal.jamendo.com e copie o "Client ID".');
        console.error('   2) Coloque no backend/.env a linha:  JAMENDO_CLIENT_ID=seu_client_id');
        process.exit(1);
    }
    try { await query('SELECT foto_artista FROM public.artista LIMIT 1'); }
    catch (e) {
        console.error('❌ O banco ainda não tem as colunas do player. Rode documentacao/migracao_player.sql e tente de novo.');
        process.exit(1);
    }

    console.log('🎵 Buscando músicas no Jamendo...\n');
    let totalMusicas = 0, totalArtistasNovos = 0, totalCorrigidas = 0;
    const artistasJamendo = new Map(); // id_artista (nosso) -> { idJamendo, imagemFaixa }

    for (const [tag, nomeGenero] of GENEROS) {
        const faixas = await chamar('tracks', {
            tags: tag, limit: String(BUSCAR), order: 'popularity_total', groupby: 'artist_id',
            audioformat: 'mp32', imagesize: '300', include: 'musicinfo'
        });
        let novas = 0, corrigidas = 0, usadas = 0, liberadas = 0;
        for (const f of faixas) {
            if (linkInteiro(f)) liberadas++;
            const link = linkInteiro(f) || (COM_PREVIA ? f.audio : null);
            if (!link || !f.name || !f.artist_name) continue;   // sem download liberado = só prévia: ignora (a menos que use --com-previa)
            if (usadas >= POR_GENERO) break;
            usadas++;
            const art = await acharOuCriarArtista(f.artist_name, nomeGenero);
            if (art.novo) totalArtistasNovos++;
            if (!artistasJamendo.has(art.id) && !art.foto) artistasJamendo.set(art.id, { idJamendo: f.artist_id, imagemFaixa: f.image || f.album_image || null });

            const titulo = String(f.name).slice(0, 150);
            const existe = await query(
                'SELECT id_musica FROM public.musica WHERE artista_id_artista = $1 AND LOWER(titulo_musica) = LOWER($2)', [art.id, titulo]);
            if (existe.rows.length) {
                // já estava no banco: troca o link da prévia pelo da música inteira
                await query('UPDATE public.musica SET arquivo_musica = $1, duracao_musica = COALESCE($2, duracao_musica) WHERE id_musica = $3',
                    [link, parseInt(f.duration, 10) || null, existe.rows[0].id_musica]);
                corrigidas++;
                continue;
            }
            await query(
                `INSERT INTO public.musica (titulo_musica, genero_musica, duracao_musica, arquivo_musica, capa_musica, artista_id_artista)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [titulo, nomeGenero, parseInt(f.duration, 10) || null, link, f.image || f.album_image || 'imagens/capa_padrao.png', art.id]);
            novas++;
        }
        totalCorrigidas += corrigidas;
        totalMusicas += novas;
        console.log(`  ${nomeGenero.padEnd(12)} +${novas} novas, ${corrigidas} corrigidas (${liberadas} de ${faixas.length} encontradas liberam a música inteira)`);
        await esperar(400);
    }

    // fotos dos artistas: usa a foto do perfil no Jamendo; se não tiver, usa a capa de uma música dele
    let fotos = 0;
    const ids = [...artistasJamendo.entries()];
    for (let i = 0; i < ids.length; i += 20) {
        const lote = ids.slice(i, i + 20);
        let perfis = [];
        try { perfis = await chamar('artists', { id: lote.map(([, v]) => v.idJamendo).join('+'), imagesize: '300' }); } catch (e) { /* usa as capas */ }
        const fotoPorId = new Map(perfis.map((p) => [String(p.id), p.image]));
        for (const [idNosso, v] of lote) {
            const foto = fotoPorId.get(String(v.idJamendo)) || v.imagemFaixa;
            if (!foto) continue;
            await query('UPDATE public.artista SET foto_artista = $1 WHERE id_artista = $2 AND foto_artista IS NULL', [foto, idNosso]);
            fotos++;
        }
        await esperar(400);
    }

    // músicas do Jamendo que continuam com o link da prévia (artista não liberou a música inteira)
    const previas = await query(`SELECT COUNT(*)::int AS n FROM public.musica WHERE arquivo_musica LIKE '%storage.jamendo.com/?trackid=%'`);
    let removidas = 0;
    if (LIMPAR && previas.rows[0].n > 0) {
        console.log(`\n⚠ Vão ser APAGADAS ${previas.rows[0].n} músicas do Jamendo que só têm a prévia de 30 s (e saem também das playlists e curtidas).`);
        const resp = await perguntar('Digite "sim" para apagar, ou Enter para cancelar: ');
        if (resp === 'sim') {
            const r = await query(`DELETE FROM public.musica WHERE arquivo_musica LIKE '%storage.jamendo.com/?trackid=%'`);
            removidas = r.rowCount;
        } else {
            console.log('Cancelado: nada foi apagado.');
        }
    }

    console.log(`\n✅ Pronto! ${totalMusicas} músicas novas, ${totalCorrigidas} corrigidas para a versão inteira, ${totalArtistasNovos} artistas novos e ${fotos} fotos.`);
    if (previas.rows[0].n > 0 && !LIMPAR) {
        console.log(`⚠ Ainda há ${previas.rows[0].n} músicas do Jamendo tocando só a prévia de 30 s (nada foi apagado).`);
    }
    if (removidas) console.log(`🧹 ${removidas} músicas só-prévia foram apagadas.`);
    if (!totalMusicas && !totalCorrigidas) {
        console.log('   (nada mudou: o Jamendo não respondeu ou nenhum artista liberou o download.)');
        console.log('   Para ter músicas mesmo assim, rode com --com-previa (toca só 30 s por música).');
    }
    await pool.end();
}

main().catch(async (erro) => {
    console.error('❌ Erro:', erro.message);
    if (/client/i.test(erro.message)) console.error('   Confira o JAMENDO_CLIENT_ID no backend/.env.');
    await pool.end().catch(() => {});
    process.exit(1);
});

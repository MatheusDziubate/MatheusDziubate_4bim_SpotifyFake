const { query } = require('../database');

// ------------------------------------------------------------
// Busca "inteligente": acha músicas e artistas pelo que a pessoa escreveu,
// mesmo com letras faltando, acento diferente ou erro de digitação.
// ------------------------------------------------------------

// minúsculas, sem acento, só letras/números separados por espaço único
function normalizar(texto) {
    return String(texto || '')
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

// distância de edição (quantas letras trocar/inserir/apagar para virar a outra palavra)
function levenshtein(a, b) {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    let anterior = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
        const atual = [i];
        for (let j = 1; j <= b.length; j++) {
            const custo = a[i - 1] === b[j - 1] ? 0 : 1;
            atual[j] = Math.min(anterior[j] + 1, atual[j - 1] + 1, anterior[j - 1] + custo);
        }
        anterior = atual;
    }
    return anterior[b.length];
}

// parecença entre dois textos pelos pares de letras (0 a 1)
function dice(a, b) {
    if (a.length < 2 || b.length < 2) return a === b ? 1 : 0;
    const pares = new Map();
    for (let i = 0; i < a.length - 1; i++) {
        const p = a.slice(i, i + 2);
        pares.set(p, (pares.get(p) || 0) + 1);
    }
    let iguais = 0;
    for (let i = 0; i < b.length - 1; i++) {
        const p = b.slice(i, i + 2);
        const n = pares.get(p) || 0;
        if (n > 0) { pares.set(p, n - 1); iguais++; }
    }
    return (2 * iguais) / (a.length - 1 + b.length - 1);
}

// nota de 0 a 100: quanto o texto "alvo" combina com o que foi digitado ("consulta")
function pontuar(consulta, alvo) {
    if (!consulta || !alvo) return 0;
    if (alvo === consulta) return 100;
    if (alvo.startsWith(consulta)) return 90 - Math.min(10, (alvo.length - consulta.length) / 4);
    const palavras = alvo.split(' ');
    if (palavras.some((p) => p.startsWith(consulta))) return 80;
    if (alvo.includes(consulta)) return 70;

    // aproximado: pares de letras no texto todo (cobre "bilie ailish") ...
    let sim = dice(consulta, alvo);
    // ... começo do alvo com o mesmo tamanho (cobre "billy eli" -> "billie eilish")
    sim = Math.max(sim, dice(consulta, alvo.slice(0, consulta.length + 2)) * 0.95);
    // ... e palavra por palavra (cobre "wekend" -> "the weeknd")
    if (!consulta.includes(' ')) {
        for (const p of palavras) {
            if (p.length < 3) continue;
            const d = levenshtein(consulta, p);
            sim = Math.max(sim, 1 - d / Math.max(consulta.length, p.length));
        }
    }
    return sim * 60; // aproximado nunca passa de 60 (abaixo de quem contém o texto)
}

const NOTA_MINIMA = 38;
const ARTISTA_PADRAO = 'Artista não informado';

// GET /catalogo/artistas  -> artistas que têm música, com foto e total de músicas
exports.listarArtistas = async (req, res) => {
    try {
        const result = await query(
            `SELECT a.id_artista, a.nome_artista, a.genero_artista, a.pais_artista,
                    a.foto_artista, a.bio_artista, COUNT(m.id_musica)::int AS total_musicas
               FROM public.artista a
               LEFT JOIN public.musica m ON m.artista_id_artista = a.id_artista
              GROUP BY a.id_artista
             HAVING COUNT(m.id_musica) > 0
              ORDER BY LOWER(a.nome_artista)`);
        res.json({ sucesso: true, artistas: result.rows });
    } catch (error) {
        console.error('Erro ao listar artistas do catalogo:', error);
        res.status(500).json({ sucesso: false, mensagem: 'Erro ao listar artistas.' });
    }
};

// GET /catalogo/busca?q=texto  -> { melhor, artistas[], musicas[] }
exports.buscar = async (req, res) => {
    try {
        const texto = String(req.query.q || '').slice(0, 100);
        const q = normalizar(texto);
        if (!q) return res.json({ sucesso: true, melhor: null, artistas: [], musicas: [] });

        const [rArtistas, rMusicas] = await Promise.all([
            query(`SELECT a.id_artista, a.nome_artista, a.genero_artista, a.pais_artista,
                          a.foto_artista, a.bio_artista, COUNT(m.id_musica)::int AS total_musicas
                     FROM public.artista a
                     LEFT JOIN public.musica m ON m.artista_id_artista = a.id_artista
                    GROUP BY a.id_artista
                   HAVING COUNT(m.id_musica) > 0`),
            query(`SELECT m.id_musica, m.titulo_musica, m.genero_musica, m.duracao_musica,
                          m.arquivo_musica, m.capa_musica, m.artista_id_artista, a.nome_artista
                     FROM public.musica m
                     JOIN public.artista a ON a.id_artista = m.artista_id_artista`)
        ]);

        const artistas = rArtistas.rows
            .filter((a) => a.nome_artista !== ARTISTA_PADRAO)
            .map((a) => ({ ...a, nota: pontuar(q, normalizar(a.nome_artista)) }))
            .filter((a) => a.nota >= NOTA_MINIMA)
            .sort((x, y) => y.nota - x.nota)
            .slice(0, 8);

        const musicas = rMusicas.rows
            .map((m) => {
                const notaTitulo = pontuar(q, normalizar(m.titulo_musica));
                // músicas do artista digitado também aparecem (um pouco abaixo das que têm o título)
                const notaArtista = m.nome_artista === ARTISTA_PADRAO ? 0 : pontuar(q, normalizar(m.nome_artista)) * 0.85;
                return { ...m, nota: Math.max(notaTitulo, notaArtista), porTitulo: notaTitulo >= notaArtista };
            })
            .filter((m) => m.nota >= NOTA_MINIMA)
            .sort((x, y) => y.nota - x.nota || x.titulo_musica.localeCompare(y.titulo_musica))
            .slice(0, 30);

        // melhor resultado: o artista ganha o empate
        let melhor = null;
        const melhorArtista = artistas[0];
        const melhorMusica = musicas.find((m) => m.porTitulo);
        if (melhorArtista && (!melhorMusica || melhorArtista.nota >= melhorMusica.nota)) {
            melhor = { tipo: 'artista', artista: melhorArtista };
        } else if (melhorMusica) {
            melhor = { tipo: 'musica', musica: melhorMusica };
        }

        res.json({ sucesso: true, melhor, artistas, musicas });
    } catch (error) {
        console.error('Erro na busca:', error);
        res.status(500).json({ sucesso: false, mensagem: 'Erro ao pesquisar.' });
    }
};

exports._testes = { normalizar, pontuar };

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { query, pool } = require('../database');

const RAIZ = path.join(__dirname, '../..');
const PASTA_MUSICAS = path.join(RAIZ, 'musicas');
const PASTA_IMAGENS = path.join(RAIZ, 'imagens');
const CAPA_PADRAO = 'imagens/capa_padrao.png';

// Verifica se o buffer realmente parece um MP3 (cabecalho ID3 ou frame de audio MPEG)
function pareceMp3(buf) {
    if (!buf || buf.length < 4) return false;
    if (buf.toString('latin1', 0, 3) === 'ID3') return true;
    return buf[0] === 0xFF && (buf[1] & 0xE0) === 0xE0;
}

// Aceita somente links http/https (nada de javascript:, data:, file: etc.)
function linkValido(texto) {
    try {
        const u = new URL(String(texto).trim());
        return (u.protocol === 'http:' || u.protocol === 'https:') && String(texto).trim().length <= 500;
    } catch (e) {
        return false;
    }
}

// Se o caminho salvo no banco e um arquivo local (nao um link), devolve o caminho no disco
function arquivoLocal(caminhoBanco) {
    if (!caminhoBanco || /^https?:\/\//i.test(caminhoBanco)) return null;
    return path.join(RAIZ, caminhoBanco);
}

function removerArquivo(caminho) {
    if (!caminho) return;
    try { if (fs.existsSync(caminho)) fs.unlinkSync(caminho); } catch (e) { /* ignora */ }
}

// Procura o artista pelo nome (sem diferenciar maiusculas); se nao existir, cria (relacionamento 1:N)
async function acharOuCriarArtista(client, nome) {
    const achou = await client.query(
        'SELECT id_artista FROM public.artista WHERE LOWER(nome_artista) = LOWER($1) LIMIT 1', [nome]);
    if (achou.rows.length) return achou.rows[0].id_artista;
    const novo = await client.query(
        `INSERT INTO public.artista (id_artista, nome_artista)
         VALUES ((SELECT COALESCE(MAX(id_artista), 0) + 1 FROM public.artista), $1)
         RETURNING id_artista`, [nome]);
    return novo.rows[0].id_artista;
}

// Valida os campos de texto e os arquivos enviados. Devolve mensagem de erro ou null.
function validar(req, { criando }) {
    const titulo = String(req.body.titulo_musica || '').trim();
    const artista = String(req.body.nome_artista || '').trim();
    const mp3 = req.files && req.files.mp3 && req.files.mp3[0];
    const urlMp3 = String(req.body.url_mp3 || '').trim();
    const urlCapa = String(req.body.url_capa || '').trim();

    if (!titulo) return 'Informe o nome da música.';
    if (!artista) return 'Informe o nome do artista.';
    if (titulo.length > 150 || artista.length > 100) return 'Nome da música ou do artista muito longo.';
    if (criando && !mp3 && !urlMp3) return 'Envie o arquivo MP3 ou informe o link do MP3.';
    if (mp3 && !pareceMp3(mp3.buffer)) return 'O arquivo enviado não é um MP3 válido.';
    if (urlMp3 && !linkValido(urlMp3)) return 'O link do MP3 é inválido (use um link http:// ou https://).';
    if (urlCapa && !linkValido(urlCapa)) return 'O link da capa é inválido (use um link http:// ou https://).';
    return null;
}

async function salvarArquivos(id, mp3, capa) {
    fs.mkdirSync(PASTA_MUSICAS, { recursive: true });
    fs.mkdirSync(PASTA_IMAGENS, { recursive: true });
    if (mp3) {
        fs.writeFileSync(path.join(PASTA_MUSICAS, `musica_${id}.mp3`), mp3.buffer);
    }
    if (capa) {
        await sharp(capa.buffer)
            .resize(300, 300, { fit: 'cover' })
            .toFormat('png')
            .toFile(path.join(PASTA_IMAGENS, `musica_${id}.png`));
    }
}

const SQL_LISTA = `
    SELECT m.id_musica, m.titulo_musica, m.genero_musica, m.duracao_musica,
           m.arquivo_musica, m.capa_musica, m.artista_id_artista, a.nome_artista
      FROM public.musica m
      JOIN public.artista a ON a.id_artista = m.artista_id_artista
`;

// GET /musica/listar  (qualquer usuario logado: e o que o player usa)
exports.listarMusicas = async (req, res) => {
    try {
        const result = await query(`${SQL_LISTA} ORDER BY m.id_musica`);
        res.json({ sucesso: true, musicas: result.rows });
    } catch (error) {
        console.error('Erro ao listar musicas:', error);
        res.status(500).json({ sucesso: false, mensagem: 'Erro ao listar músicas.' });
    }
};

// GET /musica/:id  (admin)
exports.obterMusica = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) {
            return res.status(400).json({ sucesso: false, mensagem: 'ID inválido.' });
        }
        const result = await query(`${SQL_LISTA} WHERE m.id_musica = $1`, [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ sucesso: false, mensagem: 'Música não encontrada.' });
        }
        res.json({ sucesso: true, musica: result.rows[0] });
    } catch (error) {
        console.error('Erro ao obter musica:', error);
        res.status(500).json({ sucesso: false, mensagem: 'Erro interno do servidor.' });
    }
};

// POST /musica  (admin) - multipart: titulo_musica, nome_artista, duracao_musica?, mp3, capa?
exports.criarMusica = async (req, res) => {
    const erro = validar(req, { criando: true });
    if (erro) return res.status(400).json({ sucesso: false, mensagem: erro });

    const titulo = req.body.titulo_musica.trim();
    const nomeArtista = req.body.nome_artista.trim();
    const duracao = parseInt(req.body.duracao_musica, 10);
    const mp3 = req.files.mp3 && req.files.mp3[0];
    const capa = req.files.capa && req.files.capa[0];
    // Arquivo enviado tem prioridade; senao usa o link informado
    const urlMp3 = mp3 ? null : String(req.body.url_mp3 || '').trim();
    const urlCapa = capa ? null : (String(req.body.url_capa || '').trim() || null);

    const client = await pool.connect();
    let id = null;
    try {
        await client.query('BEGIN');
        const idArtista = await acharOuCriarArtista(client, nomeArtista);
        const ins = await client.query(
            `INSERT INTO public.musica (titulo_musica, duracao_musica, artista_id_artista)
             VALUES ($1, $2, $3) RETURNING id_musica`,
            [titulo, isNaN(duracao) ? null : duracao, idArtista]);
        id = ins.rows[0].id_musica;

        await salvarArquivos(id, mp3, capa);
        await client.query(
            'UPDATE public.musica SET arquivo_musica = $1, capa_musica = $2 WHERE id_musica = $3',
            [mp3 ? `musicas/musica_${id}.mp3` : urlMp3,
             capa ? `imagens/musica_${id}.png` : (urlCapa || CAPA_PADRAO), id]);

        await client.query('COMMIT');
        res.status(201).json({ sucesso: true, mensagem: 'Música adicionada! Já está disponível para os usuários.', id_musica: id });
    } catch (error) {
        await client.query('ROLLBACK').catch(() => {});
        if (id) {
            removerArquivo(path.join(PASTA_MUSICAS, `musica_${id}.mp3`));
            removerArquivo(path.join(PASTA_IMAGENS, `musica_${id}.png`));
        }
        console.error('Erro ao criar musica:', error);
        if (/image format|Input/i.test(error.message)) {
            return res.status(400).json({ sucesso: false, mensagem: 'A capa enviada não é uma imagem válida.' });
        }
        res.status(500).json({ sucesso: false, mensagem: 'Erro ao salvar a música.' });
    } finally {
        client.release();
    }
};

// PUT /musica/:id  (admin) - mp3 e capa sao opcionais ao alterar
exports.atualizarMusica = async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ sucesso: false, mensagem: 'ID inválido.' });

    const erro = validar(req, { criando: false });
    if (erro) return res.status(400).json({ sucesso: false, mensagem: erro });

    const titulo = req.body.titulo_musica.trim();
    const nomeArtista = req.body.nome_artista.trim();
    const duracao = parseInt(req.body.duracao_musica, 10);
    const mp3 = req.files.mp3 && req.files.mp3[0];
    const capa = req.files.capa && req.files.capa[0];

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const atual = await client.query('SELECT arquivo_musica, capa_musica FROM public.musica WHERE id_musica = $1', [id]);
        if (atual.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ sucesso: false, mensagem: 'Música não encontrada.' });
        }

        const idArtista = await acharOuCriarArtista(client, nomeArtista);
        await client.query(
            `UPDATE public.musica
                SET titulo_musica = $1,
                    artista_id_artista = $2,
                    duracao_musica = COALESCE($3, duracao_musica)
              WHERE id_musica = $4`,
            [titulo, idArtista, isNaN(duracao) ? null : duracao, id]);

        // Troca de MP3/capa: arquivo enviado tem prioridade sobre o link
        const urlMp3 = mp3 ? '' : String(req.body.url_mp3 || '').trim();
        const urlCapa = capa ? '' : String(req.body.url_capa || '').trim();
        const apagarDepois = [];

        if (mp3 || capa) await salvarArquivos(id, mp3, capa);
        if (mp3) {
            await client.query('UPDATE public.musica SET arquivo_musica = $1 WHERE id_musica = $2',
                [`musicas/musica_${id}.mp3`, id]);
        } else if (urlMp3) {
            await client.query('UPDATE public.musica SET arquivo_musica = $1 WHERE id_musica = $2', [urlMp3, id]);
            apagarDepois.push(arquivoLocal(atual.rows[0].arquivo_musica)); // passou a usar link: apaga o MP3 local antigo
        }
        if (capa) {
            await client.query('UPDATE public.musica SET capa_musica = $1 WHERE id_musica = $2',
                [`imagens/musica_${id}.png`, id]);
        } else if (urlCapa) {
            await client.query('UPDATE public.musica SET capa_musica = $1 WHERE id_musica = $2', [urlCapa, id]);
            const antiga = arquivoLocal(atual.rows[0].capa_musica);
            if (antiga && path.basename(antiga) !== 'capa_padrao.png') apagarDepois.push(antiga);
        }

        await client.query('COMMIT');
        apagarDepois.filter(Boolean).forEach(removerArquivo);
        res.json({ sucesso: true, mensagem: 'Música alterada com sucesso!' });
    } catch (error) {
        await client.query('ROLLBACK').catch(() => {});
        console.error('Erro ao atualizar musica:', error);
        if (/image format|Input/i.test(error.message)) {
            return res.status(400).json({ sucesso: false, mensagem: 'A capa enviada não é uma imagem válida.' });
        }
        res.status(500).json({ sucesso: false, mensagem: 'Erro ao atualizar música.' });
    } finally {
        client.release();
    }
};

// DELETE /musica/:id  (admin) - remove o registro e os arquivos
exports.deletarMusica = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) return res.status(400).json({ sucesso: false, mensagem: 'ID inválido.' });

        const result = await query(
            'DELETE FROM public.musica WHERE id_musica = $1 RETURNING id_musica, arquivo_musica, capa_musica', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ sucesso: false, mensagem: 'Música não encontrada.' });
        }

        // Links nao tem arquivo para apagar; a capa padrao nunca e apagada
        const { arquivo_musica, capa_musica } = result.rows[0];
        removerArquivo(arquivoLocal(arquivo_musica));
        const capaLocal = arquivoLocal(capa_musica);
        if (capaLocal && path.basename(capaLocal) !== 'capa_padrao.png') removerArquivo(capaLocal);

        res.json({ sucesso: true, mensagem: 'Música removida com sucesso!' });
    } catch (error) {
        console.error('Erro ao deletar musica:', error);
        res.status(500).json({ sucesso: false, mensagem: 'Erro ao excluir música.' });
    }
};

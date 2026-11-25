const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { query } = require('../database');

const RAIZ = path.join(__dirname, '../..');
const PASTA_IMAGENS = path.join(RAIZ, 'imagens');

// Se o caminho salvo no banco e um arquivo local (nao um link), devolve o caminho no disco
function arquivoLocal(caminhoBanco) {
    if (!caminhoBanco || /^https?:\/\//i.test(caminhoBanco)) return null;
    return path.join(RAIZ, caminhoBanco);
}

function removerArquivo(caminho) {
    if (!caminho) return;
    try { if (fs.existsSync(caminho)) fs.unlinkSync(caminho); } catch (e) { /* ignora */ }
}

// Valida e redimensiona a foto enviada (quadrada, 500x500). Lanca erro se nao for imagem.
async function prepararFoto(arquivo) {
    return sharp(arquivo.buffer).resize(500, 500, { fit: 'cover' }).toFormat('png').toBuffer();
}

// Nome novo a cada upload: assim o navegador nunca mostra a foto antiga guardada no cache
function novoCaminhoFoto(id) {
    return `imagens/artista_${id}_${Date.now()}.png`;
}

function gravarFoto(caminhoBanco, buffer) {
    fs.mkdirSync(PASTA_IMAGENS, { recursive: true });
    fs.writeFileSync(path.join(RAIZ, caminhoBanco), buffer);
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

// Listar todos os artistas
exports.listarArtistas = async (req, res) => {
    try {
        const result = await query('SELECT * FROM public.artista ORDER BY id_artista');
        res.json({ sucesso: true, artistas: result.rows });
    } catch (error) {
        console.error('Erro ao listar artistas:', error);
        res.status(500).json({ sucesso: false, mensagem: 'Erro ao listar artistas.' });
    }
};

// Obter artista por ID
exports.obterArtista = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) {
            return res.status(400).json({ sucesso: false, mensagem: 'ID inválido.' });
        }

        const result = await query('SELECT * FROM public.artista WHERE id_artista = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ sucesso: false, mensagem: 'Artista não encontrado.' });
        }

        res.json({ sucesso: true, artista: result.rows[0] });
    } catch (error) {
        console.error('Erro ao obter artista:', error);
        res.status(500).json({ sucesso: false, mensagem: 'Erro interno do servidor.' });
    }
};

// Criar artista (multipart: campos de texto + "foto" opcional; ou JSON com link)
exports.criarArtista = async (req, res) => {
    try {
        const { id_artista, nome_artista, genero_artista, pais_artista } = req.body;
        const link = String(req.body.foto_artista || '').trim();
        const bio = String(req.body.bio_artista || '').trim();

        if (!nome_artista) {
            return res.status(400).json({ sucesso: false, mensagem: 'O nome do artista é obrigatório.' });
        }
        if (link && !linkValido(link)) {
            return res.status(400).json({ sucesso: false, mensagem: 'O link da foto é inválido (use http:// ou https://).' });
        }
        if (bio.length > 500) {
            return res.status(400).json({ sucesso: false, mensagem: 'A bio pode ter no máximo 500 letras.' });
        }

        // arquivo enviado tem prioridade sobre o link
        let png = null;
        if (req.file) {
            try { png = await prepararFoto(req.file); }
            catch (e) { return res.status(400).json({ sucesso: false, mensagem: 'O arquivo enviado não é uma imagem válida.' }); }
        }
        const caminho = png ? novoCaminhoFoto(parseInt(id_artista, 10)) : (link || null);

        const sql = `
            INSERT INTO public.artista (id_artista, nome_artista, genero_artista, pais_artista, foto_artista, bio_artista)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `;
        const values = [id_artista, nome_artista, genero_artista || null, pais_artista || null, caminho, bio || null];

        const result = await query(sql, values);
        if (png) gravarFoto(caminho, png); // so grava o arquivo depois de o banco aceitar
        res.status(201).json({ sucesso: true, mensagem: 'Artista inserido com sucesso!', artista: result.rows[0] });
    } catch (error) {
        console.error('Erro ao criar artista:', error);
        if (error.code === '23505') {
            return res.status(400).json({ sucesso: false, mensagem: 'Já existe um artista com esse ID.' });
        }
        res.status(500).json({ sucesso: false, mensagem: 'Erro ao inserir artista no banco de dados.' });
    }
};

// Atualizar artista
// Foto: arquivo enviado > link digitado > (campo de link vazio apaga um link antigo) > senão mantém a foto atual.
// Uma foto que é arquivo nunca é apagada por um campo de link vazio.
exports.atualizarArtista = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) return res.status(400).json({ sucesso: false, mensagem: 'ID inválido.' });
        const { nome_artista, genero_artista, pais_artista } = req.body;
        const link = String(req.body.foto_artista || '').trim();
        const bio = String(req.body.bio_artista || '').trim();

        if (!nome_artista) {
            return res.status(400).json({ sucesso: false, mensagem: 'O nome do artista é obrigatório.' });
        }
        if (link && !linkValido(link)) {
            return res.status(400).json({ sucesso: false, mensagem: 'O link da foto é inválido (use http:// ou https://).' });
        }
        if (bio.length > 500) {
            return res.status(400).json({ sucesso: false, mensagem: 'A bio pode ter no máximo 500 letras.' });
        }

        const atual = await query('SELECT foto_artista FROM public.artista WHERE id_artista = $1', [id]);
        if (atual.rows.length === 0) {
            return res.status(404).json({ sucesso: false, mensagem: 'Artista não encontrado.' });
        }
        const fotoAtual = atual.rows[0].foto_artista;

        let png = null;
        if (req.file) {
            try { png = await prepararFoto(req.file); }
            catch (e) { return res.status(400).json({ sucesso: false, mensagem: 'O arquivo enviado não é uma imagem válida.' }); }
        }

        let novaFoto;
        if (png) novaFoto = novoCaminhoFoto(id);
        else if (link) novaFoto = link;
        else novaFoto = arquivoLocal(fotoAtual) ? fotoAtual : null; // vazio: só apaga se era um link

        const sql = `
            UPDATE public.artista
            SET nome_artista = $1,
                genero_artista = $2,
                pais_artista = $3,
                foto_artista = $4,
                bio_artista = $5
            WHERE id_artista = $6
            RETURNING *
        `;
        const values = [nome_artista, genero_artista || null, pais_artista || null, novaFoto, bio || null, id];

        const result = await query(sql, values);
        if (png) gravarFoto(novaFoto, png);
        // a foto antiga (arquivo) sai do disco quando foi trocada por outra
        if (novaFoto !== fotoAtual) removerArquivo(arquivoLocal(fotoAtual));

        res.json({ sucesso: true, mensagem: 'Artista alterado com sucesso!', artista: result.rows[0] });
    } catch (error) {
        console.error('Erro ao atualizar artista:', error);
        res.status(500).json({ sucesso: false, mensagem: 'Erro ao atualizar artista.' });
    }
};

// Deletar artista
exports.deletarArtista = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);

        const result = await query('DELETE FROM public.artista WHERE id_artista = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ sucesso: false, mensagem: 'Artista não encontrado.' });
        }

        removerArquivo(arquivoLocal(result.rows[0].foto_artista)); // apaga a foto enviada, se havia
        res.json({ sucesso: true, mensagem: 'Artista excluído com sucesso!' });
    } catch (error) {
        console.error('Erro ao deletar artista:', error);
        if (error.code === '23503') {
            return res.status(400).json({ sucesso: false, mensagem: 'Não é possível excluir: existem músicas vinculadas a este artista.' });
        }
        res.status(500).json({ sucesso: false, mensagem: 'Erro ao excluir artista.' });
    }
};

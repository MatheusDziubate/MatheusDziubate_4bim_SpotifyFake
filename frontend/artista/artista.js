const URL_API = '';

let oQueEstaFazendo = '';
let artista = null;
let editando = false; // só dá para escolher foto enquanto está inserindo/alterando
bloquearAtributos(true);

// ---- foto: clicar na imagem escolhe um arquivo; ou digite um link ----
function acionarUpload() {
    if (!editando) return mostrarAviso("Clique em Inserir ou Alterar para trocar a foto.");
    document.getElementById("inputArquivoFoto").click();
}

function previewImagem() {
    const arquivo = document.getElementById("inputArquivoFoto").files[0];
    if (arquivo) {
        document.getElementById("imgArtista").src = URL.createObjectURL(arquivo);
        document.getElementById("inputFoto_artista").value = ""; // arquivo tem prioridade sobre o link
    }
}

// Mostra na hora a foto do link digitado (se não carregar, volta para a silhueta)
function previewLink() {
    const link = document.getElementById("inputFoto_artista").value.trim();
    const img = document.getElementById("imgArtista");
    img.onerror = () => { img.onerror = null; img.src = SILHUETA_PADRAO_URL; };
    img.referrerPolicy = "no-referrer";
    img.src = ehLink(link) ? link : SILHUETA_PADRAO_URL;
    if (link) document.getElementById("inputArquivoFoto").value = "";
}

async function procurePorChavePrimaria(chave) {
    try {
        const resposta = await fetch(`${URL_API}/artista/${chave}`);
        const data = await resposta.json();
        return data.sucesso ? data.artista : null;
    } catch (erro) {
        return null;
    }
}

async function procure() {
    const id_artista = parseInt(document.getElementById("inputId_artista").value, 10);
    if (isNaN(id_artista)) {
        mostrarAviso("O ID do artista não pode ser vazio e deve ser um número.");
        return;
    }

    artista = await procurePorChavePrimaria(id_artista);
    oQueEstaFazendo = '';

    if (artista) {
        mostrarDadosArtista(artista);
        visibilidadeDosBotoes('inline', 'none', 'inline', 'inline', 'none');
        mostrarAviso("Achou no banco, pode alterar ou excluir");
    } else {
        limparAtributos();
        visibilidadeDosBotoes('inline', 'inline', 'none', 'none', 'none');
        mostrarAviso("Não achou no banco, pode inserir");
    }
}

function inserir() {
    bloquearAtributos(false);
    visibilidadeDosBotoes('none', 'none', 'none', 'none', 'inline');
    oQueEstaFazendo = 'inserindo';
    mostrarAviso("INSERINDO - Digite os dados do artista e clique em salvar");
}

function alterar() {
    bloquearAtributos(false);
    visibilidadeDosBotoes('none', 'none', 'none', 'none', 'inline');
    oQueEstaFazendo = 'alterando';
    mostrarAviso("ALTERANDO - Digite os novos dados e clique em salvar");
}

function excluir() {
    bloquearAtributos(true);
    visibilidadeDosBotoes('none', 'none', 'none', 'none', 'inline');
    oQueEstaFazendo = 'excluindo';
    mostrarAviso("EXCLUINDO - Clique em salvar para confirmar a exclusão");
}

async function salvar() {
    const id_artista = parseInt(document.getElementById("inputId_artista").value, 10);
    const nome_artista = document.getElementById("inputNome_artista").value.trim();
    const genero_artista = document.getElementById("inputGenero_artista").value.trim();
    const pais_artista = document.getElementById("inputPais_artista").value.trim();
    const foto_artista = document.getElementById("inputFoto_artista").value.trim();
    const bio_artista = document.getElementById("inputBio_artista").value.trim();

    if (isNaN(id_artista)) {
        mostrarAviso("O ID do artista deve ser um número válido.");
        return;
    }

    if (foto_artista && !ehLink(foto_artista)) {
        mostrarAviso("O link da foto deve começar com http:// ou https://");
        return;
    }

    // multipart (e não JSON) porque pode ir um arquivo de imagem junto
    const form = new FormData();
    form.append('id_artista', id_artista);
    form.append('nome_artista', nome_artista);
    form.append('genero_artista', genero_artista);
    form.append('pais_artista', pais_artista);
    form.append('bio_artista', bio_artista);
    const arquivoFoto = document.getElementById("inputArquivoFoto").files[0];
    if (arquivoFoto) form.append('foto', arquivoFoto);
    else form.append('foto_artista', foto_artista);

    try {
        let resp, data;
        if (oQueEstaFazendo === 'inserindo') {
            resp = await fetch(`${URL_API}/artista`, { method: 'POST', body: form });
            data = await resp.json();
            if (!data.sucesso) return mostrarAviso(data.mensagem);
            mostrarAviso("Inserido no Banco de Dados com sucesso!");
        } else if (oQueEstaFazendo === 'alterando') {
            resp = await fetch(`${URL_API}/artista/${id_artista}`, { method: 'PUT', body: form });
            data = await resp.json();
            if (!data.sucesso) return mostrarAviso(data.mensagem);
            mostrarAviso("Alterado no Banco de Dados com sucesso!");
        } else if (oQueEstaFazendo === 'excluindo') {
            resp = await fetch(`${URL_API}/artista/${id_artista}`, { method: 'DELETE' });
            data = await resp.json();
            if (!data.sucesso) return mostrarAviso(data.mensagem);
            mostrarAviso("Excluído do Banco de Dados!");
        }

        visibilidadeDosBotoes('inline', 'none', 'none', 'none', 'none');
        limparAtributos();
        document.getElementById("inputId_artista").value = "";
        listar();
    } catch (erro) {
        mostrarAviso("Erro ao efetuar operação no servidor.");
    }
}

async function listar() {
    const saida = document.getElementById("outputSaida");
    try {
        const resposta = await fetch(`${URL_API}/artista/listar`);
        const data = await resposta.json();
        if (!data.sucesso) {
            saida.textContent = `Erro no banco: ${data.mensagem}`;
            return;
        }
        if (data.artistas.length === 0) {
            saida.textContent = "Nenhum artista cadastrado.";
            return;
        }

        // textContent/DOM em vez de innerHTML: os dados vêm do banco e não podem virar HTML (XSS)
        const linhas = data.artistas.map((a) => [
            criarImagem(urlRecurso(a.foto_artista, SILHUETA_PADRAO_URL), a.nome_artista, SILHUETA_PADRAO_URL),
            a.id_artista, a.nome_artista, a.genero_artista, a.pais_artista]);
        mostrarTabela(saida, montarTabela(["Foto", "ID", "Artista", "Gênero", "País"], linhas));
    } catch (erro) {
        console.error("Erro ao listar:", erro);
        saida.textContent = "Servidor offline ou erro de conexão (CORS).";
    }
}

function cancelarOperacao() {
    limparAtributos();
    bloquearAtributos(true);
    visibilidadeDosBotoes('inline', 'none', 'none', 'none', 'none');
    mostrarAviso("Cancelou a operação");
}

function mostrarAviso(mensagem) {
    document.getElementById("divAviso").textContent = mensagem;
}

function mostrarDadosArtista(a) {
    document.getElementById("inputId_artista").value = a.id_artista;
    document.getElementById("inputNome_artista").value = a.nome_artista;
    document.getElementById("inputGenero_artista").value = a.genero_artista || "";
    document.getElementById("inputPais_artista").value = a.pais_artista || "";
    // se a foto é um link, aparece no campo; se é arquivo enviado, só aparece na imagem
    document.getElementById("inputFoto_artista").value = ehLink(a.foto_artista) ? a.foto_artista : "";
    document.getElementById("inputArquivoFoto").value = "";
    const img = document.getElementById("imgArtista");
    img.onerror = () => { img.onerror = null; img.src = SILHUETA_PADRAO_URL; };
    img.referrerPolicy = "no-referrer";
    img.src = urlRecurso(a.foto_artista, SILHUETA_PADRAO_URL);
    document.getElementById("inputBio_artista").value = a.bio_artista || "";
    bloquearAtributos(true);
}

function limparAtributos() {
    artista = null;
    oQueEstaFazendo = '';
    document.getElementById("inputNome_artista").value = "";
    document.getElementById("inputGenero_artista").value = "";
    document.getElementById("inputPais_artista").value = "";
    document.getElementById("inputFoto_artista").value = "";
    document.getElementById("inputArquivoFoto").value = "";
    document.getElementById("imgArtista").src = SILHUETA_PADRAO_URL;
    document.getElementById("inputBio_artista").value = "";
    bloquearAtributos(true);
}

function bloquearAtributos(soLeitura) {
    editando = !soLeitura;
    document.getElementById("inputId_artista").readOnly = !soLeitura;
    document.getElementById("inputNome_artista").readOnly = soLeitura;
    document.getElementById("inputGenero_artista").readOnly = soLeitura;
    document.getElementById("inputPais_artista").readOnly = soLeitura;
    document.getElementById("inputFoto_artista").readOnly = soLeitura;
    document.getElementById("inputBio_artista").readOnly = soLeitura;
}

function visibilidadeDosBotoes(btP, btI, btA, btE, btS) {
    document.getElementById("btProcure").style.display = btP;
    document.getElementById("btInserir").style.display = btI;
    document.getElementById("btAlterar").style.display = btA;
    document.getElementById("btExcluir").style.display = btE;
    document.getElementById("btSalvar").style.display = btS;
    document.getElementById("btCancelar").style.display = btS;
}

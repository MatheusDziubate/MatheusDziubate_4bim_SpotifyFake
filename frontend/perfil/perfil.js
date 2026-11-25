const URL_API = '';
const SILHUETA_URL = `${URL_API}/imagens/silhueta.png`;

let oQueEstaFazendo = '';
let perfil = null;
bloquearAtributos(true);

async function inicializar() {
    await carregarUsuarios();
    await listar();
}

async function carregarUsuarios() {
    const select = document.getElementById("selectUsuario_id_usuario");
    try {
        const resposta = await fetch(`${URL_API}/usuario/listar`);
        const data = await resposta.json();
        if (data.sucesso) {
            select.textContent = "";
            const vazio = document.createElement("option");
            vazio.value = "";
            vazio.textContent = "-- Selecione um Usuário --";
            select.appendChild(vazio);
            data.usuarios.forEach(u => {
                const op = document.createElement("option");
                op.value = u.id_usuario;
                op.textContent = `${u.id_usuario} - ${u.nome_usuario}`; // textContent: sem risco de XSS
                select.appendChild(op);
            });
        }
    } catch (erro) {
        select.textContent = "";
        const op = document.createElement("option");
        op.value = "";
        op.textContent = "Erro ao carregar usuários";
        select.appendChild(op);
    }
}

function carregarImagem(id, fotoPerfil) {
    const img = document.getElementById('imgPerfil');
    img.referrerPolicy = 'no-referrer';
    img.onerror = () => { img.onerror = null; img.src = SILHUETA_URL; };
    if (!id) {
        img.src = SILHUETA_URL;
        return;
    }
    // link salvo no banco -> usa o link; senão o arquivo perfil_ID.png (com ?t= para não usar cache antigo)
    img.src = ehLink(fotoPerfil) ? fotoPerfil : `${URL_API}/imagens/perfil_${id}.png?t=${new Date().getTime()}`;
}

function previewLink() {
    const link = document.getElementById('inputUrlFoto').value.trim();
    const img = document.getElementById('imgPerfil');
    img.referrerPolicy = 'no-referrer';
    img.onerror = () => { img.onerror = null; img.src = SILHUETA_URL; };
    img.src = ehLink(link) ? link : SILHUETA_URL;
}

function acionarUpload() {
    if (oQueEstaFazendo !== 'inserindo' && oQueEstaFazendo !== 'alterando') {
        mostrarAviso("Clique em Inserir ou Alterar primeiro para poder escolher uma foto.");
        return;
    }
    document.getElementById('inputImagem').click();
}

function previewImagem() {
    const inputFiles = document.getElementById('inputImagem').files;
    if (inputFiles.length > 0) {
        const url = URL.createObjectURL(inputFiles[0]);
        document.getElementById('imgPerfil').src = url;
        document.getElementById('inputUrlFoto').value = ''; // arquivo tem prioridade sobre o link
        mostrarAviso("Foto escolhida! Clique em Salvar para concluir.");
    }
}

async function uploadImagemParaServidor(id) {
    const inputFiles = document.getElementById('inputImagem').files;
    if (inputFiles.length === 0) return;

    const formData = new FormData();
    formData.append('imagem', inputFiles[0]);

    try {
        await fetch(`${URL_API}/perfil/upload/${id}`, { method: 'POST', body: formData });
    } catch (erro) {
        console.error("Erro ao enviar imagem:", erro);
    }
}

async function procurePorChavePrimaria(chave) {
    try {
        const resposta = await fetch(`${URL_API}/perfil/${chave}`);
        const data = await resposta.json();
        return data.sucesso ? data.perfil : null;
    } catch (erro) {
        return null;
    }
}

async function procure() {
    const id_perfil = parseInt(document.getElementById("inputId_perfil").value, 10);
    if (isNaN(id_perfil)) {
        mostrarAviso("O ID do perfil não pode ser vazio e deve ser um número.");
        return;
    }

    perfil = await procurePorChavePrimaria(id_perfil);
    oQueEstaFazendo = '';

    if (perfil) {
        mostrarDadosPerfil(perfil);
        carregarImagem(id_perfil, perfil.foto_perfil);
        document.getElementById('inputUrlFoto').value = ehLink(perfil.foto_perfil) ? perfil.foto_perfil : '';
        visibilidadeDosBotoes('inline', 'none', 'inline', 'inline', 'none');
        mostrarAviso("Achou no banco, pode alterar ou excluir");
    } else {
        limparAtributos();
        carregarImagem(null);
        visibilidadeDosBotoes('inline', 'inline', 'none', 'none', 'none');
        mostrarAviso("Não achou no banco, pode inserir");
    }
}

function inserir() {
    bloquearAtributos(false);
    visibilidadeDosBotoes('none', 'none', 'none', 'none', 'inline');
    oQueEstaFazendo = 'inserindo';
    mostrarAviso("INSERINDO - Selecione o usuário, preencha os dados e clique em salvar");
}

function alterar() {
    bloquearAtributos(false);
    visibilidadeDosBotoes('none', 'none', 'none', 'none', 'inline');
    oQueEstaFazendo = 'alterando';
    mostrarAviso("ALTERANDO - Altere os dados (e a foto, se quiser) e clique em salvar");
}

function excluir() {
    bloquearAtributos(true);
    visibilidadeDosBotoes('none', 'none', 'none', 'none', 'inline');
    oQueEstaFazendo = 'excluindo';
    mostrarAviso("EXCLUINDO - Clique em salvar para confirmar a exclusão");
}

async function salvar() {
    let id_perfil = document.getElementById("inputId_perfil").value;
    const usuario_id_usuario = document.getElementById("selectUsuario_id_usuario").value || null;
    const nome_exibicao_perfil = document.getElementById("inputNome_exibicao_perfil").value.trim();
    const bio_perfil = document.getElementById("inputBio_perfil").value.trim();
    const data_nascimento_perfil = document.getElementById("inputData_nascimento_perfil").value || null;

    const temArquivo = document.getElementById('inputImagem').files.length > 0;
    const urlFoto = temArquivo ? '' : document.getElementById('inputUrlFoto').value.trim();
    if (urlFoto && !ehLink(urlFoto)) return mostrarAviso("O link da foto deve começar com http:// ou https://");

    const dadosPerfil = { id_perfil, usuario_id_usuario, nome_exibicao_perfil, bio_perfil, data_nascimento_perfil, foto_perfil: urlFoto };

    try {
        let resp, data;
        if (oQueEstaFazendo === 'inserindo') {
            resp = await fetch(`${URL_API}/perfil`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dadosPerfil) });
            data = await resp.json();
            if (!data.sucesso) return mostrarAviso(data.mensagem);
            await uploadImagemParaServidor(id_perfil);
            mostrarAviso("Inserido no Banco de Dados com sucesso!");
        } else if (oQueEstaFazendo === 'alterando') {
            resp = await fetch(`${URL_API}/perfil/${id_perfil}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dadosPerfil) });
            data = await resp.json();
            if (!data.sucesso) return mostrarAviso(data.mensagem);
            await uploadImagemParaServidor(id_perfil);
            mostrarAviso("Alterado no Banco de Dados com sucesso!");
        } else if (oQueEstaFazendo === 'excluindo') {
            resp = await fetch(`${URL_API}/perfil/${id_perfil}`, { method: 'DELETE' });
            data = await resp.json();
            if (!data.sucesso) return mostrarAviso(data.mensagem);
            carregarImagem(null);
            mostrarAviso("Excluído do Banco de Dados!");
        }

        visibilidadeDosBotoes('inline', 'none', 'none', 'none', 'none');
        limparAtributos();
        document.getElementById("inputId_perfil").value = "";
        listar();
    } catch (erro) {
        mostrarAviso("Erro ao efetuar operação no servidor.");
    }
}

async function listar() {
    const saida = document.getElementById("outputSaida");
    try {
        const resposta = await fetch(`${URL_API}/perfil/listar`);
        const data = await resposta.json();
        if (!data.sucesso) {
            saida.textContent = `Erro no banco: ${data.mensagem}`;
            return;
        }
        if (data.perfis.length === 0) {
            saida.textContent = "Nenhum perfil cadastrado.";
            return;
        }

        // textContent/DOM em vez de innerHTML: os dados vêm do banco e não podem virar HTML (XSS)
        const linhas = data.perfis.map((p) => {
            const foto = criarImagem(urlFotoPerfil(p.id_perfil, p.foto_perfil), p.nome_exibicao_perfil, SILHUETA_PADRAO_URL);
            return [foto, p.id_perfil, p.nome_exibicao_perfil, `${p.nome_usuario} (id ${p.usuario_id_usuario})`, p.email_usuario];
        });
        mostrarTabela(saida, montarTabela(["Foto", "ID", "Nome de exibição", "Usuário", "Email"], linhas));
    } catch (erro) {
        console.error("Erro ao listar:", erro);
        saida.textContent = "Servidor offline ou erro de conexão (CORS).";
    }
}

function cancelarOperacao() {
    limparAtributos();
    carregarImagem(null);
    bloquearAtributos(true);
    visibilidadeDosBotoes('inline', 'none', 'none', 'none', 'none');
    mostrarAviso("Cancelou a operação");
}

function mostrarAviso(mensagem) {
    document.getElementById("divAviso").textContent = mensagem;
}

function mostrarDadosPerfil(p) {
    document.getElementById("inputId_perfil").value = p.id_perfil;
    document.getElementById("selectUsuario_id_usuario").value = p.usuario_id_usuario;
    document.getElementById("inputNome_exibicao_perfil").value = p.nome_exibicao_perfil;
    document.getElementById("inputBio_perfil").value = p.bio_perfil || "";
    document.getElementById("inputData_nascimento_perfil").value = p.data_nascimento_perfil ? p.data_nascimento_perfil.substring(0, 10) : "";
    bloquearAtributos(true);
}

function limparAtributos() {
    perfil = null;
    oQueEstaFazendo = '';
    document.getElementById("selectUsuario_id_usuario").value = "";
    document.getElementById("inputNome_exibicao_perfil").value = "";
    document.getElementById("inputBio_perfil").value = "";
    document.getElementById("inputData_nascimento_perfil").value = "";
    document.getElementById("inputImagem").value = "";
    document.getElementById("inputUrlFoto").value = "";
    bloquearAtributos(true);
}

function bloquearAtributos(soLeitura) {
    document.getElementById("inputId_perfil").readOnly = !soLeitura;
    document.getElementById("selectUsuario_id_usuario").disabled = soLeitura;
    document.getElementById("inputNome_exibicao_perfil").readOnly = soLeitura;
    document.getElementById("inputBio_perfil").readOnly = soLeitura;
    document.getElementById("inputData_nascimento_perfil").readOnly = soLeitura;
    document.getElementById("inputUrlFoto").readOnly = soLeitura;
}

function visibilidadeDosBotoes(btP, btI, btA, btE, btS) {
    document.getElementById("btProcure").style.display = btP;
    document.getElementById("btInserir").style.display = btI;
    document.getElementById("btAlterar").style.display = btA;
    document.getElementById("btExcluir").style.display = btE;
    document.getElementById("btSalvar").style.display = btS;
    document.getElementById("btCancelar").style.display = btS;
}

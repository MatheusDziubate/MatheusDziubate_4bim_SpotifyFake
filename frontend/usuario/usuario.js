const URL_API = '';

let oQueEstaFazendo = '';
let usuario = null;

const hoje = new Date().toISOString().split("T")[0];
document.getElementById("inputData_criacao_usuario").max = hoje;

bloquearAtributos(true);

async function procurePorChavePrimaria(chave) {
    try {
        const resposta = await fetch(`${URL_API}/usuario/${chave}`);
        const data = await resposta.json();
        return data.sucesso ? data.usuario : null;
    } catch (erro) {
        return null;
    }
}

async function procure() {
    const id_usuario = parseInt(document.getElementById("inputId_usuario").value, 10);
    if (isNaN(id_usuario)) {
        mostrarAviso("O ID do usuário não pode ser vazio e deve ser um número.");
        return;
    }

    usuario = await procurePorChavePrimaria(id_usuario);
    oQueEstaFazendo = '';

    if (usuario) {
        mostrarDadosUsuario(usuario);
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
    mostrarAviso("INSERINDO - Digite os dados do usuário e clique em salvar");
}

function alterar() {
    bloquearAtributos(false);
    visibilidadeDosBotoes('none', 'none', 'none', 'none', 'inline');
    oQueEstaFazendo = 'alterando';
    mostrarAviso("ALTERANDO - Digite os novos dados e clique em salvar (senha em branco = manter a atual)");
}

function excluir() {
    bloquearAtributos(true);
    visibilidadeDosBotoes('none', 'none', 'none', 'none', 'inline');
    oQueEstaFazendo = 'excluindo';
    mostrarAviso("EXCLUINDO - Clique em salvar para confirmar a exclusão");
}

async function salvar() {
    const id_usuario = parseInt(document.getElementById("inputId_usuario").value, 10);
    const nome_usuario = document.getElementById("inputNome_usuario").value.trim();
    const email_usuario = document.getElementById("inputEmail_usuario").value.trim();
    const senha_usuario = document.getElementById("inputSenha_usuario").value;
    const data_criacao_usuario = document.getElementById("inputData_criacao_usuario").value || null;

    if (isNaN(id_usuario)) {
        mostrarAviso("O ID do usuário deve ser um número válido.");
        return;
    }

    const dadosUsuario = { id_usuario, nome_usuario, email_usuario, senha_usuario, data_criacao_usuario };

    try {
        let resp, data;
        if (oQueEstaFazendo === 'inserindo') {
            resp = await fetch(`${URL_API}/usuario`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dadosUsuario)
            });
            data = await resp.json();
            if (!data.sucesso) return mostrarAviso(data.mensagem);
            mostrarAviso("Inserido no Banco de Dados com sucesso!");
        } else if (oQueEstaFazendo === 'alterando') {
            resp = await fetch(`${URL_API}/usuario/${id_usuario}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dadosUsuario)
            });
            data = await resp.json();
            if (!data.sucesso) return mostrarAviso(data.mensagem);
            mostrarAviso("Alterado no Banco de Dados com sucesso!");
        } else if (oQueEstaFazendo === 'excluindo') {
            resp = await fetch(`${URL_API}/usuario/${id_usuario}`, { method: 'DELETE' });
            data = await resp.json();
            if (!data.sucesso) return mostrarAviso(data.mensagem);
            mostrarAviso("Excluído do Banco de Dados!");
        }

        visibilidadeDosBotoes('inline', 'none', 'none', 'none', 'none');
        limparAtributos();
        document.getElementById("inputId_usuario").value = "";
        listar();
    } catch (erro) {
        mostrarAviso("Erro ao efetuar operação no servidor.");
    }
}

async function listar() {
    const saida = document.getElementById("outputSaida");
    try {
        const resposta = await fetch(`${URL_API}/usuario/listar`);
        const data = await resposta.json();
        if (!data.sucesso) {
            saida.textContent = `Erro no banco: ${data.mensagem}`;
            return;
        }
        if (data.usuarios.length === 0) {
            saida.textContent = "Nenhum usuário cadastrado.";
            return;
        }

        // textContent/DOM em vez de innerHTML: nome e e-mail vêm do banco e não podem virar HTML (XSS)
        const linhas = data.usuarios.map((u) => {
            const foto = criarImagem(urlFotoPerfil(u.id_perfil, u.foto_perfil), u.nome_usuario, SILHUETA_PADRAO_URL);
            return [foto, u.id_usuario, u.nome_usuario, u.email_usuario, u.nome_exibicao_perfil];
        });
        mostrarTabela(saida, montarTabela(["Foto", "ID", "Nome", "Email", "Nome de exibição"], linhas));
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

function mostrarDadosUsuario(u) {
    document.getElementById("inputId_usuario").value = u.id_usuario;
    document.getElementById("inputNome_usuario").value = u.nome_usuario;
    document.getElementById("inputEmail_usuario").value = u.email_usuario;
    document.getElementById("inputSenha_usuario").value = "";
    document.getElementById("inputData_criacao_usuario").value = u.data_criacao_usuario ? u.data_criacao_usuario.substring(0, 10) : "";
    bloquearAtributos(true);
}

function limparAtributos() {
    usuario = null;
    oQueEstaFazendo = '';
    document.getElementById("inputNome_usuario").value = "";
    document.getElementById("inputEmail_usuario").value = "";
    document.getElementById("inputSenha_usuario").value = "";
    document.getElementById("inputData_criacao_usuario").value = "";
    bloquearAtributos(true);
}

function bloquearAtributos(soLeitura) {
    document.getElementById("inputId_usuario").readOnly = !soLeitura;
    document.getElementById("inputNome_usuario").readOnly = soLeitura;
    document.getElementById("inputEmail_usuario").readOnly = soLeitura;
    document.getElementById("inputSenha_usuario").readOnly = soLeitura;
    document.getElementById("inputData_criacao_usuario").readOnly = soLeitura;
}

function visibilidadeDosBotoes(btP, btI, btA, btE, btS) {
    document.getElementById("btProcure").style.display = btP;
    document.getElementById("btInserir").style.display = btI;
    document.getElementById("btAlterar").style.display = btA;
    document.getElementById("btExcluir").style.display = btE;
    document.getElementById("btSalvar").style.display = btS;
    document.getElementById("btCancelar").style.display = btS;
}
   
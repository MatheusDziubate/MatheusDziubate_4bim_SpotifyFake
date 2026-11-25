// ============================================
// Login - Spotify Fake (4º bimestre)
// O servidor cria o cookie de sessão; aqui só chamamos a API.
// ============================================

const URL_PLAYER = '../player/player.html';
const URL_ADMIN = '../menu/menu.html';

async function funclogar() {
    const nome = document.getElementById('InputNome').value.trim();
    const senha = document.getElementById('InputSenha').value;
    const saida = document.getElementById('saida');

    if (nome === '' || senha === '') {
        saida.textContent = 'Preencha todos os campos!';
        return;
    }

    try {
        const resposta = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome, senha })
        });
        const dados = await resposta.json();

        if (!dados.sucesso) {
            saida.textContent = dados.mensagem;
            return;
        }

        if (dados.usuario.admin) {
            abrirModalModo(dados.usuario.nome);   // admin escolhe: usuário ou admin
        } else {
            window.location.href = URL_PLAYER;
        }
    } catch (erro) {
        saida.textContent = 'Erro ao conectar no servidor. Verifique se ele está rodando.';
        console.error(erro);
    }
}

function abrirModalModo(nome) {
    document.getElementById('modalOla').textContent = 'Olá, ' + nome + '!';
    document.getElementById('modalModo').hidden = false;
}

async function escolherModo(modo) {
    try {
        const resposta = await fetch('/login/modo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ modo })
        });
        const dados = await resposta.json();
        if (!dados.sucesso) {
            document.getElementById('modalModo').hidden = true;
            document.getElementById('saida').textContent = dados.mensagem;
            return;
        }
        window.location.href = modo === 'admin' ? URL_ADMIN : URL_PLAYER;
    } catch (erro) {
        console.error(erro);
    }
}

// Enter envia o formulário
document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && document.getElementById('modalModo').hidden) funclogar();
});

// "Trocar modo" (link do player): admin já logado vê direto a pergunta
window.addEventListener('DOMContentLoaded', async () => {
    if (new URLSearchParams(window.location.search).get('trocar') !== '1') return;
    try {
        const resposta = await fetch('/login/me');
        if (!resposta.ok) return;
        const { usuario } = await resposta.json();
        if (usuario.admin) abrirModalModo(usuario.nome);
    } catch (erro) { /* sem sessão: mostra o login normal */ }
});

function MostrarSenha() {
    const senhaInput = document.getElementById('InputSenha');
    const botao = document.getElementById('BotaoVizualizar');

    if (senhaInput.type === 'password') {
        senhaInput.type = 'text';
        botao.classList.replace('bi-eye', 'bi-eye-slash');
    } else {
        senhaInput.type = 'password';
        botao.classList.replace('bi-eye-slash', 'bi-eye');
    }
}

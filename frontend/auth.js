// auth.js - sessao do navegador (usa o cookie "sessao" criado pelo servidor no login)
// Uso: <body data-acesso="login"> (qualquer logado) ou <body data-acesso="admin"> (so admin)

const PAGINA_LOGIN = '/frontend/login/login.html';
const PAGINA_PLAYER = '/frontend/player/player.html';

async function obterSessao() {
    try {
        const resposta = await fetch('/login/me');
        if (!resposta.ok) return null;
        const dados = await resposta.json();
        return dados.usuario;
    } catch (erro) {
        return null;
    }
}

async function logout() {
    try {
        await fetch('/login/logout', { method: 'POST' });
    } catch (erro) { /* segue para o login mesmo assim */ }
    window.location.href = PAGINA_LOGIN;
}

async function iniciarGuarda() {
    const exigido = document.body.dataset.acesso;
    if (!exigido) return;

    const usuario = await obterSessao();
    if (!usuario) {
        window.location.href = PAGINA_LOGIN;
        return;
    }
    if (exigido === 'admin' && !(usuario.admin && usuario.modo === 'admin')) {
        window.location.href = PAGINA_PLAYER;
        return;
    }

    const barra = document.getElementById('barraUsuario');
    if (barra) barra.textContent = '👤 ' + usuario.nome;
}

document.addEventListener('DOMContentLoaded', iniciarGuarda);

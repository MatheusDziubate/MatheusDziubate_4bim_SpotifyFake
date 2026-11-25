// ============================================
// Cadastro - Spotify Fake (4º bimestre)
// Agora de verdade: grava o usuário no banco (POST /usuario/cadastro)
// ============================================

async function funccadastro() {
    const nome = document.getElementById('InputNome').value.trim();
    const email = document.getElementById('InputEmail').value.trim();
    const senha = document.getElementById('InputSenha').value;
    const confirmarSenha = document.getElementById('InputConfirmarSenha').value;
    const saida = document.getElementById('saida');

    if (nome === '' || email === '' || senha === '' || confirmarSenha === '') {
        saida.textContent = 'Preencha todos os campos!';
        return;
    }
    if (senha !== confirmarSenha) {
        saida.textContent = 'As senhas não coincidem!';
        return;
    }
    if (senha.length < 6) {
        saida.textContent = 'A senha deve ter pelo menos 6 caracteres!';
        return;
    }

    try {
        const resposta = await fetch('/usuario/cadastro', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome, email, senha })
        });
        const dados = await resposta.json();

        if (dados.sucesso) {
            alert('Cadastro realizado com sucesso! Faça seu login.');
            window.location.href = '../login/login.html';
        } else {
            saida.textContent = dados.mensagem;
        }
    } catch (erro) {
        saida.textContent = 'Erro ao conectar no servidor.';
        console.error(erro);
    }
}

function MostrarSenha() {
    const senhaInput = document.getElementById('InputSenha');
    const confirmaInput = document.getElementById('InputConfirmarSenha');
    const botao = document.getElementById('BotaoVizualizar');

    if (senhaInput.type === 'password') {
        senhaInput.type = 'text';
        confirmaInput.type = 'text';
        botao.classList.replace('bi-eye', 'bi-eye-slash');
    } else {
        senhaInput.type = 'password';
        confirmaInput.type = 'password';
        botao.classList.replace('bi-eye-slash', 'bi-eye');
    }
}

// CRUD de Música (admin): adicionar (nome + artista + MP3 + capa), listar, alterar e remover.
const URL_API = '';

let idEditando = null;     // null = adicionando; número = alterando essa música
let duracaoSegundos = null;
let musicas = [];

// ---- Ouvir direto da tabela (para testar se o MP3/link toca) ----
const audioAdmin = new Audio();
let ouvindoId = null;            // música carregada no momento
const quebradas = new Set();     // músicas que deram erro ao tocar (link ou arquivo com problema)

function fmtTempo(seg) {
    seg = Math.max(0, Math.floor(Number(seg) || 0));
    return Math.floor(seg / 60) + ':' + String(seg % 60).padStart(2, '0');
}

function atualizarBotoesOuvir() {
    document.querySelectorAll('button.ouvir').forEach((b) => {
        const id = Number(b.dataset.id);
        const tocando = id === ouvindoId && !audioAdmin.paused;
        b.textContent = quebradas.has(id) ? '⚠' : (tocando ? '⏸' : '▶');
        b.title = quebradas.has(id) ? 'Não tocou: confira o link ou o arquivo' : (tocando ? 'Pausar' : 'Ouvir');
        b.classList.toggle('tocando', id === ouvindoId);
        b.classList.toggle('quebrada', quebradas.has(id));
    });
}

function ouvir(m) {
    if (ouvindoId === m.id_musica && audioAdmin.getAttribute('src')) {
        if (audioAdmin.paused) audioAdmin.play().catch(() => {}); else audioAdmin.pause();
        return;
    }
    ouvindoId = m.id_musica;
    quebradas.delete(m.id_musica);
    audioAdmin.src = urlRecurso(m.arquivo_musica);
    audioAdmin.play().catch(() => {});
    document.getElementById('miniTitulo').textContent = `${m.titulo_musica} — ${m.nome_artista || ''}`;
    document.getElementById('miniTempo').textContent = '0:00 / 0:00';
    document.getElementById('miniProgresso').value = 0;
    document.getElementById('miniPlayer').hidden = false;
    atualizarBotoesOuvir();
}

function pararOuvir() {
    audioAdmin.pause();
    audioAdmin.removeAttribute('src');
    audioAdmin.load();
    ouvindoId = null;
    document.getElementById('miniPlayer').hidden = true;
    atualizarBotoesOuvir();
}

audioAdmin.addEventListener('play', atualizarBotoesOuvir);
audioAdmin.addEventListener('pause', atualizarBotoesOuvir);
audioAdmin.addEventListener('ended', pararOuvir);
audioAdmin.addEventListener('timeupdate', () => {
    const total = isFinite(audioAdmin.duration) ? audioAdmin.duration : 0;
    document.getElementById('miniTempo').textContent = `${fmtTempo(audioAdmin.currentTime)} / ${fmtTempo(total)}`;
    document.getElementById('miniProgresso').value = total ? (audioAdmin.currentTime / total) * 100 : 0;
});
audioAdmin.addEventListener('error', () => {
    if (!audioAdmin.getAttribute('src') || ouvindoId === null) return;
    const m = musicas.find((x) => x.id_musica === ouvindoId);
    quebradas.add(ouvindoId);
    mostrarAviso(`Não foi possível tocar "${m ? m.titulo_musica : ouvindoId}". Confira o link ou o arquivo MP3.`);
    document.getElementById('miniPlayer').hidden = true;
    atualizarBotoesOuvir();
});

function criarBotaoOuvir(m) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'ouvir';
    b.dataset.id = m.id_musica;
    b.setAttribute('aria-label', `Ouvir ${m.titulo_musica}`);
    b.onclick = () => ouvir(m);
    return b;
}

function iniciar() {
    carregarArtistas();
    listar();
}

function mostrarAviso(mensagem) {
    document.getElementById('divAviso').textContent = mensagem;
}

// Sugestões de artistas já cadastrados (o admin também pode digitar um nome novo)
async function carregarArtistas() {
    try {
        const resposta = await fetch(`${URL_API}/artista/listar`);
        const dados = await resposta.json();
        if (!dados.sucesso) return;
        const datalist = document.getElementById('listaArtistas');
        datalist.innerHTML = '';
        dados.artistas.forEach((a) => {
            const op = document.createElement('option');
            op.value = a.nome_artista;
            datalist.appendChild(op);
        });
    } catch (erro) {
        console.error('Erro ao carregar artistas:', erro);
    }
}

function acionarUpload() {
    document.getElementById('inputImagem').click();
}

function previewImagem() {
    const arquivo = document.getElementById('inputImagem').files[0];
    if (arquivo) {
        document.getElementById('imgMusica').src = URL.createObjectURL(arquivo);
        document.getElementById('inputUrlCapa').value = ''; // arquivo tem prioridade sobre o link
    }
}

// Mostra na hora a capa do link digitado (se o link não carregar, volta para a capa padrão)
function previewLink() {
    const link = document.getElementById('inputUrlCapa').value.trim();
    const img = document.getElementById('imgMusica');
    img.onerror = () => { img.onerror = null; img.src = CAPA_PADRAO_URL; };
    img.referrerPolicy = 'no-referrer';
    img.src = ehLink(link) ? link : CAPA_PADRAO_URL;
}

// Descobre a duração do MP3 escolhido (o navegador lê os metadados)
function lerDuracao() {
    const arquivo = document.getElementById('inputMp3').files[0];
    const link = document.getElementById('inputUrlMp3').value.trim();
    duracaoSegundos = null;
    let origem = null;
    if (arquivo) origem = URL.createObjectURL(arquivo);
    else if (ehLink(link)) origem = link;
    if (!origem) return;
    const teste = new Audio(origem);
    teste.onloadedmetadata = () => {
        if (isFinite(teste.duration)) duracaoSegundos = Math.round(teste.duration);
    };
}

async function salvar() {
    const titulo = document.getElementById('inputTitulo_musica').value.trim();
    const artista = document.getElementById('inputNome_artista').value.trim();
    const mp3 = document.getElementById('inputMp3').files[0];
    const capa = document.getElementById('inputImagem').files[0];
    const urlMp3 = document.getElementById('inputUrlMp3').value.trim();
    const urlCapa = document.getElementById('inputUrlCapa').value.trim();

    if (!titulo) return mostrarAviso('Informe o nome da música.');
    if (!artista) return mostrarAviso('Informe o nome do artista.');
    if (idEditando === null && !mp3 && !urlMp3) return mostrarAviso('Escolha o arquivo MP3 ou informe o link do MP3.');
    if (urlMp3 && !ehLink(urlMp3)) return mostrarAviso('O link do MP3 deve começar com http:// ou https://');
    if (urlCapa && !ehLink(urlCapa)) return mostrarAviso('O link da capa deve começar com http:// ou https://');

    const form = new FormData();
    form.append('titulo_musica', titulo);
    form.append('nome_artista', artista);
    if (duracaoSegundos !== null) form.append('duracao_musica', duracaoSegundos);
    if (mp3) form.append('mp3', mp3);
    if (capa) form.append('capa', capa);
    if (!mp3 && urlMp3) form.append('url_mp3', urlMp3);      // arquivo tem prioridade sobre o link
    if (!capa && urlCapa) form.append('url_capa', urlCapa);

    const botao = document.getElementById('btSalvar');
    botao.disabled = true;
    mostrarAviso('Enviando...');

    try {
        const url = idEditando === null ? `${URL_API}/musica` : `${URL_API}/musica/${idEditando}`;
        const resposta = await fetch(url, { method: idEditando === null ? 'POST' : 'PUT', body: form });
        const dados = await resposta.json();

        if (!dados.sucesso) {
            mostrarAviso(dados.mensagem);
            return;
        }
        mostrarAviso(dados.mensagem);
        limparFormulario();
        carregarArtistas();
        listar();
    } catch (erro) {
        mostrarAviso('Erro ao enviar para o servidor.');
        console.error(erro);
    } finally {
        botao.disabled = false;
    }
}

function limparFormulario() {
    idEditando = null;
    duracaoSegundos = null;
    document.getElementById('inputTitulo_musica').value = '';
    document.getElementById('inputNome_artista').value = '';
    document.getElementById('inputMp3').value = '';
    document.getElementById('inputImagem').value = '';
    document.getElementById('inputUrlMp3').value = '';
    document.getElementById('inputUrlCapa').value = '';
    document.getElementById('imgMusica').src = CAPA_PADRAO_URL;
    document.getElementById('tituloForm').textContent = 'Adicionar música';
    document.getElementById('btSalvar').value = 'Salvar';
    document.getElementById('btCancelar').style.display = 'none';
}

function cancelarEdicao() {
    limparFormulario();
    mostrarAviso('Edição cancelada.');
}

function editar(id) {
    const m = musicas.find((x) => x.id_musica === id);
    if (!m) return;
    limparFormulario();
    idEditando = id;
    document.getElementById('inputTitulo_musica').value = m.titulo_musica;
    document.getElementById('inputNome_artista').value = m.nome_artista;
    document.getElementById('imgMusica').src = urlRecurso(m.capa_musica, CAPA_PADRAO_URL);
    // se a música usa links, mostra nos campos (para poder copiar/trocar)
    if (ehLink(m.arquivo_musica)) document.getElementById('inputUrlMp3').value = m.arquivo_musica;
    if (ehLink(m.capa_musica)) document.getElementById('inputUrlCapa').value = m.capa_musica;
    document.getElementById('tituloForm').textContent = `Alterar música [${id}]`;
    document.getElementById('btSalvar').value = 'Salvar alterações';
    document.getElementById('btCancelar').style.display = 'inline';
    mostrarAviso('ALTERANDO - o MP3 e a capa só são trocados se você escolher novos arquivos ou mudar os links.');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function remover(id) {
    const m = musicas.find((x) => x.id_musica === id);
    if (!confirm(`Remover a música "${m ? m.titulo_musica : id}"? Os arquivos também serão apagados.`)) return;

    try {
        const resposta = await fetch(`${URL_API}/musica/${id}`, { method: 'DELETE' });
        const dados = await resposta.json();
        mostrarAviso(dados.mensagem);
        if (dados.sucesso) {
            if (idEditando === id) limparFormulario();
            if (ouvindoId === id) pararOuvir();
            quebradas.delete(id);
            listar();
        }
    } catch (erro) {
        mostrarAviso('Erro ao remover no servidor.');
    }
}

async function listar() {
    const saida = document.getElementById('outputSaida');
    try {
        const resposta = await fetch(`${URL_API}/musica/listar`);
        const dados = await resposta.json();
        if (!dados.sucesso) {
            saida.textContent = `Erro no banco: ${dados.mensagem}`;
            return;
        }
        musicas = dados.musicas;
        if (musicas.length === 0) {
            saida.textContent = 'Nenhuma música cadastrada.';
            return;
        }

        const linhas = musicas.map((m) => {
            const src = ehLink(m.capa_musica)
                ? m.capa_musica
                : urlRecurso(m.capa_musica, CAPA_PADRAO_URL) + '?v=' + Date.now();
            const capa = criarImagem(src, m.titulo_musica, CAPA_PADRAO_URL);

            const acoes = document.createElement('span');
            const bEditar = document.createElement('button');
            bEditar.textContent = 'Editar';
            bEditar.onclick = () => editar(m.id_musica);
            const bRemover = document.createElement('button');
            bRemover.textContent = 'Remover';
            bRemover.className = 'remover';
            bRemover.onclick = () => remover(m.id_musica);
            acoes.append(bEditar, bRemover);

            return [capa, m.id_musica, m.titulo_musica, m.nome_artista, criarBotaoOuvir(m), acoes];
        });

        mostrarTabela(saida, montarTabela(['Capa', 'ID', 'Música', 'Artista', 'Ouvir', 'Ações'], linhas));
        atualizarBotoesOuvir();
    } catch (erro) {
        console.error('Erro ao listar:', erro);
        saida.textContent = 'Servidor offline ou erro de conexão.';
    }
}

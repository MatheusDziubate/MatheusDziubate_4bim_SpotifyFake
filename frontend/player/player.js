// ============================================
// Player - Spotify Fake (4º bimestre)
// App de uma página só: Início, Buscar, Artista, Músicas curtidas e Playlists.
// A música continua tocando enquanto você troca de aba (a barra de baixo é fixa).
// Tudo é montado com DOM/textContent (sem innerHTML com dados do banco = sem XSS).
// ============================================

const ARTISTA_PADRAO = 'Artista não informado';
const $ = (id) => document.getElementById(id);
const audio = $('audio');

// ---------- ícones (SVG fixo, nunca contém dados do banco) ----------
const ICONES = {
    play: '<path d="M8 5v14l11-7z"/>',
    pause: '<path d="M6 5h4v14H6zM14 5h4v14h-4z"/>',
    anterior: '<path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/>',
    proxima: '<path d="M16 6h2v12h-2zM6 18l8.5-6L6 6z"/>',
    embaralhar: '<path d="M10.6 9.2 5.4 4 4 5.4l5.2 5.2 1.4-1.4zM14.5 4l2.05 2.05L4 18.6 5.4 20 17.95 7.45 20 9.5V4h-5.5zm.33 9.41-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.05 2.05-3.12-3.14z"/>',
    repetir: '<path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/>',
    coracao: '<path d="M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3zm-4.4 15.55-.1.1-.1-.1C7.14 14.24 4 11.39 4 8.5 4 6.5 5.5 5 7.5 5c1.54 0 3.04.99 3.57 2.36h1.87C13.46 5.99 14.96 5 16.5 5c2 0 3.5 1.5 3.5 3.5 0 2.89-3.14 5.74-7.9 10.05z"/>',
    coracaoCheio: '<path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>',
    mais: '<path d="M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>',
    volume: '<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>',
    mudo: '<path d="M16.5 12A4.5 4.5 0 0 0 14 7.97v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.8 8.8 0 0 0 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3 3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a8.99 8.99 0 0 0 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4 9.91 6.09 12 8.18V4z"/>',
    home: '<path d="M12 3 2 12h3v8h6v-6h2v6h6v-8h3L12 3z"/>',
    busca: '<path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>',
    lista: '<path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/>',
    mais2: '<path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>',
    editar: '<path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>',
    lixeira: '<path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>',
    nota: '<path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z"/>'
};

function icone(nome) {
    const s = document.createElement('span');
    s.className = 'ico';
    s.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + ICONES[nome] + '</svg>'; // texto fixo acima
    return s;
}
function trocarIcone(botao, nome) { botao.replaceChildren(icone(nome)); }

// cria elemento: h('div', {className:'x', onclick: fn}, filho1, 'texto', ...)
function h(tag, props, ...filhos) {
    const e = document.createElement(tag);
    Object.entries(props || {}).forEach(([k, v]) => {
        if (v === null || v === undefined || v === false) return;
        if (k === 'className') e.className = v;
        else if (k === 'texto') e.textContent = v;
        else if (k.startsWith('on')) e[k] = v;
        else e.setAttribute(k, v === true ? '' : v);
    });
    filhos.flat().forEach((f) => { if (f !== null && f !== undefined && f !== false) e.append(f); });
    return e;
}

// ---------- estado ----------
let usuario = null;
let musicas = [];         // todas as músicas (do banco)
let artistas = [];        // artistas que têm música (com foto e total)
let playlists = [];       // playlists de quem está logado
let curtidas = new Set(); // ids das músicas curtidas
let fila = [];            // lista que está tocando agora
let idx = -1;             // posição na fila
let historico = [];       // posições já tocadas (para o botão "anterior" no aleatório)
let embaralhar = false;
let repetir = 'off';      // 'off' | 'all' | 'one'
let errosSeguidos = 0;
let versaoRota = 0;       // evita que uma tela antiga sobrescreva a nova
let rotaAtual = '';
let assinaturaCatalogo = '';
let ultimaBusca = '';

const faixaAtual = () => (idx >= 0 ? fila[idx] : null);

// ---------- util ----------
function fmt(seg) {
    seg = Math.max(0, Math.floor(Number(seg) || 0));
    return Math.floor(seg / 60) + ':' + String(seg % 60).padStart(2, '0');
}
function urlCapa(m) { return urlRecurso(m.capa_musica, CAPA_PADRAO_URL); }
function artistaReal(m) { return m.nome_artista && m.nome_artista !== ARTISTA_PADRAO; }

let timerToast = null;
function aviso(texto) {
    const t = $('toast');
    t.textContent = texto;
    t.hidden = false;
    clearTimeout(timerToast);
    timerToast = setTimeout(() => { t.hidden = true; }, 2600);
}

async function api(url, opcoes) {
    const resposta = await fetch(url, opcoes);
    if (resposta.status === 401) {
        window.location.href = PAGINA_LOGIN;
        throw new Error('Sessão expirada.');
    }
    let dados = null;
    try { dados = await resposta.json(); } catch (e) { /* sem corpo */ }
    if (!resposta.ok || !dados || !dados.sucesso) {
        throw new Error((dados && dados.mensagem) || 'Erro ao falar com o servidor.');
    }
    return dados;
}
const enviar = (metodo, corpo) => ({
    method: metodo,
    headers: { 'Content-Type': 'application/json' },
    body: corpo === undefined ? undefined : JSON.stringify(corpo)
});

// ============================================================
// Janelas (nome da playlist / confirmação)
// ============================================================
function janela({ titulo, texto = '', campo = false, valor = '', ok = 'OK', perigo = false }) {
    return new Promise((resolve) => {
        const modal = $('modal'), campoEl = $('modalCampo'), form = $('modalForm');
        $('modalTitulo').textContent = titulo;
        $('modalTexto').textContent = texto;
        $('modalOk').textContent = ok;
        campoEl.hidden = !campo;
        campoEl.value = valor;
        modal.hidden = false;
        (campo ? campoEl : $('modalOk')).focus();
        if (campo) campoEl.select();

        const fechar = (resultado) => {
            modal.hidden = true;
            form.onsubmit = null;
            $('modalCancelar').onclick = null;
            modal.onmousedown = null;
            document.removeEventListener('keydown', teclas, true);
            resolve(resultado);
        };
        const teclas = (e) => { if (e.key === 'Escape') { e.stopPropagation(); fechar(null); } };
        document.addEventListener('keydown', teclas, true);
        form.onsubmit = (e) => { e.preventDefault(); fechar(campo ? campoEl.value.trim() : true); };
        $('modalCancelar').onclick = () => fechar(null);
        modal.onmousedown = (e) => { if (e.target === modal) fechar(null); };
    });
}

// ============================================================
// Dados
// ============================================================
async function carregarMusicasEArtistas() {
    const [m, a] = await Promise.all([api('/musica/listar'), api('/catalogo/artistas')]);
    musicas = m.musicas.filter((x) => x.arquivo_musica);
    artistas = a.artistas;
    assinaturaCatalogo = musicas.map((x) => x.id_musica).join(',') + '|' + artistas.map((x) => x.id_artista + (x.foto_artista || '')).join(',');
}
async function carregarPlaylists() {
    playlists = (await api('/playlist/listar')).playlists;
    desenharPlaylistsLateral();
}
async function carregarCurtidas() {
    curtidas = new Set((await api('/curtida/listar')).musicas.map((x) => x.id_musica));
}

// ============================================================
// Reprodução
// ============================================================
function tocarLista(lista, indice) {
    if (!lista.length) return;
    fila = lista.slice();
    historico = [];
    errosSeguidos = 0;
    tocarIndice(indice);
}

function tocarIndice(i) {
    const m = fila[i];
    if (!m) return;
    idx = i;
    audio.src = urlRecurso(m.arquivo_musica);
    audio.play().catch(() => { /* o navegador pode pedir um clique antes de tocar */ });
    atualizarBarra();
}

function alternarPlay() {
    if (!faixaAtual()) {
        if (musicas.length) tocarLista(musicas, 0);
        return;
    }
    if (audio.paused) audio.play().catch(() => {}); else audio.pause();
}

function proxima(manual) {
    if (!fila.length) return;
    let novo;
    if (embaralhar && fila.length > 1) {
        do { novo = Math.floor(Math.random() * fila.length); } while (novo === idx);
    } else {
        novo = idx + 1;
    }
    if (novo >= fila.length) {
        if (manual || repetir === 'all') novo = 0;
        else { audio.pause(); audio.currentTime = 0; return; } // acabou a lista
    }
    historico.push(idx);
    tocarIndice(novo);
}

function anterior() {
    if (!fila.length) return;
    if (audio.currentTime > 3) { audio.currentTime = 0; return; }
    if (historico.length) tocarIndice(historico.pop());
    else tocarIndice(idx > 0 ? idx - 1 : fila.length - 1);
}

audio.addEventListener('ended', () => {
    if (repetir === 'one') { audio.currentTime = 0; audio.play().catch(() => {}); }
    else proxima(false);
});
audio.addEventListener('play', () => { document.body.classList.remove('pausado'); trocarIcone($('bpPlay'), 'pause'); });
audio.addEventListener('pause', () => { document.body.classList.add('pausado'); trocarIcone($('bpPlay'), 'play'); });
audio.addEventListener('playing', () => { errosSeguidos = 0; });
audio.addEventListener('error', () => {
    const m = faixaAtual();
    if (!m || !audio.getAttribute('src')) return;
    errosSeguidos++;
    aviso('Não foi possível tocar "' + m.titulo_musica + '".');
    if (errosSeguidos < fila.length) setTimeout(() => proxima(true), 900); // pula para a próxima
});

// barra de progresso
let arrastando = false;
const barra = $('bpBarra');
function pintar(range) {
    const max = Number(range.max) || 1;
    range.style.setProperty('--pct', (Number(range.value) / max * 100) + '%');
}
audio.addEventListener('timeupdate', () => {
    $('bpTempoAtual').textContent = fmt(audio.currentTime);
    if (!arrastando && isFinite(audio.duration) && audio.duration > 0) {
        barra.value = Math.round(audio.currentTime / audio.duration * 1000);
        pintar(barra);
    }
});
audio.addEventListener('loadedmetadata', () => {
    $('bpTempoTotal').textContent = fmt(audio.duration);
    barra.disabled = false;
});
barra.addEventListener('input', () => {
    arrastando = true;
    pintar(barra);
    if (isFinite(audio.duration)) $('bpTempoAtual').textContent = fmt(barra.value / 1000 * audio.duration);
});
barra.addEventListener('change', () => {
    if (isFinite(audio.duration)) audio.currentTime = barra.value / 1000 * audio.duration;
    arrastando = false;
});

// volume
const volume = $('bpVolume');
function aplicarVolume() {
    audio.volume = volume.value / 100;
    pintar(volume);
    trocarIcone($('bpMudo'), audio.muted || audio.volume === 0 ? 'mudo' : 'volume');
    try { localStorage.setItem('spotifyfake_volume', volume.value); } catch (e) { /* sem armazenamento */ }
}
volume.addEventListener('input', () => { audio.muted = false; aplicarVolume(); });
$('bpMudo').onclick = () => { audio.muted = !audio.muted; aplicarVolume(); };

// atualiza capa, título, coração e destaque da faixa que está tocando
function atualizarBarra() {
    const m = faixaAtual();
    const capa = $('bpCapa');
    const art = document.querySelector('.bp-textos');
    if (!m) {
        capa.src = CAPA_PADRAO_URL;
        $('bpTitulo').textContent = 'Nenhuma música tocando';
        art.replaceChildren(art.firstElementChild, h('span', { id: 'bpArtista', texto: 'Escolha uma música' }));
        $('bpCurtir').disabled = true;
        barra.value = 0; barra.disabled = true; pintar(barra);
        $('bpTempoAtual').textContent = '0:00'; $('bpTempoTotal').textContent = '0:00';
        marcarTocando();
        return;
    }
    capa.referrerPolicy = 'no-referrer';
    capa.onerror = () => { capa.onerror = null; capa.src = CAPA_PADRAO_URL; };
    capa.src = urlCapa(m);
    capa.alt = m.titulo_musica;
    $('bpTitulo').textContent = m.titulo_musica;
    const linkArtista = artistaReal(m)
        ? h('a', { id: 'bpArtista', href: '#/artista/' + m.artista_id_artista, texto: m.nome_artista })
        : h('span', { id: 'bpArtista', texto: m.nome_artista || '' });
    art.replaceChildren(art.firstElementChild, linkArtista);
    $('bpCurtir').disabled = false;
    barra.value = 0; pintar(barra);
    $('bpTempoAtual').textContent = '0:00';
    $('bpTempoTotal').textContent = m.duracao_musica ? fmt(m.duracao_musica) : '0:00';
    atualizarCoracoes();
    marcarTocando();
    document.title = m.titulo_musica + ' • ' + m.nome_artista;

    if ('mediaSession' in navigator && window.MediaMetadata) {
        navigator.mediaSession.metadata = new MediaMetadata({
            title: m.titulo_musica, artist: m.nome_artista || '',
            artwork: [{ src: new URL(urlCapa(m), location.href).href }]
        });
    }
}
if ('mediaSession' in navigator) {
    const acoes = { play: () => audio.play(), pause: () => audio.pause(), previoustrack: anterior, nexttrack: () => proxima(true) };
    Object.entries(acoes).forEach(([k, f]) => { try { navigator.mediaSession.setActionHandler(k, f); } catch (e) { /* não suportado */ } });
}

function marcarTocando() {
    const m = faixaAtual();
    document.querySelectorAll('.faixa[data-id]').forEach((el) => {
        el.classList.toggle('tocando', !!m && Number(el.dataset.id) === m.id_musica);
    });
}

// botões da barra
function iniciarBarra() {
    trocarIcone($('bpEmbaralhar'), 'embaralhar');
    trocarIcone($('bpAnterior'), 'anterior');
    trocarIcone($('bpPlay'), 'play');
    trocarIcone($('bpProxima'), 'proxima');
    trocarIcone($('bpRepetir'), 'repetir');
    trocarIcone($('bpCurtir'), 'coracao');
    trocarIcone($('btNovaPlaylist'), 'mais2');
    $('bpPlay').onclick = alternarPlay;
    $('bpProxima').onclick = () => proxima(true);
    $('bpAnterior').onclick = anterior;
    $('bpEmbaralhar').onclick = () => {
        embaralhar = !embaralhar;
        $('bpEmbaralhar').classList.toggle('ligado', embaralhar);
        aviso(embaralhar ? 'Modo aleatório ligado' : 'Modo aleatório desligado');
    };
    $('bpRepetir').onclick = () => {
        repetir = repetir === 'off' ? 'all' : repetir === 'all' ? 'one' : 'off';
        $('bpRepetir').classList.toggle('ligado', repetir !== 'off');
        $('bpRepetir').classList.toggle('um', repetir === 'one');
        aviso({ off: 'Repetir desligado', all: 'Repetir a lista', one: 'Repetir esta música' }[repetir]);
    };
    $('bpCurtir').onclick = () => { const m = faixaAtual(); if (m) alternarCurtida(m.id_musica); };
    $('btNovaPlaylist').onclick = () => novaPlaylist();

    let v = '80';
    try { v = localStorage.getItem('spotifyfake_volume') || '80'; } catch (e) { /* ok */ }
    volume.value = v;
    aplicarVolume();
    pintar(barra);
    document.body.classList.add('pausado');

    document.addEventListener('keydown', (e) => {
        const tag = (e.target.tagName || '').toLowerCase();
        if (e.code === 'Space' && !['input', 'textarea', 'button', 'a', 'select'].includes(tag) && $('modal').hidden) {
            e.preventDefault();
            alternarPlay();
        }
        if (e.key === 'Escape') fecharMenu();
    });
}

// ============================================================
// Curtir
// ============================================================
function atualizarCoracoes() {
    document.querySelectorAll('.btn-curtir[data-id]').forEach((b) => {
        const c = curtidas.has(Number(b.dataset.id));
        b.classList.toggle('curtida', c);
        b.title = c ? 'Remover das músicas curtidas' : 'Curtir';
        b.setAttribute('aria-label', b.title);
        trocarIcone(b, c ? 'coracaoCheio' : 'coracao');
    });
    const m = faixaAtual();
    const bt = $('bpCurtir');
    const c = !!m && curtidas.has(m.id_musica);
    bt.classList.toggle('curtida', c);
    bt.title = c ? 'Remover das músicas curtidas' : 'Curtir';
    trocarIcone(bt, c ? 'coracaoCheio' : 'coracao');
}

async function alternarCurtida(id) {
    const tinha = curtidas.has(id);
    if (tinha) curtidas.delete(id); else curtidas.add(id);
    atualizarCoracoes();
    try {
        await api('/curtida/' + id, enviar(tinha ? 'DELETE' : 'POST'));
        aviso(tinha ? 'Removida das músicas curtidas' : 'Adicionada às músicas curtidas');
        if (rotaAtual === 'curtidas') renderizarRota();
    } catch (erro) {
        if (tinha) curtidas.add(id); else curtidas.delete(id); // volta como estava
        atualizarCoracoes();
        aviso(erro.message);
    }
}

// ============================================================
// Playlists
// ============================================================
async function novaPlaylist(musicaParaAdicionar) {
    const nome = await janela({ titulo: 'Nova playlist', campo: true, valor: 'Minha playlist nº ' + (playlists.length + 1), ok: 'Criar' });
    if (!nome) return null;
    try {
        const { playlist } = await api('/playlist', enviar('POST', { nome }));
        if (musicaParaAdicionar) await api('/playlist/' + playlist.id_playlist + '/musica', enviar('POST', { id_musica: musicaParaAdicionar.id_musica }));
        await carregarPlaylists();
        aviso(musicaParaAdicionar ? 'Playlist criada e música adicionada' : 'Playlist criada');
        if (!musicaParaAdicionar) location.hash = '#/playlist/' + playlist.id_playlist;
        else if (rotaAtual === 'playlists') renderizarRota();
        return playlist;
    } catch (erro) { aviso(erro.message); return null; }
}

async function adicionarNaPlaylist(playlist, m) {
    try {
        const r = await api('/playlist/' + playlist.id_playlist + '/musica', enviar('POST', { id_musica: m.id_musica }));
        aviso(r.jaExistia ? 'Já estava em "' + playlist.nome_playlist + '"' : 'Adicionada a "' + playlist.nome_playlist + '"');
        await carregarPlaylists();
    } catch (erro) { aviso(erro.message); }
}

function criarMosaico(capas, classe) {
    const lista = (capas || []).filter(Boolean);
    if (!lista.length) return h('div', { className: 'mosaico vazio ' + (classe || '') }, icone('nota'));
    const usar = lista.length >= 4 ? lista.slice(0, 4) : [lista[0]];
    return h('div', { className: 'mosaico ' + (usar.length === 1 ? 'uma ' : '') + (classe || '') },
        usar.map((c) => criarImagem(urlRecurso(c, CAPA_PADRAO_URL), '', CAPA_PADRAO_URL)));
}

function desenharPlaylistsLateral() {
    const ul = $('listaPlaylistsLateral');
    ul.replaceChildren();
    if (!playlists.length) {
        ul.append(h('li', { className: 'vazio-lateral', texto: 'Você ainda não criou playlists. Clique no + para começar.' }));
        return;
    }
    playlists.forEach((p) => {
        const ativa = rotaAtual === 'playlist' && location.hash === '#/playlist/' + p.id_playlist;
        ul.append(h('li', {},
            h('a', { href: '#/playlist/' + p.id_playlist, className: ativa ? 'ativo' : '' },
                criarMosaico(p.capas),
                h('div', {}, h('strong', { texto: p.nome_playlist }),
                    h('small', { texto: 'Playlist • ' + p.total_musicas + (p.total_musicas === 1 ? ' música' : ' músicas') })))));
    });
}

// ============================================================
// Menu "..." de cada música
// ============================================================
function fecharMenu() { const m = $('menuCtx'); m.hidden = true; m.replaceChildren(); }

function abrirMenu(botao, m, opcoes) {
    const menu = $('menuCtx');
    const item = (texto, fn, classe) => h('button', { type: 'button', className: classe || '', texto, onclick: (e) => { e.stopPropagation(); fn(); } });

    function principal() {
        const itens = [
            item(curtidas.has(m.id_musica) ? 'Remover das músicas curtidas' : 'Curtir', () => { fecharMenu(); alternarCurtida(m.id_musica); }),
            item('Adicionar à playlist…', listaPlaylists)
        ];
        if (artistaReal(m)) itens.push(item('Ir para o artista', () => { fecharMenu(); location.hash = '#/artista/' + m.artista_id_artista; }));
        if (opcoes && opcoes.idPlaylist) {
            itens.push(h('div', { className: 'sep' }));
            itens.push(item('Remover desta playlist', async () => {
                fecharMenu();
                try {
                    await api('/playlist/' + opcoes.idPlaylist + '/musica/' + m.id_musica, enviar('DELETE'));
                    aviso('Removida da playlist');
                    await carregarPlaylists();
                    renderizarRota();
                } catch (erro) { aviso(erro.message); }
            }, 'perigo'));
        }
        menu.replaceChildren(...itens);
    }
    function listaPlaylists() {
        const itens = [
            item('← Voltar', principal),
            h('div', { className: 'titulo-menu', texto: 'Adicionar a' }),
            item('+ Nova playlist', async () => { fecharMenu(); await novaPlaylist(m); })
        ];
        playlists.forEach((p) => itens.push(item(p.nome_playlist, async () => { fecharMenu(); await adicionarNaPlaylist(p, m); })));
        menu.replaceChildren(...itens);
    }

    principal();
    menu.hidden = false;
    const r = botao.getBoundingClientRect();
    const larg = menu.offsetWidth, alt = menu.offsetHeight;
    menu.style.left = Math.max(8, Math.min(r.right - larg, window.innerWidth - larg - 8)) + 'px';
    menu.style.top = Math.max(8, r.bottom + alt > window.innerHeight - 8 ? r.top - alt - 4 : r.bottom + 4) + 'px';
}
document.addEventListener('mousedown', (e) => {
    const menu = $('menuCtx');
    if (!menu.hidden && !menu.contains(e.target)) fecharMenu();
});

// ============================================================
// Componentes de tela
// ============================================================
function criarListaFaixas(faixas, opcoes) {
    opcoes = opcoes || {};
    const lista = h('div', { className: 'faixas' },
        h('div', { className: 'faixas-cab' },
            h('span', { texto: '#' }), h('span', { texto: 'Título' }), h('span'), h('span', { className: 'col-dur', texto: 'Tempo' }), h('span')));

    faixas.forEach((m, i) => {
        const artista = artistaReal(m)
            ? h('a', { className: 'faixa-artista', href: '#/artista/' + m.artista_id_artista, texto: m.nome_artista, onclick: (e) => e.stopPropagation() })
            : h('span', { className: 'faixa-artista', texto: m.nome_artista || '' });

        const btCurtir = h('button', { type: 'button', className: 'btn-icone btn-curtir', 'data-id': m.id_musica, onclick: (e) => { e.stopPropagation(); alternarCurtida(m.id_musica); } });
        const btMais = h('button', { type: 'button', className: 'btn-icone', title: 'Mais opções', 'aria-label': 'Mais opções' }, icone('mais'));
        btMais.onclick = (e) => { e.stopPropagation(); abrirMenu(btMais, m, opcoes); };

        const linha = h('div', { className: 'faixa', 'data-id': m.id_musica, onclick: () => tocarLista(faixas, i) },
            h('div', { className: 'faixa-num' },
                h('span', { className: 'n', texto: String(i + 1) }),
                (() => { const p = icone('play'); p.classList.add('ico-play'); return p; })(),
                h('span', { className: 'eq' }, h('i'), h('i'), h('i'))),
            h('div', { className: 'faixa-info' },
                criarImagem(urlCapa(m), m.titulo_musica, CAPA_PADRAO_URL),
                h('div', {}, h('span', { className: 'faixa-titulo', texto: m.titulo_musica }), artista)),
            btCurtir,
            h('span', { className: 'faixa-dur', texto: m.duracao_musica ? fmt(m.duracao_musica) : '' }),
            btMais);
        lista.append(linha);
    });
    return lista;
}

function cartaoArtista(a) {
    const total = a.total_musicas;
    return h('a', { className: 'cartao artista', href: '#/artista/' + a.id_artista },
        criarImagem(urlRecurso(a.foto_artista, SILHUETA_PADRAO_URL), a.nome_artista, SILHUETA_PADRAO_URL),
        h('strong', { texto: a.nome_artista }),
        h('small', { texto: 'Artista • ' + total + (total === 1 ? ' música' : ' músicas') }));
}

function botoesTocar(faixas) {
    const tocar = h('button', { type: 'button', className: 'btn-play-grande', title: 'Tocar', 'aria-label': 'Tocar' }, icone('play'));
    tocar.onclick = () => { if (!faixas.length) return; embaralharLigado(false); tocarLista(faixas, 0); };
    const aleatorio = h('button', { type: 'button', className: 'btn-icone', title: 'Tocar em ordem aleatória', 'aria-label': 'Aleatório' }, icone('embaralhar'));
    aleatorio.onclick = () => { if (!faixas.length) return; embaralharLigado(true); tocarLista(faixas, Math.floor(Math.random() * faixas.length)); };
    return h('div', { className: 'acoes' }, tocar, aleatorio);
}
function embaralharLigado(ligado) {
    embaralhar = ligado;
    $('bpEmbaralhar').classList.toggle('ligado', ligado);
}

// ============================================================
// Telas
// ============================================================
function saudacao() {
    const hora = new Date().getHours();
    const s = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
    return s + ', ' + usuario.nome;
}

function telaInicio(c) {
    c.append(h('h1', { texto: saudacao() }));
    const visiveis = artistas.filter((a) => a.nome_artista !== ARTISTA_PADRAO);
    if (visiveis.length) {
        c.append(h('h2', { texto: 'Artistas' }), h('div', { className: 'cartoes' }, visiveis.map(cartaoArtista)));
    }
    c.append(h('h2', { texto: 'Todas as músicas' }));
    if (!musicas.length) { c.append(h('p', { className: 'mensagem-vazia', texto: 'Nenhuma música disponível ainda.' })); return; }
    c.append(botoesTocar(musicas), criarListaFaixas(musicas));
}

function telaBuscar(c) {
    const campo = h('input', { type: 'search', id: 'campoBusca', placeholder: 'O que você quer ouvir?', autocomplete: 'off', maxlength: '100', 'aria-label': 'Buscar músicas ou artistas' });
    campo.value = ultimaBusca;
    const resultados = h('div', { id: 'resultadosBusca' });
    c.append(h('h1', { texto: 'Buscar' }), h('div', { className: 'busca-campo' }, icone('busca'), campo),
        h('p', { className: 'busca-dica', texto: 'Escreva o nome de uma música ou artista — pode ser só o começo ou com erro de digitação.' }), resultados);

    let contador = 0, timer = null;
    async function buscar() {
        const q = campo.value.trim();
        ultimaBusca = campo.value;
        const minha = ++contador;
        if (!q) { vazioBusca(resultados); return; }
        try {
            const dados = await api('/catalogo/busca?q=' + encodeURIComponent(q));
            if (minha !== contador) return; // chegou uma busca mais nova
            desenharResultados(resultados, q, dados);
        } catch (erro) {
            if (minha === contador) resultados.replaceChildren(h('p', { className: 'mensagem-vazia', texto: erro.message }));
        }
    }
    campo.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(buscar, 250); });
    buscar();
    campo.focus();
}

function vazioBusca(destino) {
    const visiveis = artistas.filter((a) => a.nome_artista !== ARTISTA_PADRAO);
    destino.replaceChildren(
        visiveis.length ? h('h2', { texto: 'Explorar artistas' }) : null,
        visiveis.length ? h('div', { className: 'cartoes' }, visiveis.map(cartaoArtista)) : null);
    marcarTocando(); atualizarCoracoes();
}

function desenharResultados(destino, q, dados) {
    destino.replaceChildren();
    if (!dados.melhor && !dados.artistas.length && !dados.musicas.length) {
        destino.append(h('p', { className: 'mensagem-vazia', texto: 'Nenhum resultado para "' + q + '". Confira a escrita ou tente outro nome.' }));
        return;
    }
    const topo = h('div', { className: 'busca-topo' });
    if (dados.melhor) {
        if (dados.melhor.tipo === 'artista') {
            const a = dados.melhor.artista;
            topo.append(h('div', {},
                h('h2', { texto: 'Melhor resultado' }),
                h('a', { className: 'melhor artista', href: '#/artista/' + a.id_artista },
                    criarImagem(urlRecurso(a.foto_artista, SILHUETA_PADRAO_URL), a.nome_artista, SILHUETA_PADRAO_URL),
                    h('strong', { texto: a.nome_artista }),
                    h('span', {}, h('span', { className: 'tag', texto: 'Artista' }), ' ' + a.total_musicas + (a.total_musicas === 1 ? ' música' : ' músicas')))));
        } else {
            const m = dados.melhor.musica;
            const card = h('button', { type: 'button', className: 'melhor', onclick: () => tocarLista(dados.musicas, dados.musicas.findIndex((x) => x.id_musica === m.id_musica)) },
                criarImagem(urlCapa(m), m.titulo_musica, CAPA_PADRAO_URL),
                h('strong', { texto: m.titulo_musica }),
                h('span', {}, m.nome_artista || '', h('span', { className: 'tag', texto: 'Música' })));
            topo.append(h('div', {}, h('h2', { texto: 'Melhor resultado' }), card));
        }
    }
    if (dados.musicas.length) {
        topo.append(h('div', {}, h('h2', { texto: 'Músicas' }), criarListaFaixas(dados.musicas)));
    }
    destino.append(topo);
    if (dados.artistas.length) {
        destino.append(h('h2', { texto: 'Artistas' }), h('div', { className: 'cartoes' }, dados.artistas.map(cartaoArtista)));
    }
    marcarTocando(); atualizarCoracoes();
}

function telaArtista(c, id) {
    const faixas = musicas.filter((m) => m.artista_id_artista === id);
    const info = artistas.find((a) => a.id_artista === id);
    if (!info && !faixas.length) {
        c.append(h('p', { className: 'mensagem-vazia' }, 'Artista não encontrado. ', h('a', { href: '#/buscar', texto: 'Buscar artistas' })));
        return;
    }
    const nome = info ? info.nome_artista : faixas[0].nome_artista;
    const meta = [info && info.genero_artista, info && info.pais_artista, faixas.length + (faixas.length === 1 ? ' música' : ' músicas')].filter(Boolean).join(' • ');
    const foto = criarImagem(urlRecurso(info && info.foto_artista, SILHUETA_PADRAO_URL), nome, SILHUETA_PADRAO_URL);
    foto.className = 'capa-grande redonda';
    c.append(h('div', { className: 'cabecalho' }, foto,
        h('div', {}, h('div', { className: 'rotulo', texto: 'Artista' }), h('h1', { texto: nome }),
            h('div', { className: 'meta', texto: meta }),
            info && info.bio_artista ? h('p', { className: 'bio', texto: info.bio_artista }) : null)));
    document.title = nome + ' • Spotify Fake';
    if (!faixas.length) return;
    c.append(botoesTocar(faixas), h('h2', { texto: 'Músicas' }), criarListaFaixas(faixas));
}

async function telaCurtidas(c, versao) {
    const dados = await api('/curtida/listar');
    if (versao !== versaoRota) return;
    const faixas = dados.musicas.filter((m) => m.arquivo_musica);
    curtidas = new Set(dados.musicas.map((m) => m.id_musica));
    c.append(h('div', { className: 'cabecalho' },
        h('div', { className: 'capa-grande capa-curtidas' }, icone('coracaoCheio')),
        h('div', {}, h('div', { className: 'rotulo', texto: 'Playlist' }), h('h1', { texto: 'Músicas curtidas' }),
            h('div', { className: 'meta', texto: usuario.nome + ' • ' + faixas.length + (faixas.length === 1 ? ' música' : ' músicas') }))));
    if (!faixas.length) {
        c.append(h('p', { className: 'mensagem-vazia' }, 'Você ainda não curtiu nenhuma música. Toque no coração de uma música para ela aparecer aqui. ', h('a', { href: '#/buscar', texto: 'Buscar músicas' })));
        return;
    }
    c.append(botoesTocar(faixas), criarListaFaixas(faixas));
}

function telaPlaylists(c) {
    c.append(h('h1', { texto: 'Suas playlists' }));
    const nova = h('button', { type: 'button', className: 'cartao nova', onclick: () => novaPlaylist() }, icone('mais2'), h('span', { texto: 'Nova playlist' }));
    const cartoes = playlists.map((p) => h('a', { className: 'cartao', href: '#/playlist/' + p.id_playlist },
        criarMosaico(p.capas), h('strong', { texto: p.nome_playlist }),
        h('small', { texto: p.total_musicas + (p.total_musicas === 1 ? ' música' : ' músicas') })));
    c.append(h('div', { className: 'cartoes' }, nova, cartoes));
}

async function telaPlaylist(c, id, versao) {
    let dados;
    try { dados = await api('/playlist/' + id); }
    catch (erro) {
        if (versao !== versaoRota) return;
        c.append(h('p', { className: 'mensagem-vazia' }, 'Playlist não encontrada. ', h('a', { href: '#/playlists', texto: 'Ver minhas playlists' })));
        return;
    }
    if (versao !== versaoRota) return;
    const { playlist } = dados;
    const faixas = dados.musicas.filter((m) => m.arquivo_musica);
    const capas = faixas.map((m) => m.capa_musica);

    const editar = h('button', { type: 'button', className: 'btn-icone', title: 'Renomear', 'aria-label': 'Renomear playlist' }, icone('editar'));
    editar.onclick = async () => {
        const nome = await janela({ titulo: 'Renomear playlist', campo: true, valor: playlist.nome_playlist, ok: 'Salvar' });
        if (!nome) return;
        try { await api('/playlist/' + id, enviar('PUT', { nome })); await carregarPlaylists(); renderizarRota(); }
        catch (erro) { aviso(erro.message); }
    };
    const excluir = h('button', { type: 'button', className: 'btn-icone', title: 'Excluir playlist', 'aria-label': 'Excluir playlist' }, icone('lixeira'));
    excluir.onclick = async () => {
        const ok = await janela({ titulo: 'Excluir playlist?', texto: '"' + playlist.nome_playlist + '" será apagada. As músicas continuam no catálogo.', ok: 'Excluir' });
        if (!ok) return;
        try { await api('/playlist/' + id, enviar('DELETE')); await carregarPlaylists(); aviso('Playlist excluída'); location.hash = '#/playlists'; }
        catch (erro) { aviso(erro.message); }
    };

    c.append(h('div', { className: 'cabecalho' }, criarMosaico(capas, 'capa-grande'),
        h('div', {}, h('div', { className: 'rotulo', texto: 'Playlist' }), h('h1', { texto: playlist.nome_playlist }),
            h('div', { className: 'meta', texto: usuario.nome + ' • ' + faixas.length + (faixas.length === 1 ? ' música' : ' músicas') }))));
    document.title = playlist.nome_playlist + ' • Spotify Fake';

    const acoes = faixas.length ? botoesTocar(faixas) : h('div', { className: 'acoes' });
    acoes.append(editar, excluir);
    c.append(acoes);
    if (!faixas.length) {
        c.append(h('p', { className: 'mensagem-vazia' }, 'Esta playlist está vazia. Use o menu ⋯ de qualquer música e escolha "Adicionar à playlist". ', h('a', { href: '#/buscar', texto: 'Buscar músicas' })));
        return;
    }
    c.append(criarListaFaixas(faixas, { idPlaylist: id }));
}

// ============================================================
// Roteador (a aba fica na parte do # do endereço: dá para usar voltar/avançar)
// ============================================================
function lerRota() {
    const partes = (location.hash || '#/').replace(/^#\/?/, '').split('/');
    const nome = partes[0] || 'inicio';
    const id = parseInt(partes[1], 10);
    return { nome, id: isNaN(id) ? null : id };
}

async function renderizarRota() {
    const { nome, id } = lerRota();
    const versao = ++versaoRota;
    const c = $('conteudo');
    const rolagem = rotaAtual === nome ? c.scrollTop : 0;
    fecharMenu();
    const montada = document.createDocumentFragment();
    const area = h('div', { className: 'pagina' });
    montada.append(area);
    rotaAtual = ['inicio', 'buscar', 'artista', 'curtidas', 'playlists', 'playlist'].includes(nome) ? nome : 'inicio';
    document.title = 'Spotify Fake';

    document.querySelectorAll('.menu-principal a').forEach((a) => {
        a.classList.toggle('ativo', a.dataset.rota === rotaAtual || (rotaAtual === 'playlist' && a.dataset.rota === 'playlists'));
    });

    try {
        if (rotaAtual === 'inicio') telaInicio(area);
        else if (rotaAtual === 'buscar') telaBuscar(area);
        else if (rotaAtual === 'artista') telaArtista(area, id);
        else if (rotaAtual === 'curtidas') await telaCurtidas(area, versao);
        else if (rotaAtual === 'playlists') telaPlaylists(area);
        else if (rotaAtual === 'playlist') await telaPlaylist(area, id, versao);
    } catch (erro) {
        area.append(h('p', { className: 'mensagem-vazia', texto: erro.message }));
    }
    if (versao !== versaoRota) return; // o usuário já foi para outra aba

    c.replaceChildren(area);
    c.scrollTop = rolagem;
    desenharPlaylistsLateral();
    atualizarCoracoes();
    marcarTocando();
    if (rotaAtual === 'buscar' && !rolagem) $('campoBusca') && $('campoBusca').focus();
}

window.addEventListener('hashchange', () => { rotaAtual = ''; renderizarRota(); });

// ============================================================
// Atualização automática: músicas novas/removidas pelo admin aparecem sozinhas
// ============================================================
async function atualizarCatalogo() {
    try {
        const antes = assinaturaCatalogo;
        await carregarMusicasEArtistas();
        if (antes === assinaturaCatalogo) return;

        // a música que estava tocando foi removida pelo admin
        const m = faixaAtual();
        if (m && !musicas.some((x) => x.id_musica === m.id_musica)) {
            audio.pause(); audio.removeAttribute('src'); audio.load();
            fila = []; idx = -1;
            atualizarBarra();
            aviso('A música que estava tocando foi removida.');
        }
        const digitando = document.activeElement && document.activeElement.id === 'campoBusca';
        if (!digitando && $('modal').hidden && $('menuCtx').hidden) renderizarRota();
    } catch (erro) { console.error('Erro ao atualizar o catálogo:', erro); }
}

// ============================================================
// Início
// ============================================================
window.addEventListener('DOMContentLoaded', async () => {
    usuario = await obterSessao();
    if (!usuario) return; // auth.js já redireciona para o login

    if (usuario.admin && usuario.modo === 'admin') $('linkAdmin').hidden = false;
    if (usuario.admin) $('linkTrocar').hidden = false;

    document.querySelectorAll('.menu-principal a').forEach((a) => a.prepend(icone(a.dataset.icone)));
    iniciarBarra();
    try {
        await Promise.all([carregarMusicasEArtistas(), carregarPlaylists(), carregarCurtidas()]);
    } catch (erro) {
        $('conteudo').replaceChildren(h('p', { className: 'mensagem-vazia', texto: 'Erro ao carregar o catálogo. ' + erro.message }));
        return;
    }
    await renderizarRota();
    setInterval(atualizarCatalogo, 15000);
});

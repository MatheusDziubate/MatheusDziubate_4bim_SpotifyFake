// Resumo do painel do administrador: números, avisos e rankings (tudo vem de GET /admin/estatisticas)

function no(tag, classe, texto) {
    const e = document.createElement(tag);
    if (classe) e.className = classe;
    if (texto !== undefined) e.textContent = texto;
    return e;
}

const pt = (n) => Number(n).toLocaleString('pt-BR');
const plural = (n, um, varios) => `${pt(n)} ${n === 1 ? um : varios}`;

// Uma linha de ranking: imagem + título/subtítulo + valor
function linhaRanking(imagemSrc, padrao, redonda, titulo, sub, valor) {
    const li = no('li', 'item-ranking');
    const img = criarImagem(imagemSrc, titulo, padrao);
    if (redonda) img.classList.add('redonda');
    const textos = no('div', 'item-textos');
    textos.append(no('strong', '', titulo));
    if (sub) textos.append(no('span', '', sub));
    li.append(img, textos);
    if (valor) li.append(no('span', 'item-valor', valor));
    return li;
}

function preencherLista(ol, itens, vazio) {
    ol.textContent = '';
    if (!itens.length) {
        ol.append(no('li', 'ranking-vazio', vazio));
        return;
    }
    itens.forEach((i) => ol.append(i));
}

function desenharNumeros(t) {
    const caixa = document.getElementById('numeros');
    caixa.textContent = '';
    [
        ['Músicas', t.musicas, '../musica/musica.html'],
        ['Artistas', t.artistas, '../artista/artista.html'],
        ['Usuários', t.usuarios, '../usuario/usuario.html'],
        ['Playlists', t.playlists, null],
        ['Curtidas', t.curtidas, null]
    ].forEach(([rotulo, valor, link]) => {
        const item = no(link ? 'a' : 'div', 'numero');
        if (link) item.href = link;
        item.append(no('strong', '', pt(valor)), no('span', '', rotulo));
        caixa.append(item);
    });
}

// Coisas que pedem uma ação do administrador (só aparecem se houver)
function desenharAtencao(t) {
    const ul = document.getElementById('atencao');
    ul.textContent = '';
    const avisos = [];
    if (t.musicas_sem_artista > 0) {
        avisos.push([`${plural(t.musicas_sem_artista, 'música está', 'músicas estão')} sem artista informado.`, 'Corrigir em Músicas', '../musica/musica.html']);
    }
    if (t.artistas_sem_foto > 0) {
        avisos.push([`${plural(t.artistas_sem_foto, 'artista ainda não tem', 'artistas ainda não têm')} foto.`, 'Adicionar em Artistas', '../artista/artista.html']);
    }
    avisos.forEach(([texto, acao, link]) => {
        const li = no('li');
        const a = no('a', '', acao);
        a.href = link;
        li.append(no('span', '', texto), a);
        ul.append(li);
    });
    ul.hidden = avisos.length === 0;
}

function desenharGeneros(generos) {
    const caixa = document.getElementById('listaGeneros');
    caixa.textContent = '';
    if (!generos.length) {
        caixa.append(no('p', 'ranking-vazio', 'Nenhuma música cadastrada.'));
        return;
    }
    const maior = Math.max(...generos.map((g) => g.musicas));
    generos.forEach((g) => {
        const linha = no('div', 'genero');
        const barra = no('div', 'genero-barra');
        const preenchimento = no('div', 'genero-preenchimento');
        preenchimento.style.width = Math.max(4, Math.round((g.musicas / maior) * 100)) + '%';
        barra.append(preenchimento);
        linha.append(no('span', 'genero-nome', g.genero), barra, no('span', 'item-valor', pt(g.musicas)));
        caixa.append(linha);
    });
}

async function carregarResumo() {
    const status = document.getElementById('resumoStatus');
    try {
        const resposta = await fetch('/admin/estatisticas');
        const d = await resposta.json();
        if (!d.sucesso) throw new Error(d.mensagem || 'Erro ao carregar o resumo.');

        desenharNumeros(d.totais);
        desenharAtencao(d.totais);

        preencherLista(document.getElementById('listaCurtidas'),
            d.mais_curtidas.map((m) => linhaRanking(urlRecurso(m.capa_musica, CAPA_PADRAO_URL), CAPA_PADRAO_URL, false,
                m.titulo_musica, m.nome_artista, plural(m.curtidas, 'curtida', 'curtidas'))),
            'Ninguém curtiu músicas ainda.');

        preencherLista(document.getElementById('listaArtistas'),
            d.artistas_top.map((a) => linhaRanking(urlRecurso(a.foto_artista, SILHUETA_PADRAO_URL), SILHUETA_PADRAO_URL, true,
                a.nome_artista, '', plural(a.musicas, 'música', 'músicas'))),
            'Nenhum artista com músicas ainda.');

        preencherLista(document.getElementById('listaRecentes'),
            d.recentes.map((m) => linhaRanking(urlRecurso(m.capa_musica, CAPA_PADRAO_URL), CAPA_PADRAO_URL, false,
                m.titulo_musica, m.nome_artista, '')),
            'Nenhuma música cadastrada.');

        desenharGeneros(d.generos);

        status.hidden = true;
        document.getElementById('resumoConteudo').hidden = false;
    } catch (erro) {
        console.error('Erro no resumo:', erro);
        status.hidden = false;
        status.textContent = `Não foi possível carregar o resumo: ${erro.message}`;
    }
}

window.addEventListener('DOMContentLoaded', carregarResumo);

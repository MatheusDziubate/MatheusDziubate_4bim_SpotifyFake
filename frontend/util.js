// util.js - funcoes de apoio compartilhadas pelas telas

const CAPA_PADRAO_URL = '/imagens/capa_padrao.png';
const SILHUETA_PADRAO_URL = '/imagens/silhueta.png';

// true se o texto e um link http/https (aceita so esses dois protocolos)
function ehLink(texto) {
    return /^https?:\/\//i.test(String(texto || '').trim());
}

// Devolve a URL pronta para <img>/<audio>: links ficam como estao,
// caminhos locais (ex.: "imagens/musica_1.png") ganham a "/" na frente.
function urlRecurso(caminho, padrao) {
    if (!caminho) return padrao || '';
    return ehLink(caminho) ? caminho : '/' + String(caminho).replace(/^\/+/, '');
}

// Foto de um perfil: link salvo no banco, senao o arquivo perfil_ID.png, senao a silhueta
function urlFotoPerfil(idPerfil, fotoPerfil) {
    if (fotoPerfil) return urlRecurso(fotoPerfil, SILHUETA_PADRAO_URL);
    if (idPerfil) return `/imagens/perfil_${idPerfil}.png`;
    return SILHUETA_PADRAO_URL;
}

// Cria um <img> com fallback caso a imagem nao carregue (link quebrado, arquivo inexistente)
function criarImagem(src, alt, fallback) {
    const img = document.createElement('img');
    img.alt = alt || '';
    img.referrerPolicy = 'no-referrer'; // alguns sites bloqueiam hotlink quando ha referrer
    img.loading = 'lazy';               // listas grandes: so baixa a imagem quando ela aparece na tela
    img.onerror = () => {
        img.onerror = null;
        img.src = fallback;
    };
    img.src = src;
    return img;
}

// Monta uma tabela com DOM (textContent = sem risco de XSS).
// colunas: ['Foto', 'ID', ...]; linhas: array de arrays de (string | number | Node)
function montarTabela(colunas, linhas) {
    const tabela = document.createElement('table');
    tabela.className = 'tabela-registros';
    const cab = document.createElement('tr');
    colunas.forEach((c) => {
        const th = document.createElement('th');
        th.textContent = c;
        cab.appendChild(th);
    });
    const thead = document.createElement('thead');
    thead.appendChild(cab);
    tabela.appendChild(thead);

    const corpo = document.createElement('tbody');
    linhas.forEach((celulas) => {
        const tr = document.createElement('tr');
        celulas.forEach((c) => {
            const td = document.createElement('td');
            if (c instanceof Node) { td.appendChild(c); td.className = 'sem-filtro'; } // foto e botoes nao entram na busca
            else td.textContent = c === null || c === undefined || c === '' ? '-' : String(c);
            tr.appendChild(td);
        });
        corpo.appendChild(tr);
    });
    tabela.appendChild(corpo);
    return tabela;
}

// minusculas e sem acento (para comparar "Ana" com "ána")
function semAcento(texto) {
    return String(texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

// Mostra a tabela dentro de "saida" com um campo de busca em cima: filtra as linhas enquanto
// digita (ignora acento e maiusculas) e mostra "X de Y". O texto digitado fica guardado em
// saida.dataset.filtro, entao continua valendo quando a lista e recarregada (depois de salvar, por ex.)
function mostrarTabela(saida, tabela) {
    const linhas = Array.from(tabela.querySelectorAll('tbody tr'));
    const textos = linhas.map((tr) => semAcento(
        Array.from(tr.children).filter((td) => !td.classList.contains('sem-filtro')).map((td) => td.textContent).join(' ')));

    const campo = document.createElement('input');
    campo.type = 'search';
    campo.className = 'campo-filtro';
    campo.placeholder = 'Filtrar a lista...';
    campo.setAttribute('aria-label', 'Filtrar a lista');
    campo.value = saida.dataset.filtro || '';

    const contagem = document.createElement('span');
    contagem.className = 'contagem-filtro';

    const vazio = document.createElement('p');
    vazio.className = 'filtro-vazio';
    vazio.hidden = true;

    const barra = document.createElement('div');
    barra.className = 'barra-filtro';
    barra.append(campo, contagem);

    function aplicar() {
        const q = semAcento(campo.value).trim();
        let visiveis = 0;
        linhas.forEach((tr, i) => {
            const mostra = !q || textos[i].includes(q);
            tr.hidden = !mostra;
            if (mostra) visiveis++;
        });
        contagem.textContent = q ? `${visiveis} de ${linhas.length}` : `${linhas.length} no total`;
        vazio.hidden = visiveis > 0;
        vazio.textContent = `Nenhum resultado para "${campo.value.trim()}".`;
        saida.dataset.filtro = campo.value;
    }
    campo.addEventListener('input', aplicar);

    saida.textContent = '';
    saida.append(barra, tabela, vazio);
    aplicar();
}

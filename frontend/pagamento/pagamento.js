// Tela de pagamento SIMULADA (demonstração do enunciado: "sistemas de pagamento" não precisam ser implementados).
// Nenhum dado digitado aqui é enviado ao servidor nem salvo.

const PLANOS = [
    { id: 'gratis', nome: 'Gratuito', preco: 0, periodo: '', itens: ['Ouvir todas as músicas', 'Reprodução em sequência'], selo: '' },
    { id: 'premium', nome: 'Premium', preco: 21.9, periodo: '/mês', itens: ['Tudo do plano Gratuito', 'Sem interrupções', 'Qualidade máxima'], selo: 'Mais popular' },
    { id: 'anual', nome: 'Premium Anual', preco: 199.9, periodo: '/ano', itens: ['Tudo do plano Premium', '2 meses grátis', 'Pague uma vez por ano'], selo: '' }
];

let planoEscolhido = null;

// ---------- Pix (BR Code, padrão do Banco Central) ----------
// Chave FICTÍCIA de demonstração: o código é válido e o QR Code é lido normalmente,
// mas nenhum banco acha esse destinatário, então nada é cobrado.
// (Para testar com a sua chave de verdade, troque aqui — e só aí.)
const PIX_DEMO = { chave: '+5544991641465', nome: 'SPOTIFY FAKE', cidade: 'BRASIL' };

// monta um campo do BR Code: ID (2 dígitos) + tamanho (2 dígitos) + valor
function tlv(id, valor) {
    return id + String(valor.length).padStart(2, '0') + valor;
}

// só letras maiúsculas sem acento, números e espaço (o que o padrão Pix aceita nos nomes)
function textoPix(t, max) {
    return t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9 ]/g, '').slice(0, max);
}

// CRC16-CCITT (polinômio 0x1021, início 0xFFFF): os 4 últimos caracteres do código Pix
function crc16(texto) {
    let crc = 0xFFFF;
    for (let i = 0; i < texto.length; i++) {
        crc ^= texto.charCodeAt(i) << 8;
        for (let b = 0; b < 8; b++) {
            crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) & 0xFFFF : (crc << 1) & 0xFFFF;
        }
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
}

function gerarCodigoPix(valor, txid) {
    const conta = tlv('00', 'br.gov.bcb.pix') + tlv('01', PIX_DEMO.chave);
    const base = tlv('00', '01')                                // versão do payload
        + tlv('26', conta)                                      // chave Pix
        + tlv('52', '0000')                                     // categoria do comerciante
        + tlv('53', '986')                                      // moeda: real
        + tlv('54', valor.toFixed(2))                           // valor
        + tlv('58', 'BR')
        + tlv('59', textoPix(PIX_DEMO.nome, 25))                // nome do recebedor
        + tlv('60', textoPix(PIX_DEMO.cidade, 15))              // cidade do recebedor
        + tlv('62', tlv('05', txid))                            // identificador da cobrança
        + '6304';                                               // CRC vem logo depois
    return base + crc16(base);
}

function txidAleatorio() {
    const letras = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let t = 'SPFAKE';
    for (let i = 0; i < 12; i++) t += letras[Math.floor(Math.random() * letras.length)];
    return t;
}

const saida = document.getElementById('saida');

function dinheiro(valor) {
    return 'R$ ' + valor.toFixed(2).replace('.', ',');
}

function mostrar(msg, tipo) {
    saida.textContent = msg;
    saida.className = 'saida-pagamento' + (tipo ? ' ' + tipo : '');
}

window.addEventListener('DOMContentLoaded', async () => {
    const usuario = await obterSessao();
    if (!usuario) return; // auth.js já redireciona para o login
    if (usuario.admin && usuario.modo === 'admin') document.getElementById('linkAdmin').hidden = false;
    desenharPlanos();
});

function desenharPlanos() {
    const area = document.getElementById('planos');
    area.textContent = '';

    PLANOS.forEach((p) => {
        const card = document.createElement('div');
        card.className = 'plano' + (planoEscolhido && planoEscolhido.id === p.id ? ' escolhido' : '');
        card.onclick = () => escolherPlano(p.id);

        if (p.selo) {
            const selo = document.createElement('span');
            selo.className = 'selo';
            selo.textContent = p.selo;
            card.appendChild(selo);
        }

        const titulo = document.createElement('h2');
        titulo.textContent = p.nome;

        const preco = document.createElement('div');
        preco.className = 'preco';
        preco.textContent = p.preco === 0 ? 'Grátis' : dinheiro(p.preco);
        if (p.periodo) {
            const per = document.createElement('small');
            per.textContent = ' ' + p.periodo;
            preco.appendChild(per);
        }

        const lista = document.createElement('ul');
        p.itens.forEach((t) => {
            const li = document.createElement('li');
            li.textContent = '✔ ' + t;
            lista.appendChild(li);
        });

        const botao = document.createElement('button');
        botao.type = 'button';
        botao.textContent = planoEscolhido && planoEscolhido.id === p.id ? 'Selecionado' : 'Escolher';

        card.append(titulo, preco, lista, botao);
        area.appendChild(card);
    });
}

function escolherPlano(id) {
    planoEscolhido = PLANOS.find((p) => p.id === id);
    desenharPlanos();
    mostrar('');

    const gratis = planoEscolhido.preco === 0;
    document.getElementById('resumoPlano').textContent = gratis
        ? `Plano ${planoEscolhido.nome}: não há nada a pagar.`
        : `Plano ${planoEscolhido.nome} — ${dinheiro(planoEscolhido.preco)} ${planoEscolhido.periodo}`;

    // plano gratuito não pede forma de pagamento
    document.getElementById('selectForma').disabled = gratis;
    document.querySelectorAll('#formaCartao input').forEach((i) => { i.disabled = gratis; });
    document.getElementById('btConfirmar').disabled = false;
    esconderPix();
    atualizarTextoBotao();
}

// o texto do botão depende do plano e da forma de pagamento
function atualizarTextoBotao() {
    const bt = document.getElementById('btConfirmar');
    if (!planoEscolhido) return;
    if (planoEscolhido.preco === 0) bt.textContent = 'Continuar no plano Gratuito';
    else if (document.getElementById('selectForma').value === 'pix') bt.textContent = 'Gerar QR Code Pix';
    else bt.textContent = 'Confirmar assinatura';
}

function trocarForma() {
    const forma = document.getElementById('selectForma').value;
    document.getElementById('formaCartao').hidden = forma !== 'cartao';
    document.getElementById('formaPix').hidden = forma !== 'pix';
    document.getElementById('formaBoleto').hidden = forma !== 'boleto';
    esconderPix();
    atualizarTextoBotao();
    mostrar('');
}

function esconderPix() {
    document.getElementById('areaPix').hidden = true;
}

// Mostra o QR Code (gerado aqui no navegador, nada vai para o servidor) e o "copia e cola"
function mostrarPix() {
    const codigo = gerarCodigoPix(planoEscolhido.preco, txidAleatorio());
    const qr = qrcode(0, 'M');          // tamanho automático, correção de erro média
    qr.addData(codigo);
    qr.make();

    document.getElementById('qrPix').src = qr.createDataURL(8, 4); // quadradinhos de 8px + borda branca
    document.getElementById('pixValor').textContent = `${dinheiro(planoEscolhido.preco)} — Plano ${planoEscolhido.nome}`;
    document.getElementById('pixCodigo').value = codigo;
    const area = document.getElementById('areaPix');
    area.hidden = false;
    area.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    mostrar('Aguardando pagamento... (simulação)', '');
}

async function copiarPix() {
    const campo = document.getElementById('pixCodigo');
    try {
        await navigator.clipboard.writeText(campo.value);
    } catch (erro) {
        campo.select();                    // navegadores sem permissão de área de transferência
        document.execCommand('copy');
    }
    mostrar('Código Pix copiado!', 'ok');
}

function simularPagamentoPix() {
    esconderPix();
    mostrar(`✔ Pagamento Pix simulado aprovado! Plano ${planoEscolhido.nome} ativado (demonstração).`, 'ok');
}

function mascaraCartao(input) {
    const d = input.value.replace(/\D/g, '').slice(0, 16);
    input.value = d.replace(/(.{4})/g, '$1 ').trim();
}

function mascaraValidade(input) {
    const d = input.value.replace(/\D/g, '').slice(0, 4);
    input.value = d.length > 2 ? d.slice(0, 2) + '/' + d.slice(2) : d;
}

// Confere o número do cartão com o algoritmo de Luhn (só para a demonstração)
function luhnOk(numero) {
    let soma = 0;
    let dobra = false;
    for (let i = numero.length - 1; i >= 0; i--) {
        let n = parseInt(numero[i], 10);
        if (dobra) { n *= 2; if (n > 9) n -= 9; }
        soma += n;
        dobra = !dobra;
    }
    return soma % 10 === 0;
}

function validadeOk(texto) {
    const m = /^(\d{2})\/(\d{2})$/.exec(texto);
    if (!m) return false;
    const mes = parseInt(m[1], 10);
    const ano = 2000 + parseInt(m[2], 10);
    if (mes < 1 || mes > 12) return false;
    const agora = new Date();
    return ano > agora.getFullYear() || (ano === agora.getFullYear() && mes >= agora.getMonth() + 1);
}

function codigoAleatorio(tamanho) {
    let t = '';
    for (let i = 0; i < tamanho; i++) t += Math.floor(Math.random() * 10);
    return t;
}

function confirmarPagamento() {
    if (!planoEscolhido) return mostrar('Escolha um plano primeiro.', 'erro');

    if (planoEscolhido.preco === 0) {
        return mostrar('Você continua no plano Gratuito. Boa música! 🎧', 'ok');
    }

    const forma = document.getElementById('selectForma').value;

    if (forma === 'cartao') {
        const nome = document.getElementById('inputNomeCartao').value.trim();
        const numero = document.getElementById('inputNumeroCartao').value.replace(/\D/g, '');
        const validade = document.getElementById('inputValidade').value;
        const cvv = document.getElementById('inputCvv').value;

        if (nome.length < 3) return mostrar('Informe o nome impresso no cartão.', 'erro');
        if (numero.length !== 16 || !luhnOk(numero)) return mostrar('Número de cartão inválido.', 'erro');
        if (!validadeOk(validade)) return mostrar('Validade inválida ou cartão vencido.', 'erro');
        if (cvv.length < 3) return mostrar('CVV inválido.', 'erro');

        // limpa os campos: nada fica guardado na tela
        ['inputNomeCartao', 'inputNumeroCartao', 'inputValidade', 'inputCvv'].forEach((id) => {
            document.getElementById(id).value = '';
        });
        return mostrar(`✔ Pagamento simulado aprovado! Plano ${planoEscolhido.nome} ativado (demonstração).`, 'ok');
    }

    if (forma === 'pix') return mostrarPix();

    mostrar(`Boleto (exemplo): ${codigoAleatorio(5)}.${codigoAleatorio(5)} ${codigoAleatorio(5)}.${codigoAleatorio(6)} — simulação, nada foi cobrado.`, 'ok');
}

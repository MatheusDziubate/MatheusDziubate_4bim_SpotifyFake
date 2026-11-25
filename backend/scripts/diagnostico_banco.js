// ============================================================
// node backend/scripts/diagnostico_banco.js
// Só LÊ: lista todos os bancos do seu PostgreSQL e mostra quantas músicas e artistas
// cada um tem, para descobrir qual é o banco que o site realmente usa.
// Não mostra a senha e não altera nada.
// ============================================================
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { Client } = require('pg');

const base = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
};

async function contar(banco) {
    const c = new Client({ ...base, database: banco });
    try {
        await c.connect();
        const r = await c.query(`SELECT (SELECT COUNT(*) FROM public.musica)::int AS musicas,
                                        (SELECT COUNT(*) FROM public.artista)::int AS artistas,
                                        (SELECT COUNT(*) FROM public.usuario)::int AS usuarios`);
        return r.rows[0];
    } catch (e) {
        return { musicas: '-', artistas: '-', usuarios: '-', obs: 'sem as tabelas do projeto' };
    } finally {
        await c.end().catch(() => {});
    }
}

async function main() {
    console.log(`\nServidor PostgreSQL do seu .env: ${base.host}:${base.port} (usuário ${base.user})`);
    console.log(`Banco que o site usa (DB_NAME): ${process.env.DB_NAME}\n`);

    const admin = new Client({ ...base, database: process.env.DB_NAME });
    await admin.connect();
    const lista = await admin.query('SELECT datname FROM pg_database WHERE NOT datistemplate ORDER BY datname');
    const info = await admin.query('SELECT version() AS versao, inet_server_port() AS porta');
    await admin.end();
    console.log(`Versão: ${info.rows[0].versao.split(',')[0]} | porta: ${info.rows[0].porta}\n`);

    console.log(`Bancos encontrados neste servidor: ${lista.rows.length}\n`);
    for (const { datname } of lista.rows) {
        const n = await contar(datname);
        const marca = datname === process.env.DB_NAME ? '   <-- ESTE É O DO SEU .env' : '';
        if (n.obs) console.log(`- ${datname}: (${n.obs})${marca}`);
        else console.log(`- ${datname}: ${n.musicas} músicas, ${n.artistas} artistas, ${n.usuarios} usuários${marca}`);
    }
    console.log('\nFim.');
}

main().catch((e) => { console.error('Erro:', e.message); process.exit(1); });

// Middlewares de autenticacao: leem o cookie assinado "sessao" criado no login.

function lerSessao(req) {
    const s = req.signedCookies && req.signedCookies.sessao;
    return s && typeof s === 'object' ? s : null;
}

// Exige que exista alguem logado (usuario comum ou admin)
exports.exigirLogin = (req, res, next) => {
    const sessao = lerSessao(req);
    if (!sessao) {
        return res.status(401).json({ sucesso: false, mensagem: 'Faça login para continuar.' });
    }
    req.usuario = sessao;
    next();
};

// Exige o usuario admin que escolheu entrar como admin
exports.exigirAdmin = (req, res, next) => {
    const sessao = lerSessao(req);
    if (!sessao) {
        return res.status(401).json({ sucesso: false, mensagem: 'Faça login para continuar.' });
    }
    if (!sessao.admin || sessao.modo !== 'admin') {
        return res.status(403).json({ sucesso: false, mensagem: 'Acesso restrito ao administrador.' });
    }
    req.usuario = sessao;
    next();
};

const express = require('express');
const router = express.Router();
const { exigirLogin } = require('../middlewares/authMiddleware');
const catalogoController = require('../controllers/catalogoController');

// Catálogo para o player (qualquer usuário logado)
router.get('/artistas', exigirLogin, catalogoController.listarArtistas);
router.get('/busca', exigirLogin, catalogoController.buscar);

module.exports = router;

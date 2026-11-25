const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuarioController');
const { exigirAdmin } = require('../middlewares/authMiddleware');

// Cadastro publico (tela de cadastro)
router.post('/cadastro', usuarioController.cadastrar);

// CRUD de Usuarios (somente admin)
router.get('/listar', exigirAdmin, usuarioController.listarUsuarios);
router.get('/:id', exigirAdmin, usuarioController.obterUsuario);
router.post('/', exigirAdmin, usuarioController.criarUsuario);
router.put('/:id', exigirAdmin, usuarioController.atualizarUsuario);
router.delete('/:id', exigirAdmin, usuarioController.deletarUsuario);

module.exports = router;

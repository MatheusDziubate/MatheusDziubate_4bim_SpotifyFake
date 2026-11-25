const express = require('express');
const multer = require('multer');
const router = express.Router();
const { exigirAdmin } = require('../middlewares/authMiddleware');
const perfilController = require('../controllers/perfilController');

// Multer em memoria para o Sharp processar a imagem antes de salvar
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// CRUD de Perfil (1:1 com Usuario)
router.get('/listar', exigirAdmin, perfilController.listarPerfis);
router.get('/:id', exigirAdmin, perfilController.obterPerfil);
router.post('/', exigirAdmin, perfilController.criarPerfil);
router.put('/:id', exigirAdmin, perfilController.atualizarPerfil);
router.delete('/:id', exigirAdmin, perfilController.deletarPerfil);

// Rota para upload da foto de perfil
router.post('/upload/:id', exigirAdmin, upload.single('imagem'), perfilController.uploadImagem);

module.exports = router;

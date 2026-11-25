const express = require('express');
const multer = require('multer');
const router = express.Router();
const { exigirAdmin } = require('../middlewares/authMiddleware');
const artistaController = require('../controllers/artistaController');

// Multer em memoria: o controller valida a imagem e o Sharp a redimensiona antes de salvar
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10 MB
});
const campoFoto = upload.single('foto');

// CRUD de Artistas
router.get('/listar', exigirAdmin, artistaController.listarArtistas);
router.get('/:id', exigirAdmin, artistaController.obterArtista);
router.post('/', exigirAdmin, campoFoto, artistaController.criarArtista);
router.put('/:id', exigirAdmin, campoFoto, artistaController.atualizarArtista);
router.delete('/:id', exigirAdmin, artistaController.deletarArtista);

module.exports = router;

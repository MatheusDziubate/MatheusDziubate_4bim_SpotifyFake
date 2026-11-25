const express = require('express');
const multer = require('multer');
const router = express.Router();
const musicaController = require('../controllers/musicaController');
const { exigirLogin, exigirAdmin } = require('../middlewares/authMiddleware');

// Multer em memoria: o controller valida o MP3 e o Sharp processa a capa antes de salvar
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 30 * 1024 * 1024 } // 30 MB por arquivo
});
const camposUpload = upload.fields([{ name: 'mp3', maxCount: 1 }, { name: 'capa', maxCount: 1 }]);

// Usuarios logados (player) podem listar as musicas
router.get('/listar', exigirLogin, musicaController.listarMusicas);

// Gerenciamento de musicas: somente admin
router.get('/:id', exigirAdmin, musicaController.obterMusica);
router.post('/', exigirAdmin, camposUpload, musicaController.criarMusica);
router.put('/:id', exigirAdmin, camposUpload, musicaController.atualizarMusica);
router.delete('/:id', exigirAdmin, musicaController.deletarMusica);

module.exports = router;

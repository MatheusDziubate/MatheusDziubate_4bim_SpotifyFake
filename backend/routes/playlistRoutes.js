const express = require('express');
const router = express.Router();
const { exigirLogin } = require('../middlewares/authMiddleware');
const playlistController = require('../controllers/playlistController');

// Cada usuário só enxerga e mexe nas próprias playlists
router.get('/listar', exigirLogin, playlistController.listarPlaylists);
router.get('/:id', exigirLogin, playlistController.obterPlaylist);
router.post('/', exigirLogin, playlistController.criarPlaylist);
router.put('/:id', exigirLogin, playlistController.renomearPlaylist);
router.delete('/:id', exigirLogin, playlistController.excluirPlaylist);
router.post('/:id/musica', exigirLogin, playlistController.adicionarMusica);
router.delete('/:id/musica/:idMusica', exigirLogin, playlistController.removerMusica);

module.exports = router;

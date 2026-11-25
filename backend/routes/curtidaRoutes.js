const express = require('express');
const router = express.Router();
const { exigirLogin } = require('../middlewares/authMiddleware');
const curtidaController = require('../controllers/curtidaController');

router.get('/listar', exigirLogin, curtidaController.listarCurtidas);
router.post('/:idMusica', exigirLogin, curtidaController.curtir);
router.delete('/:idMusica', exigirLogin, curtidaController.descurtir);

module.exports = router;

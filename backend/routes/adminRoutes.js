const express = require('express');
const router = express.Router();
const { exigirAdmin } = require('../middlewares/authMiddleware');
const adminController = require('../controllers/adminController');

// Resumo do painel do administrador
router.get('/estatisticas', exigirAdmin, adminController.estatisticas);

module.exports = router;

const express = require('express');
const router = express.Router();
const loginController = require('../controllers/loginController');
const { exigirLogin } = require('../middlewares/authMiddleware');

router.post('/', loginController.login);
router.post('/logout', loginController.logout);
router.post('/modo', exigirLogin, loginController.escolherModo);
router.get('/me', exigirLogin, loginController.me);

module.exports = router;

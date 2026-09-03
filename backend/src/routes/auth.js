const router = require('express').Router();
const { login, me, changePassword, updateProfile, uploadFotoProfil } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.post('/login',           login);
router.get('/me',               authenticate, me);
router.put('/change-password',  authenticate, changePassword);
router.put('/profile',          authenticate, updateProfile);
router.post('/foto-profil',     authenticate, upload.single('foto'), uploadFotoProfil);

module.exports = router;

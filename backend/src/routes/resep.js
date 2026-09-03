const router = require('express').Router();
const c = require('../controllers/resepController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.get('/antrian',           authorize('apoteker','admin'), c.getAntrian);
router.get('/:id',               c.getById);
router.post('/',                 authorize('dokter','admin'), c.create);
router.patch('/:id/konfirmasi',  authorize('apoteker','admin'), c.konfirmasi);

module.exports = router;

const router = require('express').Router();
const c = require('../controllers/rekamMedisController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

// getByKunjungan: dokter & admin saja
router.get('/kunjungan/:kunjunganId', authorize('dokter', 'admin'), c.getByKunjungan);

// getByPasien: dokter & admin saja — apoteker diblokir di route DAN di controller (defense-in-depth)
router.get('/pasien/:pasienId',       authorize('dokter', 'admin'), c.getByPasien);

router.post('/',   authorize('dokter', 'admin'), c.create);
router.put('/:id', authorize('dokter', 'admin'), c.update);

module.exports = router;

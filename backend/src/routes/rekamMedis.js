const router = require('express').Router();
const c = require('../controllers/rekamMedisController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

// GET: dokter (hanya milik sendiri, dicek di controller) + admin & owner (bisa lihat semua)
router.get('/kunjungan/:kunjunganId', authorize('dokter', 'admin', 'owner'), c.getByKunjungan);
router.get('/pasien/:pasienId',       authorize('dokter', 'admin', 'owner'), c.getByPasien);

// POST & PUT: hanya dokter yang boleh membuat dan mengubah rekam medis
// Admin dan owner bukan tenaga medis — hanya boleh melihat, tidak mengubah
router.post('/',   authorize('dokter'), c.create);
router.put('/:id', authorize('dokter'), c.update);

module.exports = router;

const router = require('express').Router();
const c = require('../controllers/pasienController');
const { authenticate, authorize } = require('../middleware/auth');
const { validatePasien } = require('../utils/validate');

router.use(authenticate);
// FIX PII: apoteker tidak perlu data pribadi lengkap pasien (alamat, telepon,
// tanggal lahir) — kebutuhan mereka (nama, no_rm, kelas) sudah tercakup di
// endpoint /resep/antrian dan /resep/:id. Hanya admin & dokter yang boleh akses.
router.get('/',       authorize('admin', 'dokter'), c.getAll);
router.get('/:id',    authorize('admin', 'dokter'), c.getById);
router.post('/',      authorize('admin'), validatePasien, c.create);
router.put('/:id',    authorize('admin'), validatePasien, c.update);
router.delete('/:id', authorize('admin'), c.remove);

module.exports = router;

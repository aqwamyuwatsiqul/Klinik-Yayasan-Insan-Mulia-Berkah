const router = require('express').Router();
const c = require('../controllers/laporanController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.get('/dashboard', c.getDashboard);
router.get('/kunjungan', authorize('admin'), c.getLaporanKunjungan);
router.get('/obat',      authorize('admin','apoteker'), c.getLaporanObat);

module.exports = router;

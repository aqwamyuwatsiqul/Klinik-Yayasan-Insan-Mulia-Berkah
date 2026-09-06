const router = require('express').Router();
const c = require('../controllers/laporanController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
// Dashboard: semua role boleh akses
router.get('/dashboard', c.getDashboard);
// Laporan kunjungan: admin (operasional) + owner (manajemen)
router.get('/kunjungan', authorize('admin', 'owner'), c.getLaporanKunjungan);
// Laporan obat: admin + apoteker + owner
router.get('/obat',      authorize('admin', 'apoteker', 'owner'), c.getLaporanObat);

module.exports = router;

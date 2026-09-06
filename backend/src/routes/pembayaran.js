const router = require('express').Router();
const c = require('../controllers/pembayaranController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
// Antrian kasir: kasir, admin, owner bisa lihat
router.get('/antrian',                      authorize('kasir','admin','owner'), c.getAntrian);
// Preview tagihan sebelum proses bayar
router.get('/preview/:kunjunganId',         authorize('kasir','admin'), c.getPreviewTagihan);
// Riwayat semua transaksi: admin & owner
router.get('/riwayat',                      authorize('admin','owner'), c.getRiwayat);
// Detail satu pembayaran
router.get('/:id',                          authorize('kasir','admin','owner'), c.getById);
// Proses pembayaran: kasir & admin (owner tidak boleh)
router.post('/kunjungan/:kunjunganId',      authorize('kasir','admin'), c.proses);
// Void: owner saja
router.patch('/:id/void',                   authorize('owner'), c.voidPembayaran);

module.exports = router;

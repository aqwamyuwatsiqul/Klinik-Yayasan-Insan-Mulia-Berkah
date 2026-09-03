const router = require('express').Router();
const c = require('../controllers/kunjunganController');
const { authenticate, authorize } = require('../middleware/auth');
const { validateKunjungan } = require('../utils/validate');

router.use(authenticate);
router.get('/antrian',           c.getAntrian);
router.get('/:id',               c.getById);
router.post('/',                 authorize('admin','dokter'), validateKunjungan, c.create);
router.patch('/:id/status',      authorize('admin','dokter'), c.updateStatus);

module.exports = router;

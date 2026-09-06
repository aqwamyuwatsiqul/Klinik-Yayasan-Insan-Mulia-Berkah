const router = require('express').Router();
const c = require('../controllers/tarifController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
// Semua role authenticated bisa baca (kasir butuh ini untuk tampilkan tagihan)
router.get('/',    c.getAll);
router.get('/:id', c.getById);
// Buat, ubah, hapus: admin & owner
router.post('/',   authorize('admin', 'owner'), c.create);
router.put('/:id', authorize('admin', 'owner'), c.update);
router.delete('/:id', authorize('admin', 'owner'), c.remove);

module.exports = router;

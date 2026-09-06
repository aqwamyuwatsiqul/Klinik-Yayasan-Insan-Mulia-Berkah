const router = require('express').Router();
const c = require('../controllers/dokterController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.get('/',        c.getAll);
router.get('/:id',     c.getById);
// Edit & hapus master data dokter: wewenang owner
router.put('/:id',     authorize('owner'), c.update);
router.delete('/:id',  authorize('owner'), c.remove);

module.exports = router;

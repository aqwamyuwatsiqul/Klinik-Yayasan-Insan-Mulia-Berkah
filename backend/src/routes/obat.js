const router = require('express').Router();
const c = require('../controllers/obatController');
const { authenticate, authorize } = require('../middleware/auth');
const { validateObat } = require('../utils/validate');

router.use(authenticate);
router.get('/',              c.getAll);
router.get('/:id',           c.getById);
router.post('/',             authorize('apoteker','admin'), validateObat, c.create);
router.put('/:id',           authorize('apoteker','admin'), validateObat, c.update);
router.patch('/:id/stok',    authorize('apoteker','admin'), c.updateStok);
router.delete('/:id',        authorize('apoteker','admin'), c.remove);

module.exports = router;

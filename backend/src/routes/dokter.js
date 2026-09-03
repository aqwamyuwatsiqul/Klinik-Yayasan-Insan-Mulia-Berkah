const router = require('express').Router();
const c = require('../controllers/dokterController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.get('/',        c.getAll);
router.get('/:id',     c.getById);
router.put('/:id',     authorize('admin'), c.update);
router.delete('/:id',  authorize('admin'), c.remove);

module.exports = router;

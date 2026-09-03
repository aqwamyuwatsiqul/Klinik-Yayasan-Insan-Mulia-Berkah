const router = require('express').Router();
const c = require('../controllers/pasienController');
const { authenticate, authorize } = require('../middleware/auth');
const { validatePasien } = require('../utils/validate');

router.use(authenticate);
router.get('/',       c.getAll);
router.get('/:id',    c.getById);
router.post('/',      authorize('admin'), validatePasien, c.create);
router.put('/:id',    authorize('admin'), validatePasien, c.update);
router.delete('/:id', authorize('admin'), c.remove);

module.exports = router;

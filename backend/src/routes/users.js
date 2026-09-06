const router = require('express').Router();
const c = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/auth');
const { validateUserCreate, validateUserUpdate } = require('../utils/validate');

// Manajemen user adalah wewenang owner
router.use(authenticate, authorize('owner'));
router.get('/',                    c.getAll);
router.get('/:id',                 c.getById);
router.post('/',                   validateUserCreate, c.create);
router.put('/:id',                 validateUserUpdate, c.update);
router.put('/:id/reset-password',  c.resetPassword);
router.delete('/:id',              c.remove);

module.exports = router;

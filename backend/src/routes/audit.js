const router = require('express').Router();
const c = require('../controllers/auditController');
const { authenticate, authorize } = require('../middleware/auth');

// Audit log hanya bisa diakses owner
router.use(authenticate, authorize('owner'));
router.get('/',       c.getAuditLog);
router.get('/users',  c.getUsers);

module.exports = router;

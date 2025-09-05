const router = require('express').Router();
const { chatHandler } = require('../controllers/chat.controller');
router.post('/', chatHandler);
module.exports = router;

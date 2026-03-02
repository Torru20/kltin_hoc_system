const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const userController = require('../controllers/userController');

// Route này sẽ chạy Middleware trước, sau đó mới chạy Controller
router.post('/login', verifyToken, userController.loginOrRegister);

module.exports = router;
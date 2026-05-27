const { Router } = require('express');
const { 
  register, login, refresh, logout,
  googleLogin, googleCallback,
  githubLogin, githubCallback
} = require('../controllers/authController');

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', logout);

// SSO endpoints
router.get('/google', googleLogin);
router.get('/google/callback', googleCallback);
router.get('/github', githubLogin);
router.get('/github/callback', githubCallback);

module.exports = router;

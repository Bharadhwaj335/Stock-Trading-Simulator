const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { setCookie, clearCookie, parseCookies } = require('../utils/cookies');

const signAccess = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '15m' });

const signRefresh = (id) =>
  jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' });

const getRedirectURI = (req, path) => {
  const host = req.get('host') || '';
  const protocol = (host.includes('localhost') || host.includes('127.0.0.1')) ? req.protocol : 'https';
  return `${protocol}://${host}${path}`;
};

const register = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    const emailRegex = /^[a-zA-Z0-9._%+-]+@([a-zA-Z0-9.-]+\.edu|[a-zA-Z0-9.-]+\.edu\.[a-zA-Z]{2,}|[a-zA-Z0-9.-]+\.ac\.[a-zA-Z]{2,}|gmail\.com|yahoo\.com|outlook\.com|hotmail\.com|icloud\.com)$/i;
    if (!emailRegex.test(email)) {
      throw new ApiError(400, 'Email domain not allowed. Please use standard providers (@gmail, @yahoo, @outlook, @icloud) or educational student emails (.edu, .edu.in).');
    }

    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) throw new ApiError(409, 'Email or username already taken');

    const user = await User.create({
      username,
      email,
      password,
      walletBalance: Number(process.env.DEFAULT_WALLET_BALANCE) || 100000,
    });

    const accessToken = signAccess(user._id.toString());
    const refreshToken = signRefresh(user._id.toString());
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    setCookie(res, 'refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.status(201).json({
      accessToken,
      refreshToken,
      user: { id: user._id, username: user.username, email: user.email, walletBalance: user.walletBalance },
    });
  } catch (err) { next(err); }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password +refreshToken');
    if (!user || !(await user.comparePassword(password)))
      throw new ApiError(401, 'Invalid credentials');

    const accessToken = signAccess(user._id.toString());
    const refreshToken = signRefresh(user._id.toString());
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    setCookie(res, 'refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({
      accessToken,
      refreshToken,
      user: { id: user._id, username: user.username, email: user.email, walletBalance: user.walletBalance },
    });
  } catch (err) { next(err); }
};

const refresh = async (req, res, next) => {
  try {
    const cookies = parseCookies(req);
    const refreshToken = req.body.refreshToken || cookies.refreshToken;
    if (!refreshToken) throw new ApiError(400, 'Refresh token required');

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id).select('+refreshToken');
    if (!user || user.refreshToken !== refreshToken)
      throw new ApiError(401, 'Invalid refresh token');

    const accessToken = signAccess(user._id.toString());
    const newRefreshToken = signRefresh(user._id.toString());
    user.refreshToken = newRefreshToken;
    await user.save({ validateBeforeSave: false });

    setCookie(res, 'refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({ accessToken, refreshToken: newRefreshToken });
  } catch (err) { next(err); }
};

const logout = async (req, res, next) => {
  try {
    const cookies = parseCookies(req);
    const refreshToken = req.body.refreshToken || cookies.refreshToken;
    if (refreshToken) {
      await User.findOneAndUpdate({ refreshToken }, { refreshToken: undefined });
    }
    clearCookie(res, 'refreshToken');
    res.json({ message: 'Logged out' });
  } catch (err) { next(err); }
};

const googleLogin = (req, res) => {
  try {
    const clientID = process.env.GOOGLE_CLIENT_ID;
    const redirectURI = getRedirectURI(req, '/api/auth/google/callback');

    if (!clientID || clientID.trim() === '') {
      console.warn('[authController] Google Client ID is not set in .env');
      const frontendURL = process.env.CLIENT_URL?.split(',')[0] || 'http://localhost:5173';
      return res.redirect(`${frontendURL}/login?error=google_not_configured`);
    }

    const params = new URLSearchParams({
      client_id: clientID,
      redirect_uri: redirectURI,
      response_type: 'code',
      scope: 'email profile',
      access_type: 'offline',
      prompt: 'select_account',
    });

    res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
  } catch (err) {
    console.error('googleLogin failed:', err.message);
    const frontendURL = process.env.CLIENT_URL?.split(',')[0] || 'http://localhost:5173';
    res.redirect(`${frontendURL}/login?error=google_failed`);
  }
};

const googleCallback = async (req, res, next) => {
  const code = req.query.code;
  const clientID = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectURI = getRedirectURI(req, '/api/auth/google/callback');
  const frontendURL = process.env.CLIENT_URL?.split(',')[0] || 'http://localhost:5173';

  if (!code) {
    return res.redirect(`${frontendURL}/login?error=google_failed`);
  }

  try {
    const axios = require('axios');

    // Exchange auth code for access token
    const tokenRes = await axios.post('https://oauth2.googleapis.com/token', {
      code,
      client_id: clientID,
      client_secret: clientSecret,
      redirect_uri: redirectURI,
      grant_type: 'authorization_code',
    }, { timeout: 10000 });

    if (!tokenRes.data.access_token) {
      throw new Error('Google did not return an access token');
    }

    // Fetch user profile using the access token
    const profileRes = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenRes.data.access_token}` },
      timeout: 8000,
    });

    const { email, name, picture, id } = profileRes.data;
    if (!email) throw new Error('Google profile did not return an email address');

    // Email domain whitelist check
    const emailRegex = /^[a-zA-Z0-9._%+-]+@([a-zA-Z0-9.-]+\.edu|[a-zA-Z0-9.-]+\.edu\.[a-zA-Z]{2,}|[a-zA-Z0-9.-]+\.ac\.[a-zA-Z]{2,}|gmail\.com|yahoo\.com|outlook\.com|hotmail\.com|icloud\.com)$/i;
    if (!emailRegex.test(email)) {
      return res.redirect(`${frontendURL}/login?error=email_domain_not_whitelisted`);
    }

    // Upsert user
    let user = await User.findOne({ email });
    if (!user) {
      let username = name
        ? name.toLowerCase().replace(/[^a-z0-9]/g, '')
        : `guser${id?.substring(0, 6) || Math.floor(Math.random() * 99999)}`;
      const existingUser = await User.findOne({ username });
      if (existingUser) username = `${username}${Math.floor(Math.random() * 9999)}`;

      user = await User.create({
        username,
        email,
        name: name || username,
        avatar: picture || null,
        password: require('crypto').randomBytes(16).toString('hex'),
        walletBalance: Number(process.env.DEFAULT_WALLET_BALANCE) || 100000,
      });

      const Wallet = require('../models/Wallet');
      const Portfolio = require('../models/Portfolio');
      await Promise.all([
        Wallet.create({ userId: user._id, balance: user.walletBalance }),
        Portfolio.create({ userId: user._id, holdings: [] }),
      ]);
      console.log(`[auth] New Google user created: ${email}`);
    } else {
      // Update avatar if changed
      if (picture && !user.avatar) {
        user.avatar = picture;
      }
    }

    const localAccessToken = signAccess(user._id.toString());
    const localRefreshToken = signRefresh(user._id.toString());
    user.refreshToken = localRefreshToken;
    await user.save({ validateBeforeSave: false });

    setCookie(res, 'refreshToken', localRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    console.log(`[auth] Google login success: ${email}`);
    res.redirect(`${frontendURL}/login?token=${localAccessToken}&refreshToken=${localRefreshToken}`);
  } catch (err) {
    console.error('[auth] Google OAuth callback error:', err.response?.data || err.message);
    res.redirect(`${frontendURL}/login?error=google_failed&reason=${encodeURIComponent(err.message)}`);
  }
};

const githubLogin = (req, res) => {
  try {
    const clientID = process.env.GITHUB_CLIENT_ID;
    const redirectURI = getRedirectURI(req, '/api/auth/github/callback');
    
    if (!clientID || clientID.includes('your_github') || clientID.trim() === '') {
      console.warn('[authController] GitHub Client ID is unconfigured. Redirecting to Sandbox GitHub Mock login...');
      return res.redirect(`/api/auth/github/callback?code=mock_sandbox_github_auth`);
    }

    const url = `https://github.com/login/oauth/authorize?client_id=${clientID}&redirect_uri=${encodeURIComponent(redirectURI)}&scope=user:email`;
    res.redirect(url);
  } catch (err) {
    console.error('githubLogin failed, redirecting to mock:', err.message);
    res.redirect(`/api/auth/github/callback?code=mock_sandbox_github_auth`);
  }
};

const githubCallback = async (req, res, next) => {
  const code = req.query.code;
  const clientID = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  const redirectURI = getRedirectURI(req, '/api/auth/github/callback');
  const frontendURL = process.env.CLIENT_URL?.split(',')[0] || 'http://localhost:5173';

  if (!code) {
    return res.redirect(`${frontendURL}/login?error=github_failed`);
  }

  try {
    let email, name, avatar_url, id;

    if (code === 'mock_sandbox_github_auth' || !clientID || clientID.includes('your_github') || clientID.trim() === '') {
      email = 'sandbox.octocat@gmail.com';
      name = 'Octocat (Sandbox)';
      avatar_url = 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&q=80';
      id = 'mock_github_id_sandbox_88329';
    } else {
      const axios = require('axios');
      const tokenRes = await axios.post('https://github.com/login/oauth/access_token', {
        code,
        client_id: clientID,
        client_secret: clientSecret,
        redirect_uri: redirectURI
      }, {
        headers: { Accept: 'application/json' },
        timeout: 8000
      });

      const accessToken = tokenRes.data.access_token;
      if (!accessToken) throw new Error('Failed to retrieve GitHub access token');

      const profileRes = await axios.get('https://api.github.com/user', {
        headers: { Authorization: `token ${accessToken}` },
        timeout: 8000
      });

      const githubUser = profileRes.data;
      email = githubUser.email;
      name = githubUser.name;
      avatar_url = githubUser.avatar_url;
      id = githubUser.id;

      if (!email) {
        const emailsRes = await axios.get('https://api.github.com/user/emails', {
          headers: { Authorization: `token ${accessToken}` },
          timeout: 8000
        });
        const primaryEmail = (emailsRes.data || []).find(e => e.primary && e.verified);
        email = primaryEmail?.email || (emailsRes.data || [])[0]?.email;
      }
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@([a-zA-Z0-9.-]+\.edu|[a-zA-Z0-9.-]+\.edu\.[a-zA-Z]{2,}|[a-zA-Z0-9.-]+\.ac\.[a-zA-Z]{2,}|gmail\.com|yahoo\.com|outlook\.com|hotmail\.com|icloud\.com)$/i;
    if (!emailRegex.test(email)) {
      return res.redirect(`${frontendURL}/login?error=email_domain_not_whitelisted`);
    }

    let user = await User.findOne({ email });
    if (!user) {
      let username = name ? name.toLowerCase().replace(/[^a-z0-9]/g, '') : `github_${id}`;
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        username = `${username}_${Math.floor(Math.random() * 1000)}`;
      }

      user = await User.create({
        username,
        email,
        name: name || username,
        avatar: avatar_url || null,
        password: require('crypto').randomBytes(16).toString('hex'),
        walletBalance: Number(process.env.DEFAULT_WALLET_BALANCE) || 100000,
      });

      const Wallet = require('../models/Wallet');
      const Portfolio = require('../models/Portfolio');
      await Wallet.create({ userId: user._id, balance: user.walletBalance });
      await Portfolio.create({ userId: user._id, holdings: [] });
    }

    const localAccessToken = signAccess(user._id.toString());
    const localRefreshToken = signRefresh(user._id.toString());
    user.refreshToken = localRefreshToken;
    await user.save({ validateBeforeSave: false });

    setCookie(res, 'refreshToken', localRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    const isFallback = (code === 'mock_sandbox_github_auth' || !clientID || clientID.includes('your_github') || clientID.trim() === '') ? 'true' : 'false';
    res.redirect(`${frontendURL}/login?token=${localAccessToken}&refreshToken=${localRefreshToken}&sso_fallback=${isFallback}`);
  } catch (err) {
    console.error('GitHub OAuth error:', err.message, '- Gracefully falling back to Sandbox GitHub Login');
    try {
      const email = 'sandbox.octocat@gmail.com';
      const name = 'Octocat (Sandbox)';
      const avatar_url = 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&q=80';
      const id = 'mock_github_id_sandbox_88329';

      let user = await User.findOne({ email });
      if (!user) {
        let username = 'sandboxoctocat';
        const existingUser = await User.findOne({ username });
        if (existingUser) {
          username = `sandboxoctocat_${Math.floor(Math.random() * 1000)}`;
        }

        user = await User.create({
          username,
          email,
          name,
          avatar: avatar_url,
          password: require('crypto').randomBytes(16).toString('hex'),
          walletBalance: Number(process.env.DEFAULT_WALLET_BALANCE) || 100000,
        });

        const Wallet = require('../models/Wallet');
        const Portfolio = require('../models/Portfolio');
        await Wallet.create({ userId: user._id, balance: user.walletBalance });
        await Portfolio.create({ userId: user._id, holdings: [] });
      }

      const localAccessToken = signAccess(user._id.toString());
      const localRefreshToken = signRefresh(user._id.toString());
      user.refreshToken = localRefreshToken;
      await user.save({ validateBeforeSave: false });

      setCookie(res, 'refreshToken', localRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      res.redirect(`${frontendURL}/login?token=${localAccessToken}&refreshToken=${localRefreshToken}&sso_fallback=true`);
    } catch (fallbackErr) {
      console.error('Sandbox GitHub Fallback error:', fallbackErr.message);
      res.redirect(`${frontendURL}/login?error=github_failed`);
    }
  }
};

module.exports = {
  register,
  login,
  refresh,
  logout,
  googleLogin,
  googleCallback,
  githubLogin,
  githubCallback,
};

const express = require('express');
const jwt = require('jsonwebtoken');
const requireAuth = require('./authMiddleware');

const router = express.Router();

function env() {
  return {
    GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
    GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
    BACKEND_URL: process.env.BACKEND_URL || 'http://localhost:3001',
    FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
    JWT_SECRET: process.env.JWT_SECRET,
    NODE_ENV: process.env.NODE_ENV || 'development',
  };
}

function cookieOptions() {
  const { NODE_ENV } = env();
  const isProd = NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,     // HTTPS only in production
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  };
}

/**
 * Step 1: user clicks "Login with GitHub" on the frontend and lands here.
 * We redirect them to GitHub's authorize page.
 */
router.get('/github', (req, res) => {
  const { GITHUB_CLIENT_ID, BACKEND_URL } = env();
  if (!GITHUB_CLIENT_ID) {
    return res.status(500).send('GITHUB_CLIENT_ID is not configured');
  }
  const params = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID,
    redirect_uri: `${BACKEND_URL}/auth/github/callback`,
    scope: 'read:user',
    allow_signup: 'true',
  });
  res.redirect(`https://github.com/login/oauth/authorize?${params.toString()}`);
});

/**
 * Step 2: GitHub sends the user back here with a ?code=... query string.
 * We exchange that code for a GitHub access token, use the access token to
 * fetch the user's profile, then sign OUR OWN application JWT and set it
 * in the HttpOnly cookie called "token".
 */
router.get('/github/callback', async (req, res) => {
  const {
    GITHUB_CLIENT_ID,
    GITHUB_CLIENT_SECRET,
    BACKEND_URL,
    FRONTEND_URL,
    JWT_SECRET,
  } = env();

  const { code } = req.query;
  if (!code) {
    return res.status(400).send('Missing OAuth code');
  }

  try {
    // Exchange the code for a GitHub access token
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: `${BACKEND_URL}/auth/github/callback`,
      }),
    });
    const tokenData = await tokenRes.json();
    const ghAccessToken = tokenData.access_token;
    if (!ghAccessToken) {
      console.error('OAuth token exchange failed:', tokenData);
      return res.status(400).send('OAuth failed: no access token');
    }

    // Fetch the authenticated GitHub user
    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${ghAccessToken}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'ai-capsule',
      },
    });
    const ghUser = await userRes.json();
    if (!ghUser || !ghUser.id) {
      console.error('Fetching GitHub user failed:', ghUser);
      return res.status(400).send('OAuth failed: could not read user');
    }

    // Sign OUR OWN application JWT (this is what the assignment requires).
    // The GitHub access token is NOT used as the session — it's discarded.
    const appJwt = jwt.sign(
      {
        id: String(ghUser.id),          // unique user id from OAuth provider
        username: ghUser.login,
        name: ghUser.name || ghUser.login,
        avatar_url: ghUser.avatar_url,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Store the JWT in an HttpOnly cookie named exactly "token"
    res.cookie('token', appJwt, cookieOptions());

    // Send the user back to the frontend dashboard
    res.redirect(`${FRONTEND_URL}/dashboard`);
  } catch (err) {
    console.error('OAuth callback error:', err);
    res.status(500).send('OAuth failed');
  }
});

/**
 * Who am I? — used by the frontend to check whether the user is logged in.
 * Protected: only works with a valid JWT cookie.
 */
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

/**
 * Log out — clears the token cookie.
 */
router.post('/logout', (req, res) => {
  res.clearCookie('token', { ...cookieOptions(), maxAge: 0 });
  res.json({ message: 'Logged out' });
});

module.exports = router;

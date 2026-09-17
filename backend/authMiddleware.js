const jwt = require('jsonwebtoken');

/**
 * Protects an API route.
 * Reads the application JWT from the HttpOnly cookie called "token",
 * verifies it with JWT_SECRET, and puts the decoded payload on req.user.
 * Any failure (no cookie, bad signature, expired) responds 401.
 */
function requireAuth(req, res, next) {
  const token = req.cookies && req.cookies.token;
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, username, name, avatar_url }
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

module.exports = requireAuth;

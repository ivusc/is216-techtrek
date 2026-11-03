const User = require('../models/User');
const { endSession, isSessionExpired } = require('./session');

// Blocks the request unless someone is logged in (req.session.user is set by /login and /register)
async function requireLogin(req, res, next) {
  if (!req.session?.user) {
    return res.status(401).json({ error: 'Please log in first.' });
  }
  if (isSessionExpired(req.session) || !(await User.exists({ _id: req.session.user._id }))) {
    await endSession(req, res);
    return res.status(401).json({ error: 'Please log in first.' });
  }
  next();
}

module.exports = { requireLogin };

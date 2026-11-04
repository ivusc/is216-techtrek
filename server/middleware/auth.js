const User = require('../models/User');
const { endSession, isSessionExpired } = require('./session');

// how often a logged-in session re-checks that its account still exists. Every check is a trip to the
// database (about 0.2 s on Atlas), so it isn't repeated on every single request.
const USER_CHECK_EVERY = 60 * 1000;

// Blocks the request unless someone is logged in (req.session.user is set by /login and /register)
async function requireLogin(req, res, next) {
  if (!req.session?.user) {
    return res.status(401).json({ error: 'Please log in first.' });
  }
  if (isSessionExpired(req.session)) {
    await endSession(req, res);
    return res.status(401).json({ error: 'Please log in first.' });
  }
  const checkedAt = req.session.userCheckedAt ?? 0;
  if (Date.now() - checkedAt > USER_CHECK_EVERY) {
    if (!(await User.exists({ _id: req.session.user._id }))) {
      await endSession(req, res);
      return res.status(401).json({ error: 'Please log in first.' });
    }
    req.session.userCheckedAt = Date.now();
  }
  next();
}

module.exports = { requireLogin };

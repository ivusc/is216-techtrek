const User = require('../models/User');
const { endSession } = require('./session');

// Blocks the request unless someone is logged in (req.session.user is set by /login and /register)
async function requireLogin(req, res, next) {
  if (!req.session?.user) {
    return res.status(401).json({ error: 'Please log in first.' });
  }
  if (!(await User.exists({ _id: req.session.user._id }))) {
    await endSession(req, res);
    return res.status(401).json({ error: 'Please log in first.' });
  }
  next();
}

// For routes where the client still sends a userId (teams):
// the userId must belong to the logged-in user, so nobody can act as someone else
function requireSameUser(req, res, next) {
  const sentUserId = req.query.userId ?? req.body?.userId;
  if (sentUserId && String(sentUserId) !== String(req.session.user._id)) {
    return res.status(403).json({ error: 'You can only do this for your own account.' });
  }
  next();
}

module.exports = { requireLogin, requireSameUser };

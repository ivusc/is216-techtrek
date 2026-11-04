const MAX_SESSION_AGE = 12 * 60 * 60 * 1000;

function startSession(req, profile) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((err) => {
      if (err) return reject(err);
      req.session.user = { _id: profile._id };
      req.session.createdAt = Date.now();
      resolve();
    });
  });
}

function isSessionExpired(session) {
  return typeof session.createdAt !== 'number' || Date.now() - session.createdAt > MAX_SESSION_AGE;
}

function endSession(req, res) {
  return new Promise((resolve, reject) => {
    req.session.destroy((err) => {
      if (err) return reject(err);
      res.clearCookie('connect.sid', { path: '/' });
      resolve();
    });
  });
}

module.exports = { startSession, isSessionExpired, endSession };

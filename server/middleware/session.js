function regenerateSession(req) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((err) => (err ? reject(err) : resolve()));
  });
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

module.exports = { regenerateSession, endSession };

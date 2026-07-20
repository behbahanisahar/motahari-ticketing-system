const jwt = require("jsonwebtoken");
const config = require("../config");

function requireAuth(req, res, next) {
  const token = req.cookies && req.cookies.session;
  if (!token) {
    return res.status(401).json({ error: "لطفاً ابتدا وارد سیستم شوید." });
  }
  try {
    const payload = jwt.verify(token, config.JWT_SECRET);
    req.user = payload; // { id, username, displayName, role }
    next();
  } catch (err) {
    return res.status(401).json({ error: "نشست شما منقضی شده است، دوباره وارد شوید." });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "شما اجازه دسترسی به این بخش را ندارید." });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };

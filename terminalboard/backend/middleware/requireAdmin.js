// backend/middleware/requireAdmin.js
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "ADMIN ONLY" });
  }
  next();
}

module.exports = { requireAdmin };

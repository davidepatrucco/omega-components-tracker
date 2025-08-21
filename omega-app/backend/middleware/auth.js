const { verifyAccess } = require('../utils/jwt');
const User = require('../models/User');

async function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'missing token' });
  const token = auth.slice(7);
  try {
    const decoded = verifyAccess(token);
    const user = await User.findById(decoded.sub);
    if (!user) return res.status(401).json({ error: 'invalid token' });
    req.user = { id: user._id.toString(), username: user.username, profilo: user.profilo };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'invalid token' });
  }
}

async function requireAdmin(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'missing token' });
  const token = auth.slice(7);
  try {
    const decoded = verifyAccess(token);
    const user = await User.findById(decoded.sub);
    if (!user) return res.status(401).json({ error: 'invalid token' });
    if (user.profilo !== 'ADMIN') return res.status(403).json({ error: 'admin access required' });
    req.user = { id: user._id.toString(), username: user.username, profilo: user.profilo };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'invalid token' });
  }
}

module.exports = { requireAuth, requireAdmin };

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { signAccess, signRefresh, verifyRefresh, createRefreshPayload } = require('../utils/jwt');
const RefreshToken = require('../models/RefreshToken');

// POST /auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'username and password required' });
  const user = await User.findOne({ username });
  if (!user) return res.status(401).json({ error: 'invalid credentials' });
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(401).json({ error: 'invalid credentials' });

  const payload = { sub: user._id.toString(), username: user.username, profilo: user.profilo };
  const accessToken = signAccess(payload);
  // create refresh token payload with jti
  const refreshPayload = createRefreshPayload(user._id.toString());
  const refreshToken = signRefresh(refreshPayload);

  // persist refresh token metadata
  const expiresAt = new Date(Date.now() + 180 * 24 * 3600 * 1000); // 180 days
  await RefreshToken.create({ jti: refreshPayload.jti, user: user._id, expiresAt });

  // Set refresh token cookie
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 180 * 24 * 3600 * 1000
  });

  res.json({ 
    accessToken, 
    user: { username: user.username, profilo: user.profilo },
    sessionExpiresAt: expiresAt.getTime() // Aggiungi timestamp di scadenza sessione
  });
});

// POST /auth/refresh
router.post('/refresh', async (req, res) => {
  const token = req.cookies && req.cookies.refreshToken;
  if (!token) return res.status(401).json({ error: 'no refresh token' });
  try {
    const decoded = verifyRefresh(token);
    // check stored token
    const stored = await RefreshToken.findOne({ jti: decoded.jti });
    if (!stored || stored.revoked || stored.expiresAt < new Date()) return res.status(401).json({ error: 'invalid refresh token' });
    const user = await User.findById(decoded.sub);
    if (!user) return res.status(401).json({ error: 'invalid refresh token' });

    // rotate: create a new refresh token and mark old as revoked
    const newPayload = createRefreshPayload(user._id.toString());
    const newToken = signRefresh(newPayload);
    const expiresAt = new Date(Date.now() + 180 * 24 * 3600 * 1000);
    await RefreshToken.create({ jti: newPayload.jti, user: user._id, expiresAt });
    stored.revoked = true;
    stored.revokedAt = new Date();
    stored.replacedBy = newPayload.jti;
    await stored.save();

    // set cookie
    res.cookie('refreshToken', newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 180 * 24 * 3600 * 1000
    });

    const accessToken = signAccess({ sub: user._id.toString(), username: user.username, profilo: user.profilo });
    res.json({ 
      accessToken,
      sessionExpiresAt: expiresAt.getTime() // Aggiungi timestamp di scadenza sessione
    });
  } catch (err) {
    return res.status(401).json({ error: 'invalid refresh token' });
  }
});

// POST /auth/logout
router.post('/logout', async (req, res) => {
  const token = req.cookies && req.cookies.refreshToken;
  if (token) {
    try {
      const decoded = verifyRefresh(token);
      const stored = await RefreshToken.findOne({ jti: decoded.jti });
      if (stored && !stored.revoked) {
        stored.revoked = true;
        stored.revokedAt = new Date();
        await stored.save();
      }
    } catch (err) {
      // ignore
    }
  }
  res.clearCookie('refreshToken');
  res.status(204).send();
});

module.exports = router;

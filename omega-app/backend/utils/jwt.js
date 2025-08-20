const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const ACCESS_EXPIRES = '15m';
// refresh token expiry set to 180 days
const REFRESH_EXPIRES = '180d';

function signAccess(payload) {
  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET || 'dev-access-secret', { expiresIn: ACCESS_EXPIRES });
}

function signRefresh(payload) {
  // payload should include jti
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret', { expiresIn: REFRESH_EXPIRES });
}

function createRefreshPayload(userId) {
  return { sub: userId, jti: uuidv4() };
}

function verifyAccess(token) {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET || 'dev-access-secret');
}

function verifyRefresh(token) {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret');
}

module.exports = { signAccess, signRefresh, verifyAccess, verifyRefresh, createRefreshPayload };

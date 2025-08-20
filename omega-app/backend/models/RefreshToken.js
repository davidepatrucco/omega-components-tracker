const mongoose = require('mongoose');
const RefreshTokenSchema = new mongoose.Schema({
  jti: { type: String, required: true, unique: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
  revoked: { type: Boolean, default: false },
  revokedAt: { type: Date },
  replacedBy: { type: String },
  lastUsedAt: { type: Date }
});
module.exports = mongoose.model('RefreshToken', RefreshTokenSchema);

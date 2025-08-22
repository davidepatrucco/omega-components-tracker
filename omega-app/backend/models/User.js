const mongoose = require('mongoose');
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // hashed
  email: { type: String, default: '' },
  profilo: { type: String, default: 'UFF' },
  createdAt: { type: Date, default: Date.now }
});

// Indici per performance
UserSchema.index({ createdAt: -1 });
UserSchema.index({ profilo: 1 });
UserSchema.index({ email: 1 });

module.exports = mongoose.model('User', UserSchema);

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { requireAdmin } = require('../middleware/auth');

// All user management routes require admin access
router.use(requireAdmin);

// GET /utenti - List all users
router.get('/', async (req, res) => {
  try {
    const users = await User.find({}, '-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Internal server error', userMessage: 'Errore nel caricamento degli utenti' });
  }
});

// POST /utenti - Create new user
router.post('/', async (req, res) => {
  try {
    const { username, email, profilo, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required', userMessage: 'Username e password sono obbligatori' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(409).json({ error: 'Username already exists', userMessage: 'Username già esistente' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = new User({
      username,
      email: email || '',
      profilo: profilo || 'UFF',
      password: hashedPassword
    });

    await user.save();

    // Return user without password
    const { password: _, ...userResponse } = user.toObject();
    res.status(201).json(userResponse);
  } catch (err) {
    console.error('Error creating user:', err);
    res.status(500).json({ error: 'Internal server error', userMessage: 'Errore nella creazione dell\'utente' });
  }
});

// PUT /utenti/:id - Update user
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, profilo } = req.body;

    if (!username) {
      return res.status(400).json({ error: 'Username required', userMessage: 'Username è obbligatorio' });
    }

    // Check if username is taken by another user
    const existingUser = await User.findOne({ username, _id: { $ne: id } });
    if (existingUser) {
      return res.status(409).json({ error: 'Username already exists', userMessage: 'Username già esistente' });
    }

    const updateData = {
      username,
      email: email || '',
      profilo: profilo || 'UFF'
    };

    const user = await User.findByIdAndUpdate(id, updateData, { new: true, select: '-password' });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found', userMessage: 'Utente non trovato' });
    }

    res.json(user);
  } catch (err) {
    console.error('Error updating user:', err);
    res.status(500).json({ error: 'Internal server error', userMessage: 'Errore nell\'aggiornamento dell\'utente' });
  }
});

// PUT /utenti/:id/reset-password - Reset user password
router.put('/:id/reset-password', async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Password required', userMessage: 'Password è obbligatoria' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.findByIdAndUpdate(id, { password: hashedPassword }, { new: true, select: '-password' });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found', userMessage: 'Utente non trovato' });
    }

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('Error updating password:', err);
    res.status(500).json({ error: 'Internal server error', userMessage: 'Errore nell\'aggiornamento della password' });
  }
});

// DELETE /utenti/:id - Delete user
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent admin from deleting themselves
    if (id === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete own account', userMessage: 'Non puoi eliminare il tuo account' });
    }

    const user = await User.findByIdAndDelete(id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found', userMessage: 'Utente non trovato' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ error: 'Internal server error', userMessage: 'Errore nell\'eliminazione dell\'utente' });
  }
});

module.exports = router;
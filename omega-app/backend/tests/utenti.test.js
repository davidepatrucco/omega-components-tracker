const request = require('supertest');
const express = require('express');
const bcrypt = require('bcryptjs');

// Mock the User model
jest.mock('../models/User');
const User = require('../models/User');

// Mock the auth middleware
jest.mock('../middleware/auth');
const { requireAdmin } = require('../middleware/auth');

const utentiRoutes = require('../routes/utenti');

describe('User Management API', () => {
  let app;
  
  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    // Mock the requireAdmin middleware to pass for tests
    requireAdmin.mockImplementation((req, res, next) => {
      req.user = { id: 'admin-id', username: 'admin', profilo: 'ADMIN' };
      next();
    });
    
    app.use('/utenti', utentiRoutes);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /utenti', () => {
    it('should return list of users', async () => {
      const mockUsers = [
        { _id: 'user1', username: 'test1', email: 'test1@example.com', profilo: 'UFF' },
        { _id: 'user2', username: 'test2', email: 'test2@example.com', profilo: 'ADMIN' }
      ];
      
      User.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockUsers)
      });

      const response = await request(app).get('/utenti');
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockUsers);
      expect(User.find).toHaveBeenCalledWith({}, '-password');
    });
  });

  describe('POST /utenti', () => {
    it('should create a new user', async () => {
      const newUser = {
        username: 'newuser',
        email: 'newuser@example.com',
        profilo: 'UFF',
        password: 'password123'
      };

      User.findOne.mockResolvedValue(null); // No existing user
      User.prototype.save = jest.fn().mockResolvedValue();
      User.prototype.toObject = jest.fn().mockReturnValue({
        _id: 'new-user-id',
        username: 'newuser',
        email: 'newuser@example.com',
        profilo: 'UFF',
        password: 'hashed-password'
      });

      const response = await request(app)
        .post('/utenti')
        .send(newUser);

      expect(response.status).toBe(201);
      expect(response.body.username).toBe('newuser');
      expect(response.body.password).toBeUndefined(); // Password should not be returned
    });

    it('should return 409 if username already exists', async () => {
      const newUser = {
        username: 'existinguser',
        email: 'new@example.com',
        profilo: 'UFF',
        password: 'password123'
      };

      User.findOne.mockResolvedValue({ username: 'existinguser' }); // User exists

      const response = await request(app)
        .post('/utenti')
        .send(newUser);

      expect(response.status).toBe(409);
      expect(response.body.userMessage).toBe('Username già esistente');
    });
  });

  describe('DELETE /utenti/:id', () => {
    it('should prevent admin from deleting themselves', async () => {
      const response = await request(app).delete('/utenti/admin-id');

      expect(response.status).toBe(400);
      expect(response.body.userMessage).toBe('Non puoi eliminare il tuo account');
    });

    it('should delete user successfully', async () => {
      User.findByIdAndDelete.mockResolvedValue({ _id: 'user-to-delete' });

      const response = await request(app).delete('/utenti/user-to-delete');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('User deleted successfully');
    });
  });
});
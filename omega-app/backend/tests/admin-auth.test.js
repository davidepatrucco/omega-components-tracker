const { requireAdmin } = require('../middleware/auth');

describe('Admin Authorization Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      headers: {},
      user: null
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should require admin profile for access', async () => {
    // Mock non-admin user
    const User = require('../models/User');
    User.findById = jest.fn().mockResolvedValue({
      _id: 'user-id',
      username: 'regular-user',
      profilo: 'UFF'
    });

    const { verifyAccess } = require('../utils/jwt');
    verifyAccess.mockReturnValue({ sub: 'user-id' });

    req.headers.authorization = 'Bearer valid-token';

    await requireAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'admin access required' });
    expect(next).not.toHaveBeenCalled();
  });

  it('should allow access for admin users', async () => {
    // Mock admin user
    const User = require('../models/User');
    User.findById = jest.fn().mockResolvedValue({
      _id: 'admin-id',
      username: 'admin',
      profilo: 'ADMIN'
    });

    const { verifyAccess } = require('../utils/jwt');
    verifyAccess.mockReturnValue({ sub: 'admin-id' });

    req.headers.authorization = 'Bearer valid-token';

    await requireAdmin(req, res, next);

    expect(req.user).toEqual({
      id: 'admin-id',
      username: 'admin',
      profilo: 'ADMIN'
    });
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});

// Mock the dependencies
jest.mock('../utils/jwt');
jest.mock('../models/User');
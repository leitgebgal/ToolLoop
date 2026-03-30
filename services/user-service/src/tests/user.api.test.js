const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../app');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongoServer.getUri();
  process.env.JWT_SECRET = 'testsecret';
  process.env.JWT_EXPIRES_IN = '1d';
  await mongoose.connect(process.env.MONGO_URI);
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.connection.close();
  await mongoServer.stop();
});

const registerUser = async (userData) => {
  return request(app).post('/api/users/register').send(userData);
};

describe('User API', () => {
  it('POST /api/users/register should create a user', async () => {
    const res = await registerUser({
      firstName: 'Gal',
      lastName: 'Leitgeb',
      email: 'gal@example.com',
      password: 'password123',
      phone: '040123456',
      city: 'Maribor',
    });

    expect(res.statusCode).toBe(201);
    expect(res.body._id).toBeDefined();
    expect(res.body.email).toBe('gal@example.com');
    expect(res.body.token).toBeDefined();
    expect(res.body.password).toBeUndefined();
  });

  it('POST /api/users/login should login user', async () => {
    await registerUser({
      firstName: 'Gal',
      lastName: 'Leitgeb',
      email: 'gal@example.com',
      password: 'password123',
    });

    const res = await request(app).post('/api/users/login').send({
      email: 'gal@example.com',
      password: 'password123',
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.email).toBe('gal@example.com');
  });

  it('GET /api/users should require token', async () => {
    const res = await request(app).get('/api/users');

    expect(res.statusCode).toBe(401);
    expect(res.body.error).toBe('Not authorized, no token');
  });

  it('GET /api/users should return all users when authorized', async () => {
    const registered = await registerUser({
      firstName: 'Ana',
      lastName: 'Novak',
      email: 'ana@example.com',
      password: 'password123',
    });

    const token = registered.body.token;

    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(1);
  });

  it('GET /api/users/:id should return one user when authorized', async () => {
    const registered = await registerUser({
      firstName: 'Eva',
      lastName: 'Horvat',
      email: 'eva@example.com',
      password: 'password123',
    });

    const token = registered.body.token;
    const userId = registered.body._id;

    const res = await request(app)
      .get(`/api/users/${userId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.email).toBe('eva@example.com');
  });

  it('GET /api/users/:id should return 404 for missing user when authorized', async () => {
    const registered = await registerUser({
      firstName: 'Ana',
      lastName: 'Novak',
      email: 'ana2@example.com',
      password: 'password123',
    });

    const token = registered.body.token;
    const fakeId = new mongoose.Types.ObjectId();

    const res = await request(app)
      .get(`/api/users/${fakeId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(404);
    expect(res.body.error).toBe('User not found');
  });

  it('PUT /api/users/:id should update own user', async () => {
    const registered = await registerUser({
      firstName: 'Miha',
      lastName: 'Kranjc',
      email: 'miha@example.com',
      password: 'password123',
      city: 'Ptuj',
    });

    const token = registered.body.token;
    const userId = registered.body._id;

    const res = await request(app)
      .put(`/api/users/${userId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        city: 'Ljubljana',
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.city).toBe('Ljubljana');
  });

  it('PUT /api/users/:id should return 403 when updating another user', async () => {
    const firstUser = await registerUser({
      firstName: 'First',
      lastName: 'User',
      email: 'first@example.com',
      password: 'password123',
    });

    const secondUser = await registerUser({
      firstName: 'Second',
      lastName: 'User',
      email: 'second@example.com',
      password: 'password123',
    });

    const token = firstUser.body.token;
    const secondUserId = secondUser.body._id;

    const res = await request(app)
      .put(`/api/users/${secondUserId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        city: 'Koper',
      });

    expect(res.statusCode).toBe(403);
    expect(res.body.error).toBe('You can only update your own profile');
  });

  it('DELETE /api/users/:id should delete own user', async () => {
    const registered = await registerUser({
      firstName: 'Tina',
      lastName: 'Kralj',
      email: 'tina@example.com',
      password: 'password123',
    });

    const token = registered.body.token;
    const userId = registered.body._id;

    const res = await request(app)
      .delete(`/api/users/${userId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('User deleted');
  });

  it('DELETE /api/users/:id should return 403 when deleting another user', async () => {
    const firstUser = await registerUser({
      firstName: 'First',
      lastName: 'User',
      email: 'firstdelete@example.com',
      password: 'password123',
    });

    const secondUser = await registerUser({
      firstName: 'Second',
      lastName: 'User',
      email: 'seconddelete@example.com',
      password: 'password123',
    });

    const token = firstUser.body.token;
    const secondUserId = secondUser.body._id;

    const res = await request(app)
      .delete(`/api/users/${secondUserId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(403);
    expect(res.body.error).toBe('You can only delete your own profile');
  });

  it('should not allow duplicate emails', async () => {
    await registerUser({
      firstName: 'A',
      lastName: 'B',
      email: 'duplicate@example.com',
      password: 'password123',
    });

    const res = await registerUser({
      firstName: 'C',
      lastName: 'D',
      email: 'duplicate@example.com',
      password: 'password123',
    });

    expect(res.statusCode).toBe(409);
    expect(res.body.error).toBe('User with this email already exists');
  });
});
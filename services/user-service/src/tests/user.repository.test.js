const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const userRepository = require('../repositories/userRepository');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
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

describe('User Repository', () => {
  it('should create a user', async () => {
    const user = await userRepository.createUser({
      firstName: 'Gal',
      lastName: 'Leitgeb',
      email: 'gal@example.com',
      password: 'hashed-password',
      phone: '040123456',
      city: 'Maribor',
    });

    expect(user._id).toBeDefined();
    expect(user.firstName).toBe('Gal');
    expect(user.email).toBe('gal@example.com');
  });

  it('should get all users', async () => {
    await userRepository.createUser({
      firstName: 'Ana',
      lastName: 'Novak',
      email: 'ana@example.com',
      password: 'hashed-password-1',
    });

    await userRepository.createUser({
      firstName: 'Miha',
      lastName: 'Kranjc',
      email: 'miha@example.com',
      password: 'hashed-password-2',
    });

    const users = await userRepository.getAllUsers();

    expect(users.length).toBe(2);
  });

  it('should get a user by id', async () => {
    const created = await userRepository.createUser({
      firstName: 'Eva',
      lastName: 'Horvat',
      email: 'eva@example.com',
      password: 'hashed-password',
    });

    const found = await userRepository.getUserById(created._id);

    expect(found).not.toBeNull();
    expect(found.email).toBe('eva@example.com');
  });

  it('should update a user by id', async () => {
    const created = await userRepository.createUser({
      firstName: 'Tina',
      lastName: 'Kralj',
      email: 'tina@example.com',
      password: 'hashed-password',
      city: 'Celje',
    });

    const updated = await userRepository.updateUserById(created._id, {
      city: 'Ljubljana',
    });

    expect(updated.city).toBe('Ljubljana');
  });

  it('should delete a user by id', async () => {
    const created = await userRepository.createUser({
      firstName: 'Marko',
      lastName: 'Zupan',
      email: 'marko@example.com',
      password: 'hashed-password',
    });

    const deleted = await userRepository.deleteUserById(created._id);
    const found = await userRepository.getUserById(created._id);

    expect(deleted).not.toBeNull();
    expect(found).toBeNull();
  });

  it('should find a user by email', async () => {
    await userRepository.createUser({
      firstName: 'Nina',
      lastName: 'Potočnik',
      email: 'nina@example.com',
      password: 'hashed-password',
    });

    const found = await userRepository.getUserByEmail('nina@example.com');

    expect(found).not.toBeNull();
    expect(found.firstName).toBe('Nina');
  });

  it('should find a user by email with password', async () => {
    await userRepository.createUser({
      firstName: 'Luka',
      lastName: 'Bizjak',
      email: 'luka@example.com',
      password: 'hashed-password',
    });

    const found = await userRepository.getUserByEmailWithPassword('luka@example.com');

    expect(found).not.toBeNull();
    expect(found.email).toBe('luka@example.com');
    expect(found.password).toBeDefined();
  });
});
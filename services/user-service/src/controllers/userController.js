const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userRepository = require('../repositories/userRepository');

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '1d',
    }
  );
};

exports.registerUser = async (req, res) => {
  try {
    console.log('Registering user:', req.body.email);

    const { firstName, lastName, email, password, phone, city } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        error: 'firstName, lastName, email and password are required',
      });
    }

    const existingUser = await userRepository.getUserByEmail(email);
    if (existingUser) {
      console.warn('User with email already exists:', email);
      return res.status(409).json({ error: 'User with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await userRepository.createUser({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      phone,
      city,
    });

    const token = generateToken(user);

    return res.status(201).json({
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      city: user.city,
      isActive: user.isActive,
      token,
    });
  } catch (err) {
    console.error('Error registering user:', err.message);
    return res.status(400).json({ error: err.message });
  }
};

exports.loginUser = async (req, res) => {
  try {
    console.log('Logging in user:', req.body.email);

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await userRepository.getUserByEmailWithPassword(email);

    if (!user) {
      console.warn('Login failed - user not found:', email);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      console.warn('Login failed - invalid password for:', email);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(user);

    return res.json({
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      city: user.city,
      isActive: user.isActive,
      token,
    });
  } catch (err) {
    console.error('Error logging in user:', err.message);
    return res.status(500).json({ error: err.message });
  }
};

exports.getUsers = async (req, res) => {
  try {
    console.log('Fetching all users');
    const users = await userRepository.getAllUsers();
    return res.json(users);
  } catch (err) {
    console.error('Error fetching users:', err.message);
    return res.status(500).json({ error: err.message });
  }
};

exports.getUser = async (req, res) => {
  try {
    console.log('Fetching user with ID:', req.params.id);
    const user = await userRepository.getUserById(req.params.id);

    if (!user) {
      console.warn('User not found:', req.params.id);
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json(user);
  } catch (err) {
    console.error('Error fetching user:', err.message);
    return res.status(500).json({ error: err.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    console.log('Updating user with ID:', req.params.id);

    if (req.user.id !== req.params.id) {
      console.warn('Forbidden update attempt by user:', req.user.id);
      return res.status(403).json({ error: 'You can only update your own profile' });
    }

    const updateData = { ...req.body };

    if (updateData.email) {
      const existingUser = await userRepository.getUserByEmail(updateData.email);
      if (existingUser && existingUser._id.toString() !== req.params.id) {
        console.warn('Another user already uses email:', updateData.email);
        return res.status(409).json({ error: 'User with this email already exists' });
      }
    }

    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }

    const user = await userRepository.updateUserById(req.params.id, updateData);

    if (!user) {
      console.warn('User not found for update:', req.params.id);
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json(user);
  } catch (err) {
    console.error('Error updating user:', err.message);
    return res.status(400).json({ error: err.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    console.log('Deleting user with ID:', req.params.id);

    if (req.user.id !== req.params.id) {
      console.warn('Forbidden delete attempt by user:', req.user.id);
      return res.status(403).json({ error: 'You can only delete your own profile' });
    }

    const user = await userRepository.deleteUserById(req.params.id);

    if (!user) {
      console.warn('User not found for deletion:', req.params.id);
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({ message: 'User deleted' });
  } catch (err) {
    console.error('Error deleting user:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
const User = require('../models/User');

const createUser = async (userData) => {
  return User.create(userData);
};

const getAllUsers = async () => {
  return User.find();
};

const getUserById = async (id) => {
  return User.findById(id);
};

const getUserByEmail = async (email) => {
  return User.findOne({ email: email.toLowerCase() });
};

const getUserByIdWithPassword = async (id) => {
  return User.findById(id).select('+password');
};

const getUserByEmailWithPassword = async (email) => {
  return User.findOne({ email: email.toLowerCase() }).select('+password');
};

const updateUserById = async (id, updateData) => {
  return User.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  });
};

const deleteUserById = async (id) => {
  return User.findByIdAndDelete(id);
};

module.exports = {
  createUser,
  getAllUsers,
  getUserById,
  getUserByIdWithPassword,
  getUserByEmailWithPassword,
  updateUserById,
  deleteUserById,
  getUserByEmail,
};
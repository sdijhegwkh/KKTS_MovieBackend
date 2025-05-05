const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const User = require('../models/User');

// API to create a new user
router.post('/', async (req, res) => {
  try {
    const { name, phone, password, role } = req.body;

    // Convert role to isAdmin boolean
    const isAdmin = role === 'Admin';

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      phone,
      password: hashedPassword,
      isAdmin,
    });

    const savedUser = await newUser.save();

    res.status(201).json({
      id: savedUser._id,
      name: savedUser.name,
      phone: savedUser.phone,
      role: savedUser.isAdmin ? 'Admin' : 'Khách hàng',
    });
  } catch (error) {
    console.error('Error creating user:', error.message, error.stack);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Số điện thoại đã tồn tại' });
    }
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// API to get all users
router.get('/', async (req, res) => {
  try {
    const users = await User.find();
    res.json(
      users.map((user) => ({
        id: user._id,
        name: user.name,
        phone: user.phone,
        role: user.isAdmin ? 'Admin' : 'Khách hàng',
      }))
    );
  } catch (error) {
    console.error('Error fetching users:', error.message, error.stack);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// API to get total number of users
router.get('/stats', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    console.log(`Total users counted: ${totalUsers}`);
    res.json({ totalUsers });
  } catch (error) {
    console.error('Error fetching user stats:', error.message, error.stack);
    res.status(500).json({ error: 'Failed to fetch user stats' });
  }
});

// API to update a user
router.put('/:id', async (req, res) => {
  try {
    const { name, phone, role } = req.body;
    const userId = req.params.id;

    // Convert role to isAdmin boolean
    const isAdmin = role === 'Admin';

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { name, phone, isAdmin },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: updatedUser._id,
      name: updatedUser.name,
      phone: updatedUser.phone,
      role: updatedUser.isAdmin ? 'Admin' : 'Khách hàng',
    });
  } catch (error) {
    console.error('Error updating user:', error.message, error.stack);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Số điện thoại đã tồn tại' });
    }
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// API to delete a user
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    const deletedUser = await User.findByIdAndDelete(userId);

    if (!deletedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error.message, error.stack);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

module.exports = router;
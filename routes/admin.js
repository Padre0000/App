const express = require('express');
const User = require('../models/User');
const Store = require('../models/Store');
const Offer = require('../models/Offer');
const Order = require('../models/Order');
const router = express.Router();

// Middleware للتحقق من التوكن والصلاحيات
const verifyToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const decoded = require('jsonwebtoken').verify(token, process.env.JWT_SECRET || 'secret');
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(403).json({ error: 'Invalid token' });
  }
};

// Middleware للتحقق من صلاحيات الأدمن
const verifyAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || user.email !== process.env.ADMIN_EMAIL) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  } catch (error) {
    res.status(403).json({ error: 'Admin access required' });
  }
};

// Post /create-store - إنشاء متجر جديد (أدمن فقط)
router.post('/create-store', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { name, description, image, location, hasDelivery, deliveryRadius, deliveryCost, categories, ownerEmail } = req.body;

    // البحث عن صاحب المتجر
    const owner = await User.findOne({ email: ownerEmail });
    if (!owner) {
      return res.status(404).json({ error: 'Owner not found' });
    }

    const store = new Store({
      name,
      description,
      image,
      location,
      hasDelivery,
      deliveryRadius,
      deliveryCost,
      categories,
      owner: owner._id
    });

    await store.save();

    res.status(201).json({
      message: 'Store created successfully',
      store
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Put /add-employee-to-store - إضافة موظف لمتجر (أدمن فقط)
router.put('/add-employee-to-store/:storeId', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { employeeEmail, role } = req.body;

    const store = await Store.findById(req.params.storeId);
    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }

    const employee = await User.findOne({ email: employeeEmail });
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    store.employees.push({
      userId: employee._id,
      role,
      email: employeeEmail
    });

    await store.save();

    res.json({
      message: 'Employee added to store successfully',
      store
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Post /create-offer - إنشاء عرض (أدمن فقط)
router.post('/create-offer', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { title, description, image, storeId, discount, startDate, endDate, order } = req.body;

    const offer = new Offer({
      title,
      description,
      image,
      store: storeId || null,
      discount,
      startDate,
      endDate,
      order,
      createdBy: req.userId
    });

    await offer.save();

    res.status(201).json({
      message: 'Offer created successfully',
      offer
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get /all-offers - الحصول على جميع العروض
router.get('/all-offers', async (req, res) => {
  try {
    const offers = await Offer.find({ isActive: true })
      .sort({ order: 1, createdAt: -1 });

    res.json(offers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Put /update-offer/:id - تحديث عرض (أدمن فقط)
router.put('/update-offer/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { title, description, image, discount, startDate, endDate, order } = req.body;

    const offer = await Offer.findByIdAndUpdate(
      req.params.id,
      {
        title,
        description,
        image,
        discount,
        startDate,
        endDate,
        order
      },
      { new: true }
    );

    res.json({
      message: 'Offer updated successfully',
      offer
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete /delete-offer/:id - حذف عرض (أدمن فقط)
router.delete('/delete-offer/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const offer = await Offer.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    res.json({
      message: 'Offer deleted successfully',
      offer
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get /dashboard - لوحة تحكم الأدمن
router.get('/dashboard', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalStores = await Store.countDocuments();
    const totalOrders = await Order.countDocuments();
    const totalRevenue = await Order.aggregate([
      { $group: { _id: null, total: { $sum: '$totalPrice' } } }
    ]);

    res.json({
      totalUsers,
      totalStores,
      totalOrders,
      totalRevenue: totalRevenue[0]?.total || 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get /users-list - قائمة المستخدمين (أدمن فقط)
router.get('/users-list', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get /stores-list - قائمة المتاجر (أدمن فقط)
router.get('/stores-list', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const stores = await Store.find()
      .populate('owner', 'email firstName lastName')
      .sort({ createdAt: -1 });
    
    res.json(stores);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get /orders-list - قائمة الطلبات (أدمن فقط)
router.get('/orders-list', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('user', 'firstName lastName email')
      .populate('store', 'name')
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

const express = require('express');
const Product = require('../models/Product');
const router = express.Router();

// Middleware للتحقق من التوكن
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

// Post /create - إنشاء منتج جديد
router.post('/create', verifyToken, async (req, res) => {
  try {
    const { name, description, category, store, price, discount, images, stock } = req.body;

    const product = new Product({
      name,
      description,
      category,
      store,
      price,
      discount,
      images,
      stock
    });

    await product.save();

    res.status(201).json({
      message: 'Product created successfully',
      product
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get /all - الحصول على جميع المنتجات
router.get('/all', async (req, res) => {
  try {
    const products = await Product.find({ isActive: true })
      .populate('store', 'name location')
      .limit(50);
    
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get /search - البحث عن منتج
router.get('/search', async (req, res) => {
  try {
    const { query, category } = req.query;

    let filter = { isActive: true };

    if (query) {
      filter.$or = [
        { name: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } }
      ];
    }

    if (category) {
      filter.category = category;
    }

    const products = await Product.find(filter)
      .populate('store', 'name location')
      .limit(50);

    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get /:id - الحصول على منتج محدد
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('store')
      .populate('reviews.userId', 'firstName lastName profileImage');

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Put /:id/update - تحديث المنتج
router.put('/:id/update', verifyToken, async (req, res) => {
  try {
    const { name, description, category, price, discount, images, stock } = req.body;

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      {
        name,
        description,
        category,
        price,
        discount,
        images,
        stock,
        updatedAt: new Date()
      },
      { new: true }
    );

    res.json({
      message: 'Product updated successfully',
      product
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Post /:id/review - إضافة تقييم للمنتج
router.post('/:id/review', verifyToken, async (req, res) => {
  try {
    const { rating, comment } = req.body;

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    product.reviews.push({
      userId: req.userId,
      rating,
      comment,
      createdAt: new Date()
    });

    // حساب متوسط التقييمات
    const avgRating = product.reviews.reduce((sum, r) => sum + r.rating, 0) / product.reviews.length;
    product.rating = avgRating;

    await product.save();

    res.json({
      message: 'Review added successfully',
      product
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete /:id - حذف منتج
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    res.json({
      message: 'Product deleted successfully',
      product
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

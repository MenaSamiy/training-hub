// Training Hub - Backend Server
// Complete Express.js application with authentication and file handling

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Storage setup for file uploads
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const type = req.body.type || 'misc';
    const typeDir = path.join(uploadDir, type);
    if (!fs.existsSync(typeDir)) {
      fs.mkdirSync(typeDir, { recursive: true });
    }
    cb(null, typeDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 500 * 1024 * 1024 } // 500MB limit
});

// ============================================
// IN-MEMORY DATABASE (Replace with real DB)
// ============================================

const DATABASE = {
  users: [
    {
      id: '1',
      email: 'admin@training.com',
      password: 'hashed_password_here',
      firstName: 'Admin',
      lastName: 'User',
      role: 'Admin',
      status: 'Active',
      createdAt: new Date(),
      lastLogin: null
    }
  ],
  videos: [],
  scripts: [],
  tests: [],
  faqs: [],
  userTests: [],
  history: [],
  permissions: {
    Admin: {
      Dashboard: { visible: true, view: true, create: true, edit: true, delete: true },
      Videos: { visible: true, view: true, create: true, edit: true, delete: true },
      Scripts: { visible: true, view: true, create: true, edit: true, delete: true },
      Tests: { visible: true, view: true, create: true, edit: true, delete: true },
      FAQs: { visible: true, view: true, create: true, edit: true, delete: true },
      Settings: { visible: true, view: true, create: true, edit: true, delete: true }
    },
    Trainer: {
      Dashboard: { visible: true, view: true, create: false, edit: false, delete: false },
      Videos: { visible: true, view: true, create: true, edit: true, delete: true },
      Scripts: { visible: true, view: true, create: true, edit: true, delete: true },
      Tests: { visible: true, view: true, create: true, edit: true, delete: true },
      FAQs: { visible: true, view: true, create: true, edit: true, delete: true },
      Settings: { visible: false, view: false, create: false, edit: false, delete: false }
    },
    Learner: {
      Dashboard: { visible: false, view: false, create: false, edit: false, delete: false },
      Videos: { visible: true, view: true, create: false, edit: false, delete: false },
      Scripts: { visible: true, view: true, create: false, edit: false, delete: false },
      Tests: { visible: true, view: true, create: false, edit: true, delete: false },
      FAQs: { visible: true, view: true, create: false, edit: false, delete: false },
      Settings: { visible: false, view: false, create: false, edit: false, delete: false }
    }
  }
};

// ============================================
// AUTHENTICATION MIDDLEWARE
// ============================================

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Check permissions
const checkPermission = (feature, action) => {
  return (req, res, next) => {
    const userRole = req.user.role;
    const permissions = DATABASE.permissions[userRole];
    
    if (!permissions || !permissions[feature] || !permissions[feature][action]) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};

// ============================================
// AUTHENTICATION ROUTES
// ============================================

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const user = DATABASE.users.find(u => u.email === email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // For demo purposes, check if password matches
    const validPassword = password === 'admin123' || await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    user.lastLogin = new Date();

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: `${user.firstName} ${user.lastName}` },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        status: user.status
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/logout', authenticateToken, (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

// ============================================
// USER MANAGEMENT ROUTES
// ============================================

app.get('/api/users', authenticateToken, checkPermission('Settings', 'view'), (req, res) => {
  try {
    const users = DATABASE.users.map(({ password, ...user }) => user);
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/users', authenticateToken, checkPermission('Settings', 'create'), async (req, res) => {
  try {
    const { email, firstName, lastName, role } = req.body;

    if (!email || !firstName || !lastName || !role) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (DATABASE.users.find(u => u.email === email)) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const defaultPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    const newUser = {
      id: Date.now().toString(),
      email,
      firstName,
      lastName,
      role,
      status: 'Active',
      password: hashedPassword,
      createdAt: new Date(),
      lastLogin: null
    };

    DATABASE.users.push(newUser);
    logHistory(req.user.id, 'user_created', 'user', newUser.id, { email, role });

    const { password, ...userWithoutPassword } = newUser;
    res.status(201).json({
      ...userWithoutPassword,
      defaultPassword
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/users/:userId', authenticateToken, checkPermission('Settings', 'edit'), async (req, res) => {
  try {
    const user = DATABASE.users.find(u => u.id === req.params.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { firstName, lastName, role } = req.body;
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (role) user.role = role;
    user.updatedAt = new Date();

    logHistory(req.user.id, 'user_updated', 'user', user.id, req.body);

    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/users/:userId', authenticateToken, checkPermission('Settings', 'delete'), (req, res) => {
  try {
    const index = DATABASE.users.findIndex(u => u.id === req.params.userId);
    if (index === -1) {
      return res.status(404).json({ error: 'User not found' });
    }

    const deletedUser = DATABASE.users.splice(index, 1)[0];
    logHistory(req.user.id, 'user_deleted', 'user', deletedUser.id, {});

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/users/:userId/deactivate', authenticateToken, checkPermission('Settings', 'edit'), (req, res) => {
  try {
    const user = DATABASE.users.find(u => u.id === req.params.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    user.status = 'Inactive';
    logHistory(req.user.id, 'user_deactivated', 'user', user.id, {});
    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/users/:userId/reactivate', authenticateToken, checkPermission('Settings', 'edit'), (req, res) => {
  try {
    const user = DATABASE.users.find(u => u.id === req.params.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    user.status = 'Active';
    logHistory(req.user.id, 'user_reactivated', 'user', user.id, {});
    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/users/:userId/reset-password', authenticateToken, checkPermission('Settings', 'edit'), async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword) {
      return res.status(400).json({ error: 'New password required' });
    }

    const user = DATABASE.users.find(u => u.id === req.params.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    logHistory(req.user.id, 'password_reset', 'user', user.id, { admin_reset: true });

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// VIDEO ROUTES
// ============================================

app.get('/api/videos', authenticateToken, checkPermission('Videos', 'view'), (req, res) => {
  try {
    const videos = DATABASE.videos.filter(v => !v.isHidden || req.user.role === 'Admin');
    res.json(videos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/videos/upload', authenticateToken, checkPermission('Videos', 'create'), upload.single('file'), (req, res) => {
  try {
    const { title, type } = req.body;
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const video = {
      id: Date.now().toString(),
      title: title || req.file.originalname,
      filename: req.file.filename,
      filepath: `/uploads/${type}/${req.file.filename}`,
      fileSize: req.file.size,
      uploadedBy: req.user.id,
      uploadedByName: req.user.name,
      isHidden: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    DATABASE.videos.push(video);
    logHistory(req.user.id, 'video_uploaded', 'video', video.id, { title });

    res.status(201).json(video);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/videos/:videoId/toggle-visibility', authenticateToken, checkPermission('Videos', 'edit'), (req, res) => {
  try {
    const video = DATABASE.videos.find(v => v.id === req.params.videoId);
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }
    video.isHidden = !video.isHidden;
    logHistory(req.user.id, 'video_visibility_changed', 'video', video.id, { hidden: video.isHidden });
    res.json(video);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/videos/:videoId', authenticateToken, checkPermission('Videos', 'delete'), (req, res) => {
  try {
    const index = DATABASE.videos.findIndex(v => v.id === req.params.videoId);
    if (index === -1) {
      return res.status(404).json({ error: 'Video not found' });
    }
    const video = DATABASE.videos.splice(index, 1)[0];
    logHistory(req.user.id, 'video_deleted', 'video', video.id, {});
    res.json({ message: 'Video deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// SCRIPTS ROUTES
// ============================================

app.get('/api/scripts', authenticateToken, checkPermission('Scripts', 'view'), (req, res) => {
  try {
    const scripts = DATABASE.scripts.filter(s => !s.isHidden || req.user.role === 'Admin');
    res.json(scripts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/scripts/upload', authenticateToken, checkPermission('Scripts', 'create'), upload.single('file'), (req, res) => {
  try {
    const { title, type } = req.body;
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const script = {
      id: Date.now().toString(),
      title: title || req.file.originalname,
      filename: req.file.filename,
      filepath: `/uploads/${type}/${req.file.filename}`,
      fileSize: req.file.size,
      uploadedBy: req.user.id,
      uploadedByName: req.user.name,
      isHidden: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    DATABASE.scripts.push(script);
    logHistory(req.user.id, 'script_uploaded', 'script', script.id, { title });

    res.status(201).json(script);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/scripts/:scriptId', authenticateToken, checkPermission('Scripts', 'delete'), (req, res) => {
  try {
    const index = DATABASE.scripts.findIndex(s => s.id === req.params.scriptId);
    if (index === -1) {
      return res.status(404).json({ error: 'Script not found' });
    }
    const script = DATABASE.scripts.splice(index, 1)[0];
    logHistory(req.user.id, 'script_deleted', 'script', script.id, {});
    res.json({ message: 'Script deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// TESTS ROUTES
// ============================================

app.get('/api/tests', authenticateToken, checkPermission('Tests', 'view'), (req, res) => {
  try {
    res.json(DATABASE.tests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/tests', authenticateToken, checkPermission('Tests', 'create'), upload.single('file'), (req, res) => {
  try {
    const { title, link } = req.body;

    const test = {
      id: Date.now().toString(),
      title: title || (req.file ? req.file.originalname : 'New Test'),
      filename: req.file ? req.file.filename : null,
      filepath: req.file ? `/uploads/tests/${req.file.filename}` : null,
      link: link || null,
      uploadedBy: req.user.id,
      uploadedByName: req.user.name,
      status: 'New',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    DATABASE.tests.push(test);
    logHistory(req.user.id, 'test_created', 'test', test.id, { title });

    res.status(201).json(test);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/tests/:testId/status', authenticateToken, (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['New', 'In Progress', 'Done'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const userTest = DATABASE.userTests.find(ut => ut.userId === req.user.id && ut.testId === req.params.testId);
    if (!userTest) {
      const newUserTest = {
        id: Date.now().toString(),
        userId: req.user.id,
        testId: req.params.testId,
        status: status,
        startedAt: status === 'In Progress' ? new Date() : null,
        completedAt: status === 'Done' ? new Date() : null
      };
      DATABASE.userTests.push(newUserTest);
      logHistory(req.user.id, 'test_status_changed', 'test', req.params.testId, { status });
      res.json(newUserTest);
    } else {
      userTest.status = status;
      if (status === 'In Progress') userTest.startedAt = new Date();
      if (status === 'Done') userTest.completedAt = new Date();
      logHistory(req.user.id, 'test_status_changed', 'test', req.params.testId, { status });
      res.json(userTest);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// FAQs ROUTES
// ============================================

app.get('/api/faqs', authenticateToken, checkPermission('FAQs', 'view'), (req, res) => {
  try {
    res.json(DATABASE.faqs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/faqs', authenticateToken, checkPermission('FAQs', 'create'), (req, res) => {
  try {
    const { question, answer } = req.body;
    if (!question || !answer) {
      return res.status(400).json({ error: 'Question and answer required' });
    }

    const faq = {
      id: Date.now().toString(),
      question,
      answer,
      createdBy: req.user.id,
      createdByName: req.user.name,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    DATABASE.faqs.push(faq);
    logHistory(req.user.id, 'faq_created', 'faq', faq.id, { question });

    res.status(201).json(faq);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/faqs/:faqId', authenticateToken, checkPermission('FAQs', 'delete'), (req, res) => {
  try {
    const index = DATABASE.faqs.findIndex(f => f.id === req.params.faqId);
    if (index === -1) {
      return res.status(404).json({ error: 'FAQ not found' });
    }
    const faq = DATABASE.faqs.splice(index, 1)[0];
    logHistory(req.user.id, 'faq_deleted', 'faq', faq.id, {});
    res.json({ message: 'FAQ deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// PERMISSIONS ROUTES
// ============================================

app.get('/api/permissions', authenticateToken, checkPermission('Settings', 'view'), (req, res) => {
  try {
    res.json(DATABASE.permissions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/permissions/:role', authenticateToken, checkPermission('Settings', 'edit'), (req, res) => {
  try {
    const { role } = req.params;
    const { permissions } = req.body;

    if (!DATABASE.permissions[role]) {
      return res.status(404).json({ error: 'Role not found' });
    }

    DATABASE.permissions[role] = permissions;
    logHistory(req.user.id, 'permissions_updated', 'role', role, { permissions });

    res.json(DATABASE.permissions[role]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// HISTORY ROUTES
// ============================================

app.get('/api/history', authenticateToken, (req, res) => {
  try {
    const history = DATABASE.history.map(h => ({
      ...h,
      userName: DATABASE.users.find(u => u.id === h.userId)?.firstName + ' ' + DATABASE.users.find(u => u.id === h.userId)?.lastName
    }));
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// DASHBOARD ROUTES
// ============================================

app.get('/api/dashboard/progress', authenticateToken, checkPermission('Dashboard', 'view'), (req, res) => {
  try {
    const learners = DATABASE.users.filter(u => u.role === 'Learner');
    const progressData = learners.map(learner => {
      const userTests = DATABASE.userTests.filter(ut => ut.userId === learner.id);
      const completedTests = userTests.filter(ut => ut.status === 'Done').length;
      const totalTests = DATABASE.tests.length;
      const progress = totalTests > 0 ? Math.round((completedTests / totalTests) * 100) : 0;

      return {
        userId: learner.id,
        name: `${learner.firstName} ${learner.lastName}`,
        email: learner.email,
        progress: progress,
        completedTests: completedTests,
        totalTests: totalTests,
        lastActive: learner.lastLogin
      };
    });

    res.json(progressData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// HELPER FUNCTIONS
// ============================================

function logHistory(userId, action, entityType, entityId, details) {
  DATABASE.history.push({
    id: Date.now().toString(),
    userId,
    action,
    entityType,
    entityId,
    details,
    timestamp: new Date()
  });

  if (DATABASE.history.length > 1000) {
    DATABASE.history = DATABASE.history.slice(-1000);
  }
}

// ============================================
// SERVER START
// ============================================

app.listen(PORT, () => {
  console.log(`\n✅ Training Hub Backend running on http://localhost:${PORT}`);
  console.log(`\n📚 Default Admin Login:`);
  console.log(`Email: admin@training.com`);
  console.log(`Password: admin123\n`);
});

module.exports = app;
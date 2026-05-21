/* ============================================================
   ITJARENG VTC — NODE.JS BACKEND SERVER
   Express + MongoDB (Mongoose) + Atlas
   Run with: node server.js
============================================================ */

require('dotenv').config();

const express  = require('express');
const cors     = require('cors');
const bcrypt   = require('bcryptjs');
const session  = require('express-session');
const mongoose = require('mongoose');
const path     = require('path');
const fs       = require('fs');

const app  = express();
const PORT = process.env.PORT || 3000;

/* ============================================================
   MONGODB CONNECTION
============================================================ */
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in .env file!');
  console.error('   Please create a .env file with your MongoDB connection string.');
  process.exit(1);
}

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('');
    console.log('✅ Connected to MongoDB Atlas successfully!');
    console.log('   Database: itjareng');
  })
  .catch(err => {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  });

/* ============================================================
   MONGOOSE SCHEMAS & MODELS
   Collections are created automatically on first use
============================================================ */

/* ----- USER SCHEMA ----- */
const userSchema = new mongoose.Schema({
  userId:       { type: String, required: true, unique: true },
  firstName:    { type: String, required: true, trim: true },
  lastName:     { type: String, required: true, trim: true },
  email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone:        { type: String, required: true, trim: true },
  gender:       { type: String, required: true },
  username:     { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:     { type: String, required: true },
  role:         { type: String, default: 'visitor' },
  registeredAt: { type: Date, default: Date.now },
  lastEditedAt: { type: Date }
});

/* ----- VISITOR SCHEMA (login/logout log) ----- */
const visitorSchema = new mongoose.Schema({
  userId:       { type: String, required: true },
  username:     { type: String, required: true },
  fullName:     { type: String },
  email:        { type: String },
  phone:        { type: String },
  gender:       { type: String },
  registeredAt: { type: Date },
  loginAt:      { type: Date, default: null },
  logoutAt:     { type: Date, default: null },
  status:       { type: String, default: 'registered' }
});

/* ----- APPLICATION SCHEMA ----- */
const applicationSchema = new mongoose.Schema({
  applicationId:       { type: String, required: true, unique: true },
  first_name:          { type: String },
  last_name:           { type: String },
  dob:                 { type: String },
  gender:              { type: String },
  national_id:         { type: String },
  nationality:         { type: String },
  phone:               { type: String },
  email:               { type: String },
  address:             { type: String },
  district:            { type: String },
  emergency_contact:   { type: String },
  emergency_phone:     { type: String },
  disability_type:     { type: String },
  disability_description: { type: String },
  support_needs:       { type: String },
  highest_education:   { type: String },
  school_name:         { type: String },
  year_completed:      { type: String },
  preferred_program:   { type: String },
  second_choice:       { type: String },
  motivation:          { type: String },
  heard_from:          { type: String },
  consent:             { type: String },
  submittedByUserId:   { type: String },
  submittedByUsername: { type: String },
  timestamp:           { type: Date, default: Date.now },
  lastEditedAt:        { type: Date },
  lastEditedBy:        { type: String }
}, { strict: false }); // strict:false allows extra fields from the form

const User        = mongoose.model('User',        userSchema);
const Visitor     = mongoose.model('Visitor',     visitorSchema);
const Application = mongoose.model('Application', applicationSchema);

/* ============================================================
   ITJARENG.JSON — still served from file (content data)
============================================================ */
const ITJARENG_FILE = path.join(__dirname, 'data', 'itjareng.json');

function readItjareng() {
  try {
    return JSON.parse(fs.readFileSync(ITJARENG_FILE, 'utf8'));
  } catch (e) {
    console.error('❌ Could not read itjareng.json:', e.message);
    return {};
  }
}

/* ============================================================
   ADMIN CREDENTIALS (hardcoded as before)
============================================================ */
const ADMIN = {
  username: 'Itjareng',
  password: 'itjareng70',
  role:     'admin',
  fullName: 'IVTC Administrator'
};

/* ============================================================
   MIDDLEWARE
============================================================ */

// CORS — allow frontend on port 5500 and backend on 3000
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://127.0.0.1:3000',
  'https://itjareng-vtc.vercel.app'  // add this
];
app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      return callback(new Error('CORS policy: origin not allowed'), false);
    }
    return callback(null, true);
  },
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session
app.use(session({
  secret: process.env.SESSION_SECRET || 'ivtc-secret-key-2025',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure:   false,   // set true when using HTTPS
    httpOnly: true,
    sameSite: 'lax',
    maxAge:   1000 * 60 * 60 * 8  // 8 hours
  }
}));

// Static files — serve frontend folder
app.use(express.static(path.join(__dirname, '..', 'frontend')));

/* ============================================================
   AUTH MIDDLEWARE
============================================================ */
function requireLogin(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ success: false, message: 'Not logged in.' });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session || !req.session.user || req.session.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin access required.' });
  }
  next();
}

/* ============================================================
   HELPER — convert Mongoose doc to plain object for response
============================================================ */
function toObj(doc) {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : doc;
  obj.id = obj._id ? obj._id.toString() : obj.userId;
  delete obj._id;
  delete obj.__v;
  return obj;
}

/* ============================================================
   ROUTE: GET /api/session
============================================================ */
app.get('/api/session', (req, res) => {
  if (!req.session || !req.session.user) {
    return res.json({ loggedIn: false });
  }
  return res.json({ loggedIn: true, user: req.session.user });
});

/* ============================================================
   ROUTE: GET /api/data  (serves itjareng.json — unchanged)
============================================================ */
app.get('/api/data', (req, res) => {
  const data = readItjareng();
  res.json({ success: true, data });
});

/* ============================================================
   ROUTE: POST /api/register
============================================================ */
app.post('/api/register', async (req, res) => {
  try {
    const { firstName, lastName, email, phone, gender, username, password } = req.body;

    if (!firstName || !lastName || !email || !phone || !gender || !username || !password) {
      return res.json({ success: false, message: 'All fields are required.' });
    }

    if (!/^[a-z0-9_]{4,}$/.test(username.toLowerCase())) {
      return res.json({ success: false, message: 'Username must be at least 4 characters — letters, numbers, underscores only.' });
    }

    if (password.length < 6) {
      return res.json({ success: false, message: 'Password must be at least 6 characters.' });
    }

    // Check uniqueness in MongoDB
    const existingUsername = await User.findOne({ username: username.toLowerCase() });
    if (existingUsername) {
      return res.json({ success: false, message: 'That username is already taken.' });
    }

    const existingEmail = await User.findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      return res.json({ success: false, message: 'An account with that email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = 'USR-' + Date.now();

    // Save user to MongoDB
    const newUser = await User.create({
      userId,
      firstName: firstName.trim(),
      lastName:  lastName.trim(),
      email:     email.trim().toLowerCase(),
      phone:     phone.trim(),
      gender,
      username:  username.trim().toLowerCase(),
      password:  hashedPassword,
      role:      'visitor',
      registeredAt: new Date()
    });

    // Save visitor log to MongoDB
    await Visitor.create({
      userId,
      username:     newUser.username,
      fullName:     newUser.firstName + ' ' + newUser.lastName,
      email:        newUser.email,
      phone:        newUser.phone,
      gender:       newUser.gender,
      registeredAt: newUser.registeredAt,
      loginAt:      null,
      logoutAt:     null,
      status:       'registered'
    });

    console.log(`✅ New user registered: ${newUser.username} (${newUser.email})`);
    return res.json({ success: true, message: 'Account created successfully!' });

  } catch (err) {
    console.error('Register error:', err);
    if (err.code === 11000) {
      return res.json({ success: false, message: 'Username or email already exists.' });
    }
    return res.json({ success: false, message: 'Server error during registration.' });
  }
});

/* ============================================================
   ROUTE: POST /api/login
============================================================ */
app.post('/api/login', async (req, res) => {
  try {
    const { username, password, role } = req.body;

    if (!username || !password) {
      return res.json({ success: false, message: 'Username and password are required.' });
    }

    // ADMIN LOGIN
    if (role === 'admin') {
      if (username !== ADMIN.username || password !== ADMIN.password) {
        return res.json({ success: false, message: 'Invalid admin credentials. Access denied.' });
      }
      req.session.user = {
        role:     'admin',
        username: ADMIN.username,
        fullName: ADMIN.fullName,
        loginAt:  new Date().toISOString()
      };
      console.log(`🔐 Admin logged in: ${new Date().toLocaleString()}`);
      return res.json({ success: true, role: 'admin', redirect: 'admin.html' });
    }

    // VISITOR LOGIN — find in MongoDB
    const user = await User.findOne({ username: username.toLowerCase() });
    if (!user) {
      return res.json({ success: false, message: 'No account found with that username.' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.json({ success: false, message: 'Incorrect password. Please try again.' });
    }

    const loginTime = new Date();

    // Update visitor log in MongoDB
    await Visitor.findOneAndUpdate(
      { userId: user.userId },
      { loginAt: loginTime, logoutAt: null, status: 'online' },
      { upsert: true, new: true }
    );

    req.session.user = {
      role:     'visitor',
      userId:   user.userId,
      username: user.username,
      fullName: user.firstName + ' ' + user.lastName,
      loginAt:  loginTime.toISOString()
    };

    console.log(`👤 Visitor logged in: ${user.username} at ${loginTime.toISOString()}`);
    return res.json({ success: true, role: 'visitor', redirect: 'index.html' });

  } catch (err) {
    console.error('Login error:', err);
    return res.json({ success: false, message: 'Server error during login.' });
  }
});

/* ============================================================
   ROUTE: POST /api/logout
============================================================ */
app.post('/api/logout', async (req, res) => {
  if (!req.session || !req.session.user) {
    return res.json({ success: true, message: 'Already logged out.' });
  }

  const user = req.session.user;

  if (user.role === 'visitor' && user.userId) {
    try {
      const logoutTime = new Date();
      await Visitor.findOneAndUpdate(
        { userId: user.userId },
        { logoutAt: logoutTime, status: 'offline' }
      );
      console.log(`👤 Visitor logged out: ${user.username} at ${logoutTime.toISOString()}`);
    } catch (e) {
      console.error('Logout visitor update error:', e.message);
    }
  }

  if (user.role === 'admin') {
    console.log(`🔐 Admin logged out at ${new Date().toLocaleString()}`);
  }

  req.session.destroy();
  return res.json({ success: true, message: 'Logged out successfully.' });
});

/* ============================================================
   ROUTE: POST /api/application
   Submit new application — saves to MongoDB
============================================================ */
app.post('/api/application', requireLogin, async (req, res) => {
  try {
    const data = req.body;

    if (!data.first_name || !data.last_name || !data.preferred_program) {
      return res.json({ success: false, message: 'Required application fields are missing.' });
    }

    const applicationId = 'IVTC-' + Date.now().toString(36).toUpperCase();

    await Application.create({
      ...data,
      applicationId,
      timestamp:           new Date(),
      submittedByUserId:   req.session.user.userId   || null,
      submittedByUsername: req.session.user.username || null
    });

    console.log(`📋 New application: ${applicationId} by ${data.first_name} ${data.last_name}`);
    return res.json({ success: true, applicationId });

  } catch (err) {
    console.error('Application error:', err);
    return res.json({ success: false, message: 'Server error saving application.' });
  }
});

/* ============================================================
   ROUTE: GET /api/my-applications
   Visitor fetches their OWN applications only
============================================================ */
app.get('/api/my-applications', requireLogin, async (req, res) => {
  try {
    const apps = await Application.find({
      $or: [
        { submittedByUserId: req.session.user.userId },
        { submittedByUsername: req.session.user.username }
      ]
    }).sort({ timestamp: -1 });

    return res.json({ success: true, data: apps.map(toObj) });
  } catch (err) {
    console.error('My-applications error:', err);
    return res.json({ success: false, message: 'Server error fetching your applications.' });
  }
});

/* ============================================================
   ROUTE: PUT /api/my-applications/:id
   Visitor edits their OWN application
============================================================ */
app.put('/api/my-applications/:id', requireLogin, async (req, res) => {
  try {
    const appId    = req.params.id;
    const userId   = req.session.user.userId;
    const username = req.session.user.username;

    const allowed = [
      'first_name','last_name','phone','email','address','district',
      'emergency_contact','emergency_phone','disability_type',
      'disability_description','support_needs','highest_education',
      'school_name','year_completed','preferred_program','second_choice',
      'motivation','heard_from'
    ];

    const updates = {};
    allowed.forEach(field => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });
    updates.lastEditedAt = new Date();
    updates.lastEditedBy = username;

    const result = await Application.findOneAndUpdate(
      {
        applicationId: appId,
        $or: [
          { submittedByUserId: userId },
          { submittedByUsername: username }
        ]
      },
      { $set: updates },
      { new: true }
    );

    if (!result) {
      return res.json({ success: false, message: 'Application not found or access denied.' });
    }

    console.log(`✏️ Visitor edited own application: ${appId} by ${username}`);
    return res.json({ success: true, message: 'Application updated successfully.' });

  } catch (err) {
    console.error('My-application edit error:', err);
    return res.json({ success: false, message: 'Server error updating application.' });
  }
});

/* ============================================================
   ROUTE: DELETE /api/my-applications/:id
   Visitor deletes their OWN application
============================================================ */
app.delete('/api/my-applications/:id', requireLogin, async (req, res) => {
  try {
    const appId    = req.params.id;
    const userId   = req.session.user.userId;
    const username = req.session.user.username;

    const result = await Application.findOneAndDelete({
      applicationId: appId,
      $or: [
        { submittedByUserId: userId },
        { submittedByUsername: username }
      ]
    });

    if (!result) {
      return res.json({ success: false, message: 'Application not found or access denied.' });
    }

    console.log(`🗑️ Visitor deleted own application: ${appId} by ${username}`);
    return res.json({ success: true, message: 'Application withdrawn successfully.' });

  } catch (err) {
    console.error('My-application delete error:', err);
    return res.json({ success: false, message: 'Server error deleting application.' });
  }
});

/* ============================================================
   ADMIN ROUTES — all require admin session
============================================================ */

// GET all visitors
app.get('/api/admin/visitors', requireAdmin, async (req, res) => {
  try {
    const visitors = await Visitor.find().sort({ registeredAt: -1 });
    console.log(`📊 Admin fetched ${visitors.length} visitors`);
    res.json({ success: true, data: visitors.map(toObj) });
  } catch (err) {
    res.json({ success: false, message: 'Error fetching visitors.' });
  }
});

// GET all users (no password)
app.get('/api/admin/users', requireAdmin, async (req, res) => {
  try {
    const users = await User.find({}, { password: 0 }).sort({ registeredAt: -1 });
    console.log(`📊 Admin fetched ${users.length} users`);
    res.json({ success: true, data: users.map(toObj) });
  } catch (err) {
    res.json({ success: false, message: 'Error fetching users.' });
  }
});

// GET all applications
app.get('/api/admin/applications', requireAdmin, async (req, res) => {
  try {
    const apps = await Application.find().sort({ timestamp: -1 });
    console.log(`📊 Admin fetched ${apps.length} applications`);
    res.json({ success: true, data: apps.map(toObj) });
  } catch (err) {
    res.json({ success: false, message: 'Error fetching applications.' });
  }
});

// PUT edit an application (admin)
app.put('/api/admin/applications/:id', requireAdmin, async (req, res) => {
  try {
    const appId = req.params.id;
    const updates = {
      ...req.body,
      lastEditedAt: new Date(),
      lastEditedBy: 'Admin'
    };
    // Never allow overwriting these
    delete updates.applicationId;
    delete updates._id;
    delete updates.__v;

    const result = await Application.findOneAndUpdate(
      { applicationId: appId },
      { $set: updates },
      { new: true }
    );

    if (!result) {
      return res.json({ success: false, message: 'Application not found.' });
    }

    console.log(`✏️ Admin edited application: ${appId}`);
    return res.json({ success: true, message: 'Application updated.' });

  } catch (err) {
    console.error('Edit application error:', err);
    return res.json({ success: false, message: 'Server error updating application.' });
  }
});

// DELETE an application (admin)
app.delete('/api/admin/applications/:id', requireAdmin, async (req, res) => {
  try {
    const result = await Application.findOneAndDelete({ applicationId: req.params.id });
    if (!result) {
      return res.json({ success: false, message: 'Application not found.' });
    }
    console.log(`🗑️ Admin deleted application: ${req.params.id}`);
    return res.json({ success: true, message: 'Application deleted.' });
  } catch (err) {
    console.error('Delete application error:', err);
    return res.json({ success: false, message: 'Server error deleting application.' });
  }
});

// PUT edit a user (admin)
app.put('/api/admin/users/:id', requireAdmin, async (req, res) => {
  try {
    const userId  = req.params.id;
    const allowed = ['firstName','lastName','email','phone','gender','username'];
    const updates = { lastEditedAt: new Date() };
    allowed.forEach(field => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const updatedUser = await User.findOneAndUpdate(
      { userId },
      { $set: updates },
      { new: true }
    );

    if (!updatedUser) {
      return res.json({ success: false, message: 'User not found.' });
    }

    // Sync visitor log
    await Visitor.findOneAndUpdate(
      { userId },
      {
        $set: {
          fullName: updatedUser.firstName + ' ' + updatedUser.lastName,
          email:    updatedUser.email,
          phone:    updatedUser.phone,
          gender:   updatedUser.gender,
          username: updatedUser.username
        }
      }
    );

    console.log(`✏️ Admin edited user: ${userId}`);
    return res.json({ success: true, message: 'User updated.' });

  } catch (err) {
    console.error('Edit user error:', err);
    return res.json({ success: false, message: 'Server error updating user.' });
  }
});

// DELETE a user (admin)
app.delete('/api/admin/users/:id', requireAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    await User.findOneAndDelete({ userId });
    await Visitor.findOneAndDelete({ userId });
    console.log(`🗑️ Admin deleted user: ${userId}`);
    return res.json({ success: true, message: 'User deleted.' });
  } catch (err) {
    console.error('Delete user error:', err);
    return res.json({ success: false, message: 'Server error deleting user.' });
  }
});

// GET dashboard stats
app.get('/api/admin/stats', requireAdmin, async (req, res) => {
  try {
    const [totalVisitors, onlineNow, totalUsers, totalApplications] = await Promise.all([
      Visitor.countDocuments(),
      Visitor.countDocuments({ status: 'online' }),
      User.countDocuments(),
      Application.countDocuments()
    ]);

    res.json({
      success: true,
      stats: { totalVisitors, onlineNow, totalUsers, totalApplications }
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.json({ success: false, message: 'Error fetching stats.' });
  }
});

/* ============================================================
   START SERVER
============================================================ */
app.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════╗');
  console.log('║   ITJARENG VTC — SERVER RUNNING          ║');
  console.log(`║   http://localhost:${PORT}                   ║`);
  console.log('║   Open this URL in your browser          ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log('');
  console.log('🍃 Storage: MongoDB Atlas (cloud database)');
  console.log('📄 Content: data/itjareng.json (unchanged)');
  console.log('');
  console.log('🔐 Admin login: username=Itjareng  password=itjareng70');
  console.log('');
});

/* ============================================================
   ITJARENG VTC — NODE.JS BACKEND SERVER
   Express + JSON file storage
   Run with: node server.js
============================================================ */

const express  = require('express');
const cors     = require('cors');
const bcrypt   = require('bcryptjs');
const session  = require('express-session');
const fs       = require('fs');
const path     = require('path');

const app  = express();
const PORT = 3000;

/* ============================================================
   PATHS TO JSON DATA FILES
============================================================ */
const DATA_DIR      = path.join(__dirname, 'data');
const USERS_FILE    = path.join(DATA_DIR, 'users.json');
const VISITORS_FILE = path.join(DATA_DIR, 'visitors.json');
const APPS_FILE     = path.join(DATA_DIR, 'applications.json');
const ITJARENG_FILE = path.join(DATA_DIR, 'itjareng.json');

/* ============================================================
   ENSURE DATA DIRECTORY EXISTS
============================================================ */
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(USERS_FILE))    fs.writeFileSync(USERS_FILE,    '[]', 'utf8');
if (!fs.existsSync(VISITORS_FILE)) fs.writeFileSync(VISITORS_FILE, '[]', 'utf8');
if (!fs.existsSync(APPS_FILE))     fs.writeFileSync(APPS_FILE,     '[]', 'utf8');

/* ============================================================
   MIDDLEWARE — ORDER MATTERS
   1. CORS
   2. Body parsers
   3. Session          ← must be before any route that uses req.session
   4. Static files     ← last, so API routes take priority
============================================================ */

// 1. CORS — allow same origin (served from port 3000)
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5500'],
  credentials: true
}));

// 2. Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 3. Session — MUST come before routes and static
app.use(session({
  secret: 'ivtc-secret-key-2025',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,     // set true only when using HTTPS
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 8  // 8 hours
  }
}));

// 4. Static files — frontend folder served AFTER session is ready
app.use(express.static(path.join(__dirname, '..', 'frontend')));

/* ============================================================
   JSON FILE HELPERS
============================================================ */
function readJSON(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    console.error('❌ Error reading file:', filePath, e.message);
    return [];
  }
}

function writeJSON(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('❌ Error writing file:', filePath, e.message);
    return false;
  }
}

/* ============================================================
   ADMIN CREDENTIALS
============================================================ */
const ADMIN = {
  username: 'Itjareng',
  password: 'itjareng70',
  role: 'admin',
  fullName: 'IVTC Administrator'
};

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
   ROUTE: GET /api/session
   Called by auth.js on every page load
============================================================ */
app.get('/api/session', (req, res) => {
  if (!req.session || !req.session.user) {
    return res.json({ loggedIn: false });
  }
  return res.json({ loggedIn: true, user: req.session.user });
});

/* ============================================================
   ROUTE: GET /api/data
   Serves itjareng.json (programs, gallery, etc.)
============================================================ */
app.get('/api/data', (req, res) => {
  const data = readJSON(ITJARENG_FILE);
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

    const users = readJSON(USERS_FILE);

    if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
      return res.json({ success: false, message: 'That username is already taken.' });
    }

    if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
      return res.json({ success: false, message: 'An account with that email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = {
      id: 'USR-' + Date.now(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      gender,
      username: username.trim().toLowerCase(),
      password: hashedPassword,
      registeredAt: new Date().toISOString(),
      role: 'visitor'
    };

    users.push(newUser);
    const saved = writeJSON(USERS_FILE, users);

    if (!saved) {
      return res.json({ success: false, message: 'Server error: could not save user.' });
    }

    const visitors = readJSON(VISITORS_FILE);
    visitors.push({
      userId: newUser.id,
      username: newUser.username,
      fullName: newUser.firstName + ' ' + newUser.lastName,
      email: newUser.email,
      phone: newUser.phone,
      gender: newUser.gender,
      registeredAt: newUser.registeredAt,
      loginAt: null,
      logoutAt: null,
      status: 'registered'
    });
    writeJSON(VISITORS_FILE, visitors);

    console.log(`✅ New user registered: ${newUser.username} (${newUser.email})`);
    return res.json({ success: true, message: 'Account created successfully!' });

  } catch (err) {
    console.error('Register error:', err);
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
        role: 'admin',
        username: ADMIN.username,
        fullName: ADMIN.fullName,
        loginAt: new Date().toISOString()
      };

      console.log(`🔐 Admin logged in: ${new Date().toLocaleString()}`);
      return res.json({ success: true, role: 'admin', redirect: 'admin.html' });
    }

    // VISITOR LOGIN
    const users = readJSON(USERS_FILE);
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());

    if (!user) {
      return res.json({ success: false, message: 'No account found with that username.' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.json({ success: false, message: 'Incorrect password. Please try again.' });
    }

    const loginTime = new Date().toISOString();
    const visitors = readJSON(VISITORS_FILE);
    const vRec = [...visitors].reverse().find(v => v.userId === user.id);

    if (vRec) {
      vRec.loginAt  = loginTime;
      vRec.logoutAt = null;
      vRec.status   = 'online';
    } else {
      visitors.push({
        userId: user.id,
        username: user.username,
        fullName: user.firstName + ' ' + user.lastName,
        email: user.email,
        phone: user.phone,
        gender: user.gender,
        registeredAt: user.registeredAt,
        loginAt: loginTime,
        logoutAt: null,
        status: 'online'
      });
    }
    writeJSON(VISITORS_FILE, visitors);

    req.session.user = {
      role: 'visitor',
      userId: user.id,
      username: user.username,
      fullName: user.firstName + ' ' + user.lastName,
      loginAt: loginTime
    };

    console.log(`👤 Visitor logged in: ${user.username} at ${loginTime}`);
    return res.json({ success: true, role: 'visitor', redirect: 'index.html' });

  } catch (err) {
    console.error('Login error:', err);
    return res.json({ success: false, message: 'Server error during login.' });
  }
});

/* ============================================================
   ROUTE: POST /api/logout
============================================================ */
app.post('/api/logout', (req, res) => {
  if (!req.session || !req.session.user) {
    return res.json({ success: true, message: 'Already logged out.' });
  }

  const user = req.session.user;

  if (user.role === 'visitor' && user.userId) {
    try {
      const logoutTime = new Date().toISOString();
      const visitors = readJSON(VISITORS_FILE);
      const vRec = [...visitors].reverse().find(v => v.userId === user.userId);
      if (vRec) {
        vRec.logoutAt = logoutTime;
        vRec.status   = 'offline';
        writeJSON(VISITORS_FILE, visitors);
      }
      console.log(`👤 Visitor logged out: ${user.username} at ${logoutTime}`);
    } catch (e) {}
  }

  if (user.role === 'admin') {
    console.log(`🔐 Admin logged out at ${new Date().toLocaleString()}`);
  }

  req.session.destroy();
  return res.json({ success: true, message: 'Logged out successfully.' });
});

/* ============================================================
   ROUTE: POST /api/application
============================================================ */
app.post('/api/application', requireLogin, (req, res) => {
  try {
    const data = req.body;

    if (!data.first_name || !data.last_name || !data.preferred_program) {
      return res.json({ success: false, message: 'Required application fields are missing.' });
    }

    data.applicationId       = 'IVTC-' + Date.now().toString(36).toUpperCase();
    data.timestamp           = new Date().toISOString();
    data.submittedByUserId   = req.session.user.userId   || null;
    data.submittedByUsername = req.session.user.username || null;

    const apps  = readJSON(APPS_FILE);
    apps.push(data);
    const saved = writeJSON(APPS_FILE, apps);

    if (!saved) {
      return res.json({ success: false, message: 'Could not save application. Please try again.' });
    }

    console.log(`📋 New application: ${data.applicationId} by ${data.first_name} ${data.last_name}`);
    return res.json({ success: true, applicationId: data.applicationId });

  } catch (err) {
    console.error('Application error:', err);
    return res.json({ success: false, message: 'Server error saving application.' });
  }
});

/* ============================================================
   ADMIN ROUTES
============================================================ */

app.get('/api/admin/visitors', requireAdmin, (req, res) => {
  res.json({ success: true, data: readJSON(VISITORS_FILE) });
});

app.get('/api/admin/users', requireAdmin, (req, res) => {
  const users = readJSON(USERS_FILE).map(u => {
    const { password, ...safe } = u;
    return safe;
  });
  res.json({ success: true, data: users });
});

app.get('/api/admin/applications', requireAdmin, (req, res) => {
  res.json({ success: true, data: readJSON(APPS_FILE) });
});

app.put('/api/admin/applications/:id', requireAdmin, (req, res) => {
  try {
    const appId = req.params.id;
    const apps  = readJSON(APPS_FILE);
    const idx   = apps.findIndex(a => a.applicationId === appId);

    if (idx === -1) {
      return res.json({ success: false, message: 'Application not found.' });
    }

    apps[idx] = {
      ...apps[idx],
      ...req.body,
      applicationId: appId,
      lastEditedAt: new Date().toISOString(),
      lastEditedBy: 'Admin'
    };

    writeJSON(APPS_FILE, apps);
    console.log(`✏️ Application edited: ${appId}`);
    return res.json({ success: true, message: 'Application updated.' });

  } catch (err) {
    console.error('Edit application error:', err);
    return res.json({ success: false, message: 'Server error updating application.' });
  }
});

app.delete('/api/admin/applications/:id', requireAdmin, (req, res) => {
  try {
    const appId    = req.params.id;
    const apps     = readJSON(APPS_FILE);
    const filtered = apps.filter(a => a.applicationId !== appId);

    if (filtered.length === apps.length) {
      return res.json({ success: false, message: 'Application not found.' });
    }

    writeJSON(APPS_FILE, filtered);
    console.log(`🗑️ Application deleted: ${appId}`);
    return res.json({ success: true, message: 'Application deleted.' });

  } catch (err) {
    console.error('Delete application error:', err);
    return res.json({ success: false, message: 'Server error deleting application.' });
  }
});

app.delete('/api/admin/users/:id', requireAdmin, (req, res) => {
  try {
    const userId  = req.params.id;
    const users   = readJSON(USERS_FILE).filter(u => u.id !== userId);
    const visitors = readJSON(VISITORS_FILE).filter(v => v.userId !== userId);
    writeJSON(USERS_FILE, users);
    writeJSON(VISITORS_FILE, visitors);
    console.log(`🗑️ User deleted: ${userId}`);
    return res.json({ success: true, message: 'User deleted.' });
  } catch (err) {
    return res.json({ success: false, message: 'Server error deleting user.' });
  }
});

app.get('/api/admin/stats', requireAdmin, (req, res) => {
  const visitors = readJSON(VISITORS_FILE);
  const users    = readJSON(USERS_FILE);
  const apps     = readJSON(APPS_FILE);
  const online   = visitors.filter(v => v.status === 'online').length;
  res.json({
    success: true,
    stats: {
      totalVisitors:      visitors.length,
      onlineNow:          online,
      totalUsers:         users.length,
      totalApplications:  apps.length
    }
  });
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
  console.log('📁 Data files:');
  console.log('   users.json        →', USERS_FILE);
  console.log('   visitors.json     →', VISITORS_FILE);
  console.log('   applications.json →', APPS_FILE);
  console.log('');
  console.log('🔐 Admin login: username=Itjareng  password=itjareng70');
  console.log('');
});
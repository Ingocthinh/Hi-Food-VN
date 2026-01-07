const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { OAuth2Client } = require('google-auth-library');

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_DIR = path.join(__dirname, '..', 'data');
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

const USERS_FILE = path.join(DATA_DIR, 'users.json');
const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');

const GOOGLE_CLIENT_ID = '682461443893-2gkivmft3c9ft10bh4tmcfriu684rpgc.apps.googleusercontent.com';
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
app.use(bodyParser.json());

// Route specific pages BEFORE static files
app.get('/admin', (req, res) => {
  return res.sendFile(path.join(PUBLIC_DIR, 'admin.html'));
});

app.get('/staff', (req, res) => {
  return res.sendFile(path.join(PUBLIC_DIR, 'staff.html'));
});

app.use(express.static(PUBLIC_DIR));

function readJson(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function ensureFiles() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(USERS_FILE)) writeJson(USERS_FILE, []);
  if (!fs.existsSync(PRODUCTS_FILE)) writeJson(PRODUCTS_FILE, []);
  if (!fs.existsSync(SESSIONS_FILE)) writeJson(SESSIONS_FILE, []);
  if (!fs.existsSync(ORDERS_FILE)) writeJson(ORDERS_FILE, []);
}

ensureFiles();

// Auth helpers
function getSession(req) {
  const token = req.cookies['hi_food_session'];
  if (!token) return null;
  const sessions = readJson(SESSIONS_FILE);
  const session = sessions.find(s => s.token === token);
  return session || null;
}

function requireAuth(req, res, next) {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: 'Bạn chưa đăng nhập' });
  req.userId = session.userId;
  next();
}

function requireAdmin(req, res, next) {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: 'Bạn chưa đăng nhập' });
  const users = readJson(USERS_FILE);
  const user = users.find(u => u.id === session.userId);
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Bạn không có quyền truy cập' });
  }
  req.userId = session.userId;
  next();
}

function requireStaff(req, res, next) {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: 'Bạn chưa đăng nhập' });
  const users = readJson(USERS_FILE);
  const user = users.find(u => u.id === session.userId);
  if (!user || (user.role !== 'admin' && user.role !== 'staff')) {
    return res.status(403).json({ error: 'Bạn không có quyền truy cập' });
  }
  req.userId = session.userId;
  next();
}

// Auth APIs
app.post('/api/register', (req, res) => {
  const { name, email, phone, password } = req.body || {};
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Thiếu thông tin' });
  }
  const users = readJson(USERS_FILE);
  if (users.find(u => u.email === email)) {
    return res.status(409).json({ error: 'Email đã tồn tại' });
  }
  const user = { id: uuidv4(), name, email, phone: phone || '', password };
  users.push(user);
  writeJson(USERS_FILE, users);
  return res.json({ message: 'Đăng ký thành công' });
});

app.post('/api/login', (req, res) => {
  const { email, phone, password } = req.body || {};
  const users = readJson(USERS_FILE);
  let user = null;
  if (email) user = users.find(u => u.email === email && u.password === password);
  if (!user && phone) user = users.find(u => u.phone === phone && u.password === password);
  if (!user) return res.status(401).json({ error: 'Sai email hoặc mật khẩu' });
  const token = uuidv4();
  const sessions = readJson(SESSIONS_FILE);
  sessions.push({ token, userId: user.id, createdAt: Date.now() });
  writeJson(SESSIONS_FILE, sessions);
  res.cookie('hi_food_session', token, { httpOnly: true, sameSite: 'lax' });
  return res.json({ message: 'Đăng nhập thành công', user: { id: user.id, name: user.name, email: user.email } });
});

// Google OAuth (verify ID token via Google tokeninfo)
app.post('/api/login-google', async (req, res) => {
  try {
    const { idToken } = req.body || {};
    if (!idToken) return res.status(400).json({ error: 'Thiếu idToken' });

    // Verify the token using Google's library
    const ticket = await googleClient.verifyIdToken({
        idToken: idToken,
        audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    const email = payload.email;
    const name = payload.name || (email ? email.split('@')[0] : 'Google User');
    if (!email) return res.status(400).json({ error: 'Không lấy được email từ Google' });
    
    const users = readJson(USERS_FILE);
    let user = users.find(u => u.email === email);
    if (!user) {
      user = { id: uuidv4(), name, email, phone: '', password: '' };
      users.push(user); 
      writeJson(USERS_FILE, users);
    }
    
    const token = uuidv4();
    const sessions = readJson(SESSIONS_FILE);
    sessions.push({ token, userId: user.id, createdAt: Date.now() });
    writeJson(SESSIONS_FILE, sessions);
    res.cookie('hi_food_session', token, { httpOnly: true, sameSite: 'lax' });
    return res.json({ user: { id: user.id, name: user.name, email: user.email } });
  } catch (e) {
    console.error('Google OAuth error:', e);
    return res.status(500).json({ error: 'Lỗi Google OAuth' });
  }
});

// Facebook OAuth (verify via Graph API)
app.post('/api/login-facebook', async (req, res) => {
  try {
    const { accessToken } = req.body || {};
    if (!accessToken) return res.status(400).json({ error: 'Thiếu accessToken' });
    const fetch = (await import('node-fetch')).default;
    const r = await fetch(`https://graph.facebook.com/me?fields=id,name,email&access_token=${encodeURIComponent(accessToken)}`);
    if (!r.ok) return res.status(401).json({ error: 'Token không hợp lệ' });
    const info = await r.json();
    const email = info.email || `${info.id}@facebook.local`;
    const name = info.name || 'Facebook User';
    const users = readJson(USERS_FILE);
    let user = users.find(u => u.email === email);
    if (!user) { user = { id: uuidv4(), name, email, phone: '', password: '' }; users.push(user); writeJson(USERS_FILE, users); }
    const token = uuidv4();
    const sessions = readJson(SESSIONS_FILE);
    sessions.push({ token, userId: user.id, createdAt: Date.now() });
    writeJson(SESSIONS_FILE, sessions);
    res.cookie('hi_food_session', token, { httpOnly: true, sameSite: 'lax' });
    return res.json({ user: { id: user.id, name: user.name, email: user.email } });
  } catch (e) {
    return res.status(500).json({ error: 'Lỗi Facebook OAuth' });
  }
});

app.post('/api/logout', (req, res) => {
  const token = req.cookies['hi_food_session'];
  let sessions = readJson(SESSIONS_FILE);
  sessions = sessions.filter(s => s.token !== token);
  writeJson(SESSIONS_FILE, sessions);
  res.clearCookie('hi_food_session');
  return res.json({ message: 'Đã đăng xuất' });
});

app.get('/api/me', (req, res) => {
  const session = getSession(req);
  if (!session) return res.json({ user: null });
  const users = readJson(USERS_FILE);
  const user = users.find(u => u.id === session.userId);
  return res.json({ 
    user: user ? { 
      id: user.id, 
      name: user.name, 
      email: user.email, 
      phone: user.phone,
      role: user.role || 'user',
      createdAt: user.createdAt
    } : null 
  });
});

// Products APIs
app.get('/api/products', (req, res) => {
  const products = readJson(PRODUCTS_FILE);
  return res.json({ products });
});

// Admin Products APIs
app.post('/api/products', requireAdmin, (req, res) => {
  const { name, category, price, status, description } = req.body;
  if (!name || !category || !price) {
    return res.status(400).json({ error: 'Thiếu thông tin sản phẩm' });
  }
  const products = readJson(PRODUCTS_FILE);
  const product = {
    id: uuidv4(),
    name,
    category,
    price: parseInt(price),
    status: status || 'active',
    description: description || '',
    image: '/products/placeholder.svg',
    createdAt: Date.now()
  };
  products.push(product);
  writeJson(PRODUCTS_FILE, products);
  return res.json({ product });
});

app.put('/api/products/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const { name, category, price, status, description } = req.body;
  const products = readJson(PRODUCTS_FILE);
  const productIndex = products.findIndex(p => p.id === id);
  if (productIndex === -1) {
    return res.status(404).json({ error: 'Sản phẩm không tồn tại' });
  }
  products[productIndex] = {
    ...products[productIndex],
    name: name || products[productIndex].name,
    category: category || products[productIndex].category,
    price: price ? parseInt(price) : products[productIndex].price,
    status: status || products[productIndex].status,
    description: description !== undefined ? description : products[productIndex].description,
    updatedAt: Date.now()
  };
  writeJson(PRODUCTS_FILE, products);
  return res.json({ product: products[productIndex] });
});

app.delete('/api/products/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const products = readJson(PRODUCTS_FILE);
  const filteredProducts = products.filter(p => p.id !== id);
  if (filteredProducts.length === products.length) {
    return res.status(404).json({ error: 'Sản phẩm không tồn tại' });
  }
  writeJson(PRODUCTS_FILE, filteredProducts);
  return res.json({ message: 'Đã xóa sản phẩm' });
});

// Orders APIs
app.get('/api/orders', requireStaff, (req, res) => {
  const orders = readJson(ORDERS_FILE);
  return res.json({ orders });
});

app.post('/api/orders', requireAuth, (req, res) => {
  const { items, total, customerName, note, address } = req.body;
  if (!items || !total) {
    return res.status(400).json({ error: 'Thiếu thông tin đơn hàng' });
  }
  const orders = readJson(ORDERS_FILE);
  const order = {
    id: uuidv4(),
    items,
    total: parseInt(total),
    customerName: customerName || 'Khách vãng lai',
    note: note || '',
    address: address || '',
    status: 'pending',
    createdAt: Date.now()
  };
  orders.push(order);
  writeJson(ORDERS_FILE, orders);
  return res.json({ order });
});

app.put('/api/orders/:id', requireStaff, (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const orders = readJson(ORDERS_FILE);
  const orderIndex = orders.findIndex(o => o.id === id);
  if (orderIndex === -1) {
    return res.status(404).json({ error: 'Đơn hàng không tồn tại' });
  }
  orders[orderIndex] = {
    ...orders[orderIndex],
    status: status || orders[orderIndex].status,
    updatedAt: Date.now()
  };
  writeJson(ORDERS_FILE, orders);
  return res.json({ order: orders[orderIndex] });
});

// Users APIs (Admin only)
app.get('/api/users', requireAdmin, (req, res) => {
  const users = readJson(USERS_FILE);
  const usersWithoutPassword = users.map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    role: u.role || 'user',
    createdAt: u.createdAt
  }));
  return res.json({ users: usersWithoutPassword });
});

app.delete('/api/users/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const users = readJson(USERS_FILE);
  const filteredUsers = users.filter(u => u.id !== id);
  if (filteredUsers.length === users.length) {
    return res.status(404).json({ error: 'Người dùng không tồn tại' });
  }
  writeJson(USERS_FILE, filteredUsers);
  return res.json({ message: 'Đã xóa người dùng' });
});

// Admin Dashboard APIs
app.get('/api/admin/data', requireAdmin, (req, res) => {
  const users = readJson(USERS_FILE);
  const products = readJson(PRODUCTS_FILE);
  const orders = readJson(ORDERS_FILE);
  
  const totalRevenue = orders
    .filter(o => o.status === 'completed')
    .reduce((sum, o) => sum + (o.total || 0), 0);
  
  return res.json({
    totalRevenue,
    orderCount: orders.length,
    productCount: products.length,
    userCount: users.length
  });
});

app.get('/api/revenue-stats', requireAdmin, (req, res) => {
  const orders = readJson(ORDERS_FILE);
  const completedOrders = orders.filter(o => o.status === 'completed');
  
  // Mock data for charts
  const daily = {};
  const monthly = {};
  const yearly = {};
  
  // Generate some sample data
  for (let i = 0; i < 7; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const key = date.toISOString().split('T')[0];
    daily[key] = Math.floor(Math.random() * 1000000) + 500000;
  }
  
  for (let i = 0; i < 12; i++) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    monthly[key] = Math.floor(Math.random() * 5000000) + 2000000;
  }
  
  for (let i = 0; i < 5; i++) {
    const year = new Date().getFullYear() - i;
    yearly[year] = Math.floor(Math.random() * 50000000) + 20000000;
  }
  
  return res.json({ daily, monthly, yearly });
});

// Simple order calc (no persistence)
app.post('/api/calc-total', (req, res) => {
  const { items } = req.body || {};
  const products = readJson(PRODUCTS_FILE);
  let subtotal = 0;
  for (const item of items || []) {
    const p = products.find(pr => pr.id === item.productId);
    if (p) subtotal += p.price * (item.quantity || 1);
  }
  const shipping = subtotal > 500000 ? 0 : 20000;
  const total = subtotal + shipping;
  return res.json({ subtotal, shipping, total });
});

// QR listing (just list filenames from img_qr folder)
app.get('/api/qr-list', (req, res) => {
  const qrDir = path.join(__dirname, '..', 'img_qr');
  if (!fs.existsSync(qrDir)) return res.json({ qrImages: [] });
  const files = fs.readdirSync(qrDir).filter(f => !f.startsWith('.'));
  res.json({ qrImages: files.map(f => `/qr/${f}`) });
});

// Serve QR images statically
app.use('/qr', express.static(path.join(__dirname, '..', 'img_qr')));
// Serve product images from img_sanpham
app.use('/products', express.static(path.join(__dirname, '..', 'img_sanpham')));

// Fallback to SPA index for non-API/static routes
app.use((req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/qr') || req.path.startsWith('/products')) {
    return next();
  }
  
  // Default to main SPA
  return res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Hi Food server running at http://localhost:${PORT}`);
});

// Utilities
const fmt = n => n.toLocaleString('vi-VN') + ' VND';
const qs = s => document.querySelector(s);
const qsa = s => Array.from(document.querySelectorAll(s));

// Robust image fallback (handles '@' prefixes and jpg/png swaps)
window.handleHiFoodImgError = function handleHiFoodImgError(imgEl, originalUrl) {
  const triedIndex = parseInt(imgEl.getAttribute('data-tried') || '0', 10);
  const fileName = (originalUrl || '').split('/').pop() || '';
  const baseName = fileName.replace(/^@/, '');
  const withoutQuery = (p) => p + '?v=' + Date.now();
  const candidates = [
    `/products/@${baseName}`,
    `/products/${baseName.replace(/\.jpg$/i, '.png')}`,
    `/products/${baseName.replace(/\.png$/i, '.jpg')}`,
    '/products/placeholder.svg'
  ];
  if (triedIndex < candidates.length) {
    imgEl.src = withoutQuery(candidates[triedIndex]);
    imgEl.setAttribute('data-tried', String(triedIndex + 1));
  } else {
    imgEl.onerror = null;
  }
};

// Basic product name translation map (fallbacks to original)
function translateProductName(p) {
  if (state.lang === 'vi') return p.name;
  const dict = {
    'Trà sữa trân châu': 'Bubble milk tea',
    'Cà phê sữa đá': 'Vietnamese iced coffee',
    'Nước cam ép': 'Orange juice',
    'Sinh tố bơ': 'Avocado smoothie',
    'Bánh mì thịt': 'Vietnamese baguette (Banh mi with pork)',
    'Phở bò': 'Beef Pho',
    'Bún chả': 'Grilled pork with vermicelli',
    'Gà rán': 'Fried chicken',
    'Pizza hải sản': 'Seafood pizza',
    'Hamburger bò': 'Beef burger',
    'Khoai tây chiên': 'French fries',
    'Xúc xích nướng': 'Grilled sausage',
    'Cơm gà xối mỡ': 'Crispy chicken rice',
    'Bánh tráng trộn': 'Mixed rice paper salad',
    'Hủ tiếu': 'Hu Tieu noodle soup',
    'Bánh bao': 'Steamed bun (Bao)',
    'Bánh xèo': 'Vietnamese sizzling pancake',
    'Nem nướng': 'Grilled pork skewers',
    'Sushi cá hồi': 'Salmon sushi',
    'Mì Ý sốt bò bằm': 'Spaghetti bolognese',
    'Trà đào cam sả': 'Peach orange lemongrass tea',
    'Trà chanh': 'Lemon tea',
    'Soda bạc hà': 'Mint soda',
    'Matcha latte': 'Matcha latte',
    'Bánh ngọt chocolate': 'Chocolate cake',
    'Panna cotta': 'Panna cotta',
    'Tiramisu': 'Tiramisu',
    'Kem dừa': 'Coconut ice cream',
    'Sữa chua trái cây': 'Fruit yogurt',
    'Bánh flan': 'Crème caramel (flan)',
    'Cơm tấm sườn bì chả': 'Broken rice with pork chop, shredded pork & egg meatloaf',
    'Bánh canh cua': 'Crab tapioca noodle soup',
    'Bò lúc lắc': 'Shaking beef',
    'Lẩu thái': 'Thai hotpot',
    'Miến trộn Hàn Quốc': 'Korean mixed glass noodles',
    'Bánh gạo cay': 'Tteokbokki (spicy rice cake)',
    'Gimbap': 'Gimbap',
    'Cơm chiên dương châu': 'Yangzhou fried rice',
    'Bún bò Huế': 'Hue beef noodle soup',
    'Bánh cuốn': 'Steamed rice rolls',
    'Nước dừa tươi': 'Fresh coconut',
    'Sữa tươi trân châu đường đen': 'Fresh milk with brown sugar boba',
    'Cacao nóng': 'Hot cocoa',
    'Trà ô long vải': 'Oolong tea with lychee',
    'Bánh su kem': 'Cream puff',
    'Chè khúc bạch': 'Almond panna cotta dessert (Che khuc bach)',
    'Bánh plan dừa': 'Coconut flan',
    'Há cảo': 'Har gow (shrimp dumpling)',
    'Bánh pía sầu riêng': 'Durian pia cake',
    'Bánh mì bò nướng': 'Grilled beef banh mi',
    'Bánh mì gà nướng': 'Grilled chicken banh mi',
    'Cơm sườn nướng': 'Grilled pork chop rice',
    'Mì ramen': 'Ramen',
    'Bánh waffle dâu': 'Strawberry waffle',
    'Kem vani': 'Vanilla ice cream',
    'Bánh donut': 'Donut',
    'Trà sữa matcha': 'Matcha milk tea',
    'Soda chanh dây': 'Passion fruit soda',
    'Nước ép dưa hấu': 'Watermelon juice',
    'Trà gừng mật ong': 'Ginger tea with honey'
  };
  return dict[p.name] || p.name;
}

// State
let state = {
  products: [],
  cart: JSON.parse(localStorage.getItem('hi_food_cart') || '[]'),
  user: null,
  lang: localStorage.getItem('hi_food_lang') || 'vi',
  delivery: { lat: null, lng: null, distanceKm: 0 }
};

function saveCart() {
  localStorage.setItem('hi_food_cart', JSON.stringify(state.cart));
  updateCartBadge();
}

function updateCartBadge() {
  const count = state.cart.reduce((s, it) => s + it.quantity, 0);
  qs('#cartCount').textContent = count;
}

async function fetchMe() {
  const res = await fetch('/api/me', { credentials: 'include' });
  const data = await res.json();
  state.user = data.user;
  renderUserBox();
}

function renderUserBox() {
  const userBox = qs('#userBox');
  const btnLogin = qs('#btnLogin');
  const btnRegister = qs('#btnRegister');
  if (state.user) {
    userBox.classList.remove('hidden');
    qs('#userName').textContent = state.user.name;
    btnLogin.classList.add('hidden');
    btnRegister.classList.add('hidden');
  } else {
    userBox.classList.add('hidden');
    btnLogin.classList.remove('hidden');
    btnRegister.classList.remove('hidden');
  }
}

async function loadProducts() {
  const res = await fetch('/api/products');
  const data = await res.json();
  state.products = data.products || [];
  populateCategoryFilter();
  renderProducts();
}

function populateCategoryFilter() {
  const sel = qs('#categoryFilter');
  const cats = Array.from(new Set(state.products.map(p => p.category)));
  sel.innerHTML = '<option value="">Tất cả danh mục</option>' +
    cats.map(c => `<option value="${c}">${c}</option>`).join('');
}

function getFilteredSortedProducts() {
  const text = qs('#searchInput').value.trim().toLowerCase();
  const cat = qs('#categoryFilter').value;
  const sort = qs('#sortSelect').value;
  let arr = state.products.filter(p =>
    (!cat || p.category === cat) &&
    (p.name.toLowerCase().includes(text))
  );
  if (sort === 'price-asc') arr.sort((a,b)=>a.price-b.price);
  if (sort === 'price-desc') arr.sort((a,b)=>b.price-a.price);
  if (sort === 'name-asc') arr.sort((a,b)=>a.name.localeCompare(b.name,'vi'));
  return arr;
}

function renderProducts() {
  const grid = qs('#productsGrid');
  const items = getFilteredSortedProducts();
  grid.innerHTML = items.map(p => `
    <div class="card">
      <img src="${p.image}?v=${Date.now()}" alt="${p.name}" onerror="handleHiFoodImgError(this, '${p.image}')" />
      <div class="content">
        <div class="name">${translateProductName(p)}</div>
        <div class="price">${fmt(p.price)}</div>
        <button class="btn" data-id="${p.id}">${state.lang==='vi' ? 'Thêm vào giỏ' : 'Add to cart'}</button>
      </div>
    </div>
  `).join('');
  grid.querySelectorAll('button[data-id]').forEach(btn => {
    btn.addEventListener('click', () => addToCart(btn.getAttribute('data-id')));
  });
}

function addToCart(productId) {
  const product = state.products.find(p => p.id === productId);
  if (!product) return;
  const ex = state.cart.find(it => it.productId === productId);
  if (ex) ex.quantity += 1; else state.cart.push({ productId, quantity: 1 });
  saveCart();
  renderCart();
}

function changeQty(productId, delta) {
  const it = state.cart.find(x => x.productId === productId);
  if (!it) return;
  it.quantity += delta;
  if (it.quantity <= 0) state.cart = state.cart.filter(x => x.productId !== productId);
  saveCart();
  renderCart();
}

function renderCart() {
  const wrap = qs('#cartItems');
  const productsMap = new Map(state.products.map(p => [p.id, p]));
  let total = 0;
  wrap.innerHTML = state.cart.map(it => {
    const p = productsMap.get(it.productId);
    if (!p) return '';
    const line = p.price * it.quantity; total += line;
    return `
      <div class="cart-item">
        <img src="${p.image}" alt="${p.name}" />
        <div>
          <div>${translateProductName(p)}</div>
          <div class="price">${fmt(p.price)} × ${it.quantity} = ${fmt(line)}</div>
          <div class="qty">
            <button data-minus="${p.id}">-</button>
            <span>${it.quantity}</span>
            <button data-plus="${p.id}">+</button>
          </div>
        </div>
        <div class="actions">
          <button data-remove="${p.id}" class="btn ghost small">${state.lang==='vi' ? 'Xoá' : 'Remove'}</button>
        </div>
      </div>
    `;
  }).join('');
  qs('#cartTotal').textContent = fmt(total);
  wrap.querySelectorAll('[data-minus]').forEach(b=> b.onclick=()=>changeQty(b.dataset.minus,-1));
  wrap.querySelectorAll('[data-plus]').forEach(b=> b.onclick=()=>changeQty(b.dataset.plus,1));
  wrap.querySelectorAll('[data-remove]').forEach(b=> b.onclick=()=>{ state.cart = state.cart.filter(x=>x.productId!==b.dataset.remove); saveCart(); renderCart(); });
}

async function refreshCheckoutTotals() {
  const res = await fetch('/api/calc-total', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items: state.cart, distanceKm: state.delivery.distanceKm })
  });
  const data = await res.json();
  qs('#subtotal').textContent = fmt(data.subtotal || 0);
  qs('#shipping').textContent = fmt(data.shipping || 0);
  qs('#total').textContent = fmt(data.total || 0);
}

async function loadQrList() {
  const res = await fetch('/api/qr-list');
  const data = await res.json();
  const box = qs('#qrList');
  const files = data.qrImages || [];
  // filter by chosen method keywords if exist
  const active = document.querySelector('#paymentMethods .chip.active')?.dataset.method || '';
  const keywordMap = { momo: 'momo', zalopay: 'zalo', vnpay: 'vnpay', bank: 'bank' };
  const kw = keywordMap[active] || '';
  const shown = kw ? files.filter(f => f.toLowerCase().includes(kw)) : files;
  box.innerHTML = shown.map(f => `<img src="${f}" alt="QR">`).join('');
}

// Auth modal logic
function openAuth(mode='login') {
  qs('#modalAuth').classList.remove('hidden');
  switchTab(mode);
}
function closeAuth() { qs('#modalAuth').classList.add('hidden'); }
function switchTab(mode) {
  const login = mode === 'login';
  qs('#paneLogin').classList.toggle('hidden', !login);
  qs('#paneRegister').classList.toggle('hidden', login);
  qs('#tabLogin').classList.toggle('active', login);
  qs('#tabRegister').classList.toggle('active', !login);
}

function normalizeIdentity(v){
  const value = v.trim();
  const isPhone = /^\+?\d[\d\s-]{6,}$/.test(value);
  if (isPhone) return { phone: value.replace(/\D/g,'') };
  return { email: value };
}
async function doLogin() {
  const identity = qs('#loginIdentity').value;
  const password = qs('#loginPassword').value;
  const payload = { ...normalizeIdentity(identity), password };
  const res = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(payload) });
  const data = await res.json();
  if (data.error) return alert(data.error);
  state.user = data.user; 
  renderUserBox(); 
  closeAuth();
  
  // Redirect theo role
  if (data.user && data.user.role) {
    if (data.user.role === 'admin') {
      window.location.href = '/admin';
    } else if (data.user.role === 'staff') {
      window.location.href = '/staff';
    }
  }
}
async function doRegister() {
  const name = qs('#regName').value.trim();
  const email = qs('#regEmail').value.trim();
  const phone = qs('#regPhone').value.trim();
  const password = qs('#regPassword').value;
  const password2 = qs('#regPassword2').value;
  if (password !== password2) { alert('Mật khẩu xác nhận không khớp'); return; }
  const res = await fetch('/api/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, email, phone, password }) });
  const data = await res.json();
  if (data.error) return alert(data.error);
  alert('Đăng ký thành công! Vui lòng đăng nhập.');
  switchTab('login');
}
async function doLogout() {
  await fetch('/api/logout', { method: 'POST', credentials: 'include' });
  state.user = null; renderUserBox();
}

// Events
window.addEventListener('DOMContentLoaded', async () => {
  await Promise.all([fetchMe(), loadProducts(), loadQrList()]);
  updateCartBadge();
  renderCart();
  await refreshCheckoutTotals();

  // Filters
  ['#searchInput','#categoryFilter','#sortSelect'].forEach(sel => {
    qs(sel).addEventListener('input', ()=>{ renderProducts(); });
    qs(sel).addEventListener('change', ()=>{ renderProducts(); });
  });

  // Auth buttons
  qs('#btnLogin').onclick = () => openAuth('login');
  qs('#btnRegister').onclick = () => openAuth('register');
  qs('#closeAuth').onclick = closeAuth;
  qs('#tabLogin').onclick = () => switchTab('login');
  qs('#tabRegister').onclick = () => switchTab('register');
  qs('#doLogin').onclick = doLogin;
  qs('#doRegister').onclick = doRegister;
  qs('#btnLogout').onclick = doLogout;
  // Social login handlers (frontend only; expects tokens from provider SDKs)
  const googleClientId = window.HI_FOOD_CONFIG?.GOOGLE_CLIENT_ID || '';
  const fbAppId = window.HI_FOOD_CONFIG?.FACEBOOK_APP_ID || '';
  // Google: use GSI one-tap button flow (popup)
  async function startGoogle() {
    if (!googleClientId || !window.google || !google.accounts || !google.accounts.id) {
      alert('Thiếu Google Client ID hoặc Google SDK chưa load'); return;
    }
    return new Promise((resolve) => {
      google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async (resp) => {
          try {
            const idToken = resp.credential;
            const res = await fetch('/api/login-google', { 
              method:'POST', 
              headers:{'Content-Type':'application/json'}, 
              credentials:'include', 
              body: JSON.stringify({ idToken }) 
            });
            const data = await res.json();
            if (data.error) {
              alert('Lỗi đăng nhập: ' + data.error);
              return;
            }
            state.user = data.user; 
            renderUserBox(); 
            closeAuth(); 
            resolve();
          } catch (error) {
            alert('Lỗi kết nối: ' + error.message);
          }
        },
        error_callback: (error) => {
          console.error('Google OAuth error:', error);
          alert('Lỗi Google OAuth: ' + (error.type || 'Unknown error'));
        }
      });
      // Render a hidden button and click
      const div = document.createElement('div');
      google.accounts.id.renderButton(div, { theme: 'outline', size: 'large' });
      google.accounts.id.prompt();
    });
  }
  qs('#loginGoogle')?.addEventListener('click', startGoogle);
  qs('#registerGoogle')?.addEventListener('click', startGoogle);
  // Facebook SDK
  function ensureFbInit(cb){
    if (!fbAppId || !window.FB) { alert('Thiếu Facebook App ID'); return; }
    if (window.FB && window.FB.getAuthResponse) return cb();
    window.fbAsyncInit = function() {
      FB.init({ appId: fbAppId, cookie: true, xfbml: false, version: 'v18.0' });
      cb();
    };
  }
  function startFacebook(){
    ensureFbInit(()=>{
      FB.login(async (response)=>{
        if (response.status === 'connected') {
          const accessToken = response.authResponse.accessToken;
          const res = await fetch('/api/login-facebook', { method:'POST', headers:{'Content-Type':'application/json'}, credentials:'include', body: JSON.stringify({ accessToken }) });
          const data = await res.json();
          if (data.error) return alert(data.error);
          state.user = data.user; renderUserBox(); closeAuth();
        }
      }, { scope: 'public_profile,email' });
    });
  }
  qs('#loginFacebook')?.addEventListener('click', startFacebook);
  qs('#registerFacebook')?.addEventListener('click', startFacebook);
  // Eye toggles
  const bindEye = (inputSel, btnSel) => {
    const input = qs(inputSel); const btn = qs(btnSel);
    if (!input || !btn) return;
    btn.onclick = (e)=>{ e.preventDefault(); input.type = input.type === 'password' ? 'text' : 'password'; };
  };
  bindEye('#loginPassword', '#toggleLoginPassword');
  bindEye('#regPassword', '#toggleRegPassword');
  bindEye('#regPassword2', '#toggleRegPassword2');

  // Cart drawer
  const drawer = qs('#cartDrawer');
  qs('#btnCart').onclick = () => { drawer.classList.add('open'); drawer.classList.remove('hidden'); };
  qs('#closeCart').onclick = () => { drawer.classList.remove('open'); setTimeout(()=>drawer.classList.add('hidden'), 250); };
  qs('#goCheckout').onclick = () => { drawer.classList.remove('open'); };

  // Totals
  qs('#btnRefreshTotal').onclick = refreshCheckoutTotals;

  // Payment method chips (scoped to payment section only)
  qsa('#paymentMethods .chip').forEach(chip => {
    chip.onclick = () => {
      qsa('#paymentMethods .chip').forEach(c=>c.classList.remove('active'));
      chip.classList.add('active');
      loadQrList();
    };
  });
  const copyBtn = qs('#btnCopyTotal');
  if (copyBtn) copyBtn.onclick = async () => {
    const txt = qs('#total').textContent.replace(/[^0-9]/g,'').trim();
    try { await navigator.clipboard.writeText(txt); alert('Đã sao chép tổng tiền'); } catch {}
  };

  // Language switch
  const applyLang = () => {
    const vi = state.lang === 'vi';
    // html lang attribute
    document.documentElement.setAttribute('lang', vi ? 'vi' : 'en');
    qs('#checkoutTitle').textContent = vi ? 'Thanh toán QR' : 'QR Checkout';
    qs('#navHome').textContent = vi ? 'Trang chủ' : 'Home';
    qs('#navMenu').textContent = vi ? 'Thực đơn' : 'Menu';
    qs('#navDelivery').textContent = vi ? 'Giao hàng' : 'Delivery';
    qs('#navCheckout').textContent = vi ? 'Thanh toán' : 'Checkout';
    qs('#lblSubtotal').textContent = vi ? 'Tạm tính' : 'Subtotal';
    qs('#lblShipping').textContent = vi ? 'Vận chuyển' : 'Shipping';
    qs('#lblTotal').textContent = vi ? 'Tổng cộng' : 'Total';
    qs('#chipMomo').textContent = 'Momo';
    qs('#chipZalo').textContent = 'ZaloPay';
    qs('#chipVnpay').textContent = 'VNPAY';
    qs('#chipBank').textContent = vi ? 'Ngân hàng' : 'Bank';
    qs('#orderNote').placeholder = vi ? 'Ghi chú cho đơn hàng (tuỳ chọn)' : 'Order note (optional)';
    qs('#deliveryTitle').textContent = vi ? 'Giao hàng' : 'Delivery';
    qs('#addressInput').placeholder = vi ? 'Nhập địa chỉ giao hàng' : 'Enter delivery address';
    qs('#btnLocate').textContent = vi ? 'Lấy vị trí của tôi' : 'Use my location';
    qs('#distanceLabel').childNodes[0].textContent = vi ? 'Khoảng cách: ' : 'Distance: ';
    qs('#qrTitle').textContent = vi ? 'Mã QR Thanh Toán' : 'QR codes by method';
    qs('#qrHint').textContent = vi ? 'QR Thanh toán' : 'Payment QR';
    qs('#btnRefreshTotal').textContent = vi ? 'Cập nhật tổng' : 'Refresh total';
    qs('#btnCopyTotal').textContent = vi ? 'Sao chép tổng' : 'Copy total';
    // Hero/banner texts
    const heroTitle = document.querySelector('.hero-content h1');
    if (heroTitle) heroTitle.textContent = vi ? 'Ăn ngon - Uống đã - Giao nhanh' : 'Eat well - Drink up - Fast delivery';
    const heroSub = document.querySelector('.hero-content p');
    if (heroSub) heroSub.textContent = vi ? 'Hơn 60 món ăn & thức uống được chọn lọc, phục vụ mọi lúc.' : 'Over 60 curated dishes and drinks, served anytime.';
    const heroCta = document.querySelector('.hero-content .btn.cta');
    if (heroCta) heroCta.textContent = vi ? 'Khám phá thực đơn' : 'Explore menu';
    // Header auth/cart
    const btnLogin = qs('#btnLogin');
    const btnRegister = qs('#btnRegister');
    const btnLogout = qs('#btnLogout');
    const btnCart = qs('#btnCart');
    if (btnLogin) btnLogin.textContent = vi ? 'Đăng nhập' : 'Login';
    if (btnRegister) btnRegister.textContent = vi ? 'Đăng ký' : 'Register';
    if (btnLogout) btnLogout.textContent = vi ? 'Đăng xuất' : 'Logout';
    // Menu toolbar
    const searchInput = qs('#searchInput');
    if (searchInput) searchInput.placeholder = vi ? 'Tìm món...' : 'Search dishes...';
    const categoryFilter = qs('#categoryFilter');
    if (categoryFilter && categoryFilter.options.length) {
      categoryFilter.options[0].textContent = vi ? 'Tất cả danh mục' : 'All categories';
    }
    const sortSelect = qs('#sortSelect');
    if (sortSelect && sortSelect.options.length >= 4) {
      sortSelect.options[0].textContent = vi ? 'Sắp xếp' : 'Sort';
      sortSelect.options[1].textContent = vi ? 'Giá tăng dần' : 'Price: Low to High';
      sortSelect.options[2].textContent = vi ? 'Giá giảm dần' : 'Price: High to Low';
      sortSelect.options[3].textContent = vi ? 'Tên A-Z' : 'Name A-Z';
    }
    // Cart drawer
    const cartHeader = document.querySelector('#cartDrawer .cart-header h3');
    if (cartHeader) cartHeader.textContent = vi ? 'Giỏ hàng' : 'Cart';
    const goCheckout = qs('#goCheckout');
    if (goCheckout) goCheckout.textContent = vi ? 'Thanh toán' : 'Checkout';
    // Chatbox
    const chatTitle = document.querySelector('.chat-header .title');
    if (chatTitle) chatTitle.textContent = vi ? 'Hi Food Assistant' : 'Hi Food Assistant';
    const chatInput = qs('#chatText');
    if (chatInput) chatInput.placeholder = vi ? 'Nhập câu hỏi của bạn...' : 'Type your question...';
    const chatSend = qs('#chatSend');
    if (chatSend) chatSend.textContent = vi ? 'Gửi' : 'Send';
    // Auth placeholders
    const loginIdentity = qs('#loginIdentity'); if (loginIdentity) loginIdentity.placeholder = vi ? 'Email hoặc SĐT' : 'Email or phone';
    const regPhone = qs('#regPhone'); if (regPhone) regPhone.placeholder = vi ? 'Số điện thoại' : 'Phone number';
    const regPw = qs('#regPassword'); if (regPw) regPw.placeholder = vi ? 'Mật khẩu' : 'Password';
    const regPw2 = qs('#regPassword2'); if (regPw2) regPw2.placeholder = vi ? 'Xác nhận mật khẩu' : 'Confirm password';
    // Language chips with icons and aria-pressed
    const langViBtn = qs('#langVi');
    const langEnBtn = qs('#langEn');
    if (langViBtn) {
      langViBtn.innerHTML = '🇻🇳 <span>VI</span>';
      langViBtn.setAttribute('aria-pressed', String(vi));
      langViBtn.classList.toggle('active', vi);
    }
    if (langEnBtn) {
      langEnBtn.innerHTML = '🇺🇸 <span>EN</span>';
      langEnBtn.setAttribute('aria-pressed', String(!vi));
      langEnBtn.classList.toggle('active', !vi);
    }
    // Footer
    const footer = document.querySelector('.footer');
    if (footer) footer.textContent = vi ? '© 2025 Hi Food • Ngon - Nhanh - Nhiều Ưu Đãi' : '© 2025 Hi Food • Tasty - Fast - Great Deals';
    qs('#langVi').classList.toggle('active', vi); qs('#langEn').classList.toggle('active', !vi);
    renderProducts(); // re-render names
    // Re-render cart with translated item names and buttons
    renderCart();
  };
  const pressFx = (el)=>{ el.classList.add('press'); setTimeout(()=>el.classList.remove('press'),150); };
  qs('#langVi').onclick = (e) => { pressFx(e.currentTarget); state.lang = 'vi'; localStorage.setItem('hi_food_lang','vi'); applyLang(); };
  qs('#langEn').onclick = (e) => { pressFx(e.currentTarget); state.lang = 'en'; localStorage.setItem('hi_food_lang','en'); applyLang(); };
  applyLang();

  // Map/Delivery: Prefer Google Maps; fallback to Leaflet if not loaded
  const clearMapContainer = () => { const el = document.getElementById('map'); if (el) el.innerHTML = ''; };
  let isMapLocked = true; // lock interactions by default
  const mapLockBtn = document.getElementById('toggleMapLock');
  const setLockBtnUI = () => {
    if (!mapLockBtn) return;
    if (isMapLocked) { mapLockBtn.textContent = '🔒 Khóa bản đồ'; mapLockBtn.setAttribute('aria-pressed','true'); }
    else { mapLockBtn.textContent = '🔓 Mở khóa bản đồ'; mapLockBtn.setAttribute('aria-pressed','false'); }
  };
  setLockBtnUI();
  const initWithGoogle = () => {
    const defaultLatLng = { lat: 10.776, lng: 106.700 };
    const map = new google.maps.Map(document.getElementById('map'), {
      center: defaultLatLng,
      zoom: 13,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      scrollwheel: false,
      gestureHandling: 'none' // start locked
    });
    const marker = new google.maps.Marker({ position: defaultLatLng, map, draggable: true });
    const setGoogleLock = (locked) => {
      map.setOptions({
        draggable: !locked,
        scrollwheel: !locked,
        gestureHandling: locked ? 'none' : 'greedy'
      });
      marker.setDraggable(!locked);
      isMapLocked = locked; setLockBtnUI();
    };
    setGoogleLock(true);
    if (mapLockBtn) mapLockBtn.onclick = () => setGoogleLock(!isMapLocked);
    const updateDistance = () => {
      const pos = marker.getPosition();
      const lat = pos.lat(); const lng = pos.lng();
      state.delivery.lat = lat; state.delivery.lng = lng;
      const R = 6371;
      const dLat = (lat - defaultLatLng.lat) * Math.PI/180; const dLng = (lng - defaultLatLng.lng) * Math.PI/180;
      const a = Math.sin(dLat/2)**2 + Math.cos(defaultLatLng.lat*Math.PI/180) * Math.cos(lat*Math.PI/180) * Math.sin(dLng/2)**2;
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const dist = +(R*c).toFixed(2);
      state.delivery.distanceKm = dist;
      qs('#distanceKm').textContent = dist + ' km';
    };
    marker.addListener('dragend', async () => { updateDistance(); await refreshCheckoutTotals(); });
    updateDistance();
    qs('#btnLocate').onclick = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(pos => {
          const { latitude, longitude } = pos.coords;
          const ll = { lat: latitude, lng: longitude };
          map.setCenter(ll); map.setZoom(15);
          marker.setPosition(ll);
          updateDistance();
          refreshCheckoutTotals();
        });
      }
    };
    // Places Autocomplete
    const input = document.getElementById('addressInput');
    const suggest = document.getElementById('addressSuggest');
    if (suggest) suggest.classList.add('hidden');
    const autocomplete = new google.maps.places.Autocomplete(input, { fields: ['geometry','formatted_address'] });
    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (!place.geometry) return;
      const ll = place.geometry.location;
      map.setCenter(ll); map.setZoom(15);
      marker.setPosition(ll);
      input.value = place.formatted_address || input.value;
      updateDistance();
      refreshCheckoutTotals();
    });
  };
  const initWithLeaflet = () => {
    clearMapContainer();
    try {
      const map = L.map('map', { scrollWheelZoom: false, zoomControl: true });
      const defaultLatLng = [10.776, 106.700];
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
      // Start fully locked
      const setLeafletLock = (locked) => {
        if (locked) {
          map.dragging.disable();
          map.scrollWheelZoom.disable();
          map.touchZoom.disable();
          map.doubleClickZoom.disable();
          map.boxZoom.disable();
          map.keyboard.disable();
        } else {
          map.dragging.enable();
          map.scrollWheelZoom.enable();
          map.touchZoom.enable();
          map.doubleClickZoom.enable();
          map.boxZoom.enable();
          map.keyboard.enable();
        }
        isMapLocked = locked; setLockBtnUI();
      };
      setLeafletLock(true);
      if (mapLockBtn) mapLockBtn.onclick = () => setLeafletLock(!isMapLocked);
      map.setView(defaultLatLng, 13);
      let marker = L.marker(defaultLatLng, { draggable: true }).addTo(map);
      marker.dragging[ isMapLocked ? 'disable' : 'enable' ]();
      const updateDistance = () => {
        const latlng = marker.getLatLng();
        state.delivery.lat = latlng.lat; state.delivery.lng = latlng.lng;
        const R = 6371; const dLat = (latlng.lat - defaultLatLng[0]) * Math.PI/180; const dLng = (latlng.lng - defaultLatLng[1]) * Math.PI/180;
        const a = Math.sin(dLat/2)**2 + Math.cos(defaultLatLng[0]*Math.PI/180) * Math.cos(latlng.lat*Math.PI/180) * Math.sin(dLng/2)**2;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const dist = +(R*c).toFixed(2);
        state.delivery.distanceKm = dist;
        qs('#distanceKm').textContent = dist + ' km';
      };
      marker.on('dragend', async () => { updateDistance(); await refreshCheckoutTotals(); });
      updateDistance();
      qs('#btnLocate').onclick = () => {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(pos => {
            const { latitude, longitude } = pos.coords;
            map.setView([latitude, longitude], 15);
            marker.setLatLng([latitude, longitude]);
            updateDistance();
            refreshCheckoutTotals();
          });
        }
      };
    } catch {}
  };
  // Handle Google auth failure -> fallback
  window.gm_authFailure = function() { initWithLeaflet(); };
  const key = (window.HI_FOOD_CONFIG && window.HI_FOOD_CONFIG.GMAPS_KEY) || '';
  const hasKey = typeof key === 'string' && key.trim().length > 0;
  if (hasKey && window.google && google.maps) {
    try { initWithGoogle(); } catch { initWithLeaflet(); }
  } else {
    if (hasKey) {
      const s = document.createElement('script');
      s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places`;
      s.async = true; s.defer = true; s.onload = () => { if (window.google && google.maps) initWithGoogle(); else initWithLeaflet(); };
      s.onerror = () => initWithLeaflet();
      document.head.appendChild(s);
    } else {
      initWithLeaflet();
    }
  }

  // Chatbox UI (frontend-only; backend proxy can be added later)
  const chatToggle = qs('#chatToggle');
  const chatBox = qs('#chatBox');
  const chatClose = qs('#chatClose');
  const chatSend = qs('#chatSend');
  const chatText = qs('#chatText');
  const chatMessages = qs('#chatMessages');
  const addMsg = (text, who) => {
    const div = document.createElement('div');
    div.className = 'bubble ' + who;
    div.textContent = text;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  };
  chatToggle.onclick = () => { chatBox.classList.toggle('hidden'); };
  chatClose.onclick = () => { chatBox.classList.add('hidden'); };
  const getBotReply = (q) => {
    const text = q.trim(); if (!text) return '';
    const vi = state.lang === 'vi';
    const lower = text.toLowerCase();
    const say = (viTxt, enTxt) => vi ? viTxt : enTxt;
    // Greetings
    if (/^(hi|hello|chào|xin chào|hey)\b/i.test(lower)) return say('Xin chào! Mình có thể giúp gì cho bạn?','Hi! How can I help you today?');
    // How to order
    if (/(đặt|order).*(món|hàng)|cách đặt|how to order/i.test(lower)) return say('Bạn vào Thực đơn, bấm Thêm vào giỏ, rồi vào Thanh toán QR để thanh toán.','Go to Menu, click Add to cart, then proceed to QR Checkout.');
    // Delivery fee policy
    if (/ship|vận chuyển|delivery fee|phí giao/i.test(lower)) return say('Phí vận chuyển: 20.000 VND. Miễn phí với đơn trên 500.000 VND.','Shipping: 20,000 VND. Free for orders over 500,000 VND.');
    // Payment methods
    if (/thanh toán|payment|pay|qr|momo|zalo|vnpay|bank/i.test(lower)) return say('Hỗ trợ Momo, ZaloPay, VNPAY và chuyển khoản ngân hàng (QR).','We support Momo, ZaloPay, VNPAY and bank transfer via QR.');
    // Show total
    if (/tổng|total|sum/i.test(lower)) return say(`Tổng hiện tại của giỏ: ${qs('#cartTotal').textContent}` , `Current cart total: ${qs('#cartTotal').textContent}`);
    // Search products by name keyword
    const products = state.products || [];
    const matches = products.filter(p => p.name.toLowerCase().includes(lower));
    if (matches.length > 0) {
      const top = matches.slice(0, 5).map(p => `${translateProductName(p)} - ${fmt(p.price)}`).join(vi ? '\n' : '\n');
      return say(`Mình tìm thấy:\n${top}`, `I found:\n${top}`);
    }
    // Add to cart intent: "thêm ..." or "add ..."
    const addMatch = lower.match(/^(thêm|add)\s+(.+)/);
    if (addMatch) {
      const kw = addMatch[2].trim();
      const found = products.find(p => p.name.toLowerCase().includes(kw));
      if (found) { addToCart(found.id); return say(`Đã thêm ${translateProductName(found)} vào giỏ!`,`Added ${translateProductName(found)} to cart!`); }
    }
    // Fallback
    return say('Mình có thể giúp tìm món, thêm vào giỏ, xem phí ship, thanh toán và tổng tiền. Bạn mô tả cụ thể hơn nhé.','I can help find items, add to cart, show shipping/payment info and totals. Tell me more.');
  };
  const sendChat = async () => {
    const text = chatText.value.trim(); if (!text) return;
    addMsg(text, 'user'); chatText.value='';
    setTimeout(()=> addMsg(getBotReply(text), 'bot'), 350);
  };
  chatSend.onclick = sendChat;
  chatText.addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ e.preventDefault(); sendChat(); }});
});





/* FILE: main.js */
let currentPage = 'home';
let currentPanelUser = null;
let audioPlayer = null;
let currentSongIndex = 0;
let songs = [];
let statusInterval = null;

async function init() {
    await db.init();
    setupEventListeners();
    await loadPage('home');
    await initMusicPlayer();
    applyTheme(localStorage.getItem('theme') || 'dark');
    startStatusMonitor();
    
    const websiteName = await db.getConfig('website_name');
    document.getElementById('websiteName').textContent = websiteName || 'NexusPanel';
}

function setupEventListeners() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const page = btn.dataset.page;
            await loadPage(page);
        });
    });
    
    document.querySelectorAll('.theme-option').forEach(btn => {
        btn.addEventListener('click', () => {
            const theme = btn.dataset.theme;
            applyTheme(theme);
            localStorage.setItem('theme', theme);
        });
    });
}

function applyTheme(theme) {
    document.body.className = theme;
}

function showLoading(duration, message = "Loading...") {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        overlay.innerHTML = `
            <div class="loading-spinner"></div>
            <p>${message}</p>
            <p class="loading-timer">${duration} detik</p>
        `;
        document.body.appendChild(overlay);
        
        let timeLeft = duration;
        const timer = setInterval(() => {
            timeLeft--;
            const timerElement = overlay.querySelector('.loading-timer');
            if (timerElement) {
                timerElement.textContent = `${timeLeft} detik`;
            }
            if (timeLeft <= 0) {
                clearInterval(timer);
                overlay.remove();
                resolve();
            }
        }, 1000);
    });
}

async function loadPage(page) {
    currentPage = page;
    
    document.querySelectorAll('.nav-btn').forEach(btn => {
        if (btn.dataset.page === page) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    const mainContent = document.getElementById('main-content');
    
    switch(page) {
        case 'home':
            mainContent.innerHTML = await renderHome();
            break;
        case 'panel':
            mainContent.innerHTML = await renderPanelMode();
            break;
        case 'shop':
            mainContent.innerHTML = await renderShop();
            break;
        case 'status':
            mainContent.innerHTML = await renderStatusPanel();
            break;
        case 'dev':
            mainContent.innerHTML = await renderDevStatus();
            break;
    }
    
    attachPageEvents();
}

async function renderHome() {
    const config = await db.getAllConfig();
    const now = new Date();
    const signal = Math.floor(Math.random() * 30 + 70);
    
    return `
        <div class="card">
            <h2><i class="fas fa-chart-line"></i> Status Real Time</h2>
            <div class="status-grid">
                <div class="stat-card">
                    <i class="fas fa-server"></i>
                    <h3>Status Panel</h3>
                    <p class="status-badge ${config.panel_status === 'online' ? 'status-online' : 'status-offline'}">
                        ${config.panel_status === 'online' ? '🟢 Online' : '🔴 Offline'}
                    </p>
                    <small>Ping: ${config.panel_ping || '0ms'}</small>
                </div>
                <div class="stat-card">
                    <i class="fas fa-signal"></i>
                    <h3>Sinyal</h3>
                    <p>${signal}%</p>
                    <div style="width: 100%; height: 4px; background: var(--border); border-radius: 2px;">
                        <div style="width: ${signal}%; height: 100%; background: var(--accent); border-radius: 2px;"></div>
                    </div>
                </div>
                <div class="stat-card">
                    <i class="fas fa-calendar"></i>
                    <h3>Tanggal & Waktu</h3>
                    <p>${now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    <small>${now.toLocaleTimeString()}</small>
                </div>
            </div>
        </div>
        
        <div class="card">
            <h3><i class="fas fa-info-circle"></i> Info Terbaru</h3>
            <p><strong>Harga Panel Unlimited:</strong> Rp 85.000</p>
            <p><strong>Harga Admin Panel:</strong> Rp 150.000</p>
            <p><strong>Bot Script:</strong> Rp 45.000 - Rp 120.000</p>
            <p><strong>Support:</strong> 24/7 Active</p>
            <hr style="margin: 15px 0; border-color: var(--border);">
            <p><i class="fas fa-check-circle" style="color: var(--success);"></i> Sistem payment QRIS aktif</p>
            <p><i class="fas fa-check-circle" style="color: var(--success);"></i> Auto create panel setelah pembayaran</p>
            <p><i class="fas fa-check-circle" style="color: var(--success);"></i> Real-time server monitoring</p>
        </div>
    `;
}

async function renderPanelMode() {
    if (!currentPanelUser) {
        return `
            <div class="card">
                <h3><i class="fas fa-lock"></i> Login Panel Mode</h3>
                <p style="margin-bottom: 15px;">Masukkan username dan password panel yang sudah dibuat saat pembelian</p>
                <div class="panel-login-form">
                    <input type="text" id="panelUsername" placeholder="Username Panel">
                    <input type="password" id="panelPassword" placeholder="Password Panel">
                    <button class="btn" id="loginPanelBtn"><i class="fas fa-sign-in-alt"></i> Login ke Panel</button>
                    <div id="panelLoginError" style="color: var(--danger); margin-top: 10px;"></div>
                </div>
            </div>
        `;
    }
    
    const config = await db.getAllConfig();
    const now = new Date();
    const signal = Math.floor(Math.random() * 30 + 70);
    
    return `
        <div class="panel-mode-container">
            <h2><i class="fas fa-tachometer-alt"></i> Dashboard Panel</h2>
            <div class="status-grid">
                <div class="stat-card">
                    <i class="fas fa-user"></i>
                    <h3>User Info</h3>
                    <p><strong>Username:</strong> ${currentPanelUser.username}</p>
                    <p><strong>Role:</strong> ${currentPanelUser.role || 'User'}</p>
                    <p><strong>Password:</strong> ${currentPanelUser.password}</p>
                    <p><strong>Email:</strong> ${currentPanelUser.email || '-'}</p>
                </div>
                <div class="stat-card">
                    <i class="fas fa-server"></i>
                    <h3>Server Status</h3>
                    <p><strong>CPU:</strong> ${config.panel_cpu || '0'}%</p>
                    <div style="width: 100%; height: 4px; background: var(--border); border-radius: 2px;">
                        <div style="width: ${config.panel_cpu || '0'}%; height: 100%; background: var(--accent); border-radius: 2px;"></div>
                    </div>
                    <p><strong>Memory:</strong> ${config.panel_memory || '0'} / 2048 MB</p>
                    <div style="width: 100%; height: 4px; background: var(--border); border-radius: 2px;">
                        <div style="width: ${Math.floor((parseInt(config.panel_memory || 0) / 2048) * 100)}%; height: 100%; background: var(--accent); border-radius: 2px;"></div>
                    </div>
                    <p><strong>Disk:</strong> ${config.panel_disk || '0'} / 5120 MB</p>
                    <div style="width: 100%; height: 4px; background: var(--border); border-radius: 2px;">
                        <div style="width: ${Math.floor((parseInt(config.panel_disk || 0) / 5120) * 100)}%; height: 100%; background: var(--accent); border-radius: 2px;"></div>
                    </div>
                </div>
                <div class="stat-card">
                    <i class="fas fa-wifi"></i>
                    <h3>Sinyal & Koneksi</h3>
                    <p><strong>Signal:</strong> ${signal}%</p>
                    <div style="width: 100%; height: 4px; background: var(--border); border-radius: 2px;">
                        <div style="width: ${signal}%; height: 100%; background: var(--accent); border-radius: 2px;"></div>
                    </div>
                    <p><strong>Ping:</strong> ${config.panel_ping || '0ms'}</p>
                    <p><strong>Status:</strong> ${config.panel_status === 'online' ? '🟢 Connected' : '🔴 Disconnected'}</p>
                </div>
                <div class="stat-card">
                    <i class="fas fa-calendar"></i>
                    <h3>Tanggal & Waktu</h3>
                    <p><strong>Tanggal:</strong> ${now.toLocaleDateString('id-ID')}</p>
                    <p><strong>Waktu:</strong> ${now.toLocaleTimeString()}</p>
                    <p><strong>Hari:</strong> ${now.toLocaleDateString('id-ID', { weekday: 'long' })}</p>
                </div>
            </div>
            <button class="btn btn-danger" id="logoutPanelBtn"><i class="fas fa-sign-out-alt"></i> Keluar Panel</button>
        </div>
    `;
}

async function renderShop() {
    const products = await db.getAllProducts();
    const activeProducts = products.filter(p => p.status === 'active');
    
    return `
        <div class="card">
            <h2><i class="fas fa-store"></i> Daftar Produk</h2>
            <div class="product-grid">
                ${activeProducts.map(product => `
                    <div class="product-card">
                        <h3><i class="fas fa-cube"></i> ${product.name}</h3>
                        <p class="product-description">${product.description}</p>
                        ${product.features ? `
                            <div style="text-align: left; margin: 10px 0;">
                                <small><i class="fas fa-check-circle" style="color: var(--success);"></i> ${product.features.join('</small><br><small><i class="fas fa-check-circle" style="color: var(--success);"></i> ')}</small>
                            </div>
                        ` : ''}
                        <div class="product-price">Rp ${product.price.toLocaleString()}</div>
                        <button class="btn buy-btn" data-product='${JSON.stringify(product)}'>
                            <i class="fas fa-shopping-cart"></i> Beli Sekarang
                        </button>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

async function renderStatusPanel() {
    const config = await db.getAllConfig();
    const now = new Date();
    const panels = await db.getAllPanels();
    const orders = await db.getAllOrders();
    const paidOrders = orders.filter(o => o.status === 'paid');
    const totalRevenue = paidOrders.reduce((sum, o) => sum + o.amount, 0);
    
    return `
        <div class="card">
            <h2><i class="fas fa-chart-line"></i> Status Panel Real Time</h2>
            <div class="status-grid">
                <div class="stat-card">
                    <i class="fas fa-server"></i>
                    <h3>Panel Status</h3>
                    <p class="status-badge ${config.panel_status === 'online' ? 'status-online' : 'status-offline'}">
                        ${config.panel_status === 'online' ? '🟢 Active' : '🔴 Inactive'}
                    </p>
                    <small>Last checked: ${now.toLocaleTimeString()}</small>
                </div>
                <div class="stat-card">
                    <i class="fas fa-microchip"></i>
                    <h3>CPU Usage</h3>
                    <p>${config.panel_cpu || '0'}%</p>
                    <div style="width: 100%; height: 4px; background: var(--border); border-radius: 2px;">
                        <div style="width: ${config.panel_cpu || '0'}%; height: 100%; background: var(--accent); border-radius: 2px;"></div>
                    </div>
                </div>
                <div class="stat-card">
                    <i class="fas fa-memory"></i>
                    <h3>Memory Usage</h3>
                    <p>${config.panel_memory || '0'} / 2048 MB</p>
                    <div style="width: 100%; height: 4px; background: var(--border); border-radius: 2px;">
                        <div style="width: ${Math.floor((parseInt(config.panel_memory || 0) / 2048) * 100)}%; height: 100%; background: var(--accent); border-radius: 2px;"></div>
                    </div>
                </div>
                <div class="stat-card">
                    <i class="fas fa-hdd"></i>
                    <h3>Disk Usage</h3>
                    <p>${config.panel_disk || '0'} / 5120 MB</p>
                    <div style="width: 100%; height: 4px; background: var(--border); border-radius: 2px;">
                        <div style="width: ${Math.floor((parseInt(config.panel_disk || 0) / 5120) * 100)}%; height: 100%; background: var(--accent); border-radius: 2px;"></div>
                    </div>
                </div>
                <div class="stat-card">
                    <i class="fas fa-users"></i>
                    <h3>Active Panels</h3>
                    <p>${panels.length} Users</p>
                    <small>Total registered panels</small>
                </div>
                <div class="stat-card">
                    <i class="fas fa-shopping-cart"></i>
                    <h3>Total Orders</h3>
                    <p>${orders.length} Orders</p>
                    <small>${paidOrders.length} completed</small>
                </div>
                <div class="stat-card">
                    <i class="fas fa-money-bill-wave"></i>
                    <h3>Total Revenue</h3>
                    <p>Rp ${totalRevenue.toLocaleString()}</p>
                    <small>From ${paidOrders.length} transactions</small>
                </div>
                <div class="stat-card">
                    <i class="fas fa-clock"></i>
                    <h3>Uptime</h3>
                    <p>${Math.floor(Math.random() * 30 + 15)} Days</p>
                    <small>99.9% uptime</small>
                </div>
            </div>
        </div>
        
        <div class="card">
            <h3><i class="fas fa-chart-simple"></i> Recent Orders</h3>
            <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="border-bottom: 1px solid var(--border);">
                            <th style="text-align: left; padding: 10px;">Order ID</th>
                            <th style="text-align: left; padding: 10px;">Product</th>
                            <th style="text-align: left; padding: 10px;">Amount</th>
                            <th style="text-align: left; padding: 10px;">Status</th>
                            <th style="text-align: left; padding: 10px;">Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${orders.slice(0, 5).map(order => `
                            <tr style="border-bottom: 1px solid var(--border);">
                                <td style="padding: 10px;">${order.id}</td>
                                <td style="padding: 10px;">${order.productName}</td>
                                <td style="padding: 10px;">Rp ${order.amount?.toLocaleString() || 0}</td>
                                <td style="padding: 10px;">
                                    <span class="status-badge ${order.status === 'paid' ? 'status-online' : 'status-offline'}">
                                        ${order.status === 'paid' ? '✅ Paid' : '⏳ Pending'}
                                    </span>
                                </td>
                                <td style="padding: 10px;">${new Date(order.date).toLocaleDateString()}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

async function renderDevStatus() {
    const config = await db.getAllConfig();
    const stats = await db.getDashboardStats();
    
    return `
        <div class="card">
            <h2><i class="fas fa-code"></i> Developer Information</h2>
            <div class="status-grid">
                <div class="stat-card">
                    <i class="fas fa-user-circle"></i>
                    <h3>Developer</h3>
                    <p><strong>${config.dev_name || 'Chris'}</strong></p>
                    <p>${config.dev_role || 'Full Stack Developer'}</p>
                    <p><i class="fas fa-map-marker-alt"></i> Indonesia</p>
                </div>
                <div class="stat-card">
                    <i class="fas fa-cube"></i>
                    <h3>System Info</h3>
                    <p><strong>NexusPanel v2.0</strong></p>
                    <p>Pterodactyl Integration</p>
                    <p>Pakasir Payment Gateway</p>
                    <p>IndexedDB Database</p>
                </div>
                <div class="stat-card">
                    <i class="fas fa-chart-simple"></i>
                    <h3>Statistics</h3>
                    <p><strong>Total Users:</strong> ${stats.totalPanels}</p>
                    <p><strong>Active Panels:</strong> ${stats.activePanels}</p>
                    <p><strong>Total Orders:</strong> ${stats.totalOrders}</p>
                    <p><strong>Total Revenue:</strong> Rp ${stats.totalRevenue.toLocaleString()}</p>
                </div>
            </div>
            
            <div class="social-links">
                <a href="${config.instagram || '#'}" class="social-link" target="_blank">
                    <i class="fab fa-instagram"></i> Instagram
                </a>
                <a href="${config.whatsapp || '#'}" class="social-link" target="_blank">
                    <i class="fab fa-whatsapp"></i> WhatsApp
                </a>
                <a href="${config.github || '#'}" class="social-link" target="_blank">
                    <i class="fab fa-github"></i> GitHub
                </a>
            </div>
            
            <div class="card" style="margin-top: 20px; text-align: center;">
                <h3><i class="fas fa-headset"></i> Contact Support</h3>
                <p><i class="fas fa-envelope"></i> Email: support@nexuspanel.com</p>
                <p><i class="fab fa-telegram"></i> Telegram: @nexus_support</p>
                <p><i class="fas fa-clock"></i> Response Time: 24/7 Active</p>
                <hr style="margin: 15px 0; border-color: var(--border);">
                <p><small>© 2024 NexusPanel - Premium Panel Store</small></p>
            </div>
        </div>
    `;
}

function attachPageEvents() {
    const loginPanelBtn = document.getElementById('loginPanelBtn');
    if (loginPanelBtn) {
        loginPanelBtn.onclick = async () => {
            const username = document.getElementById('panelUsername').value;
            const password = document.getElementById('panelPassword').value;
            
            if (!username || !password) {
                document.getElementById('panelLoginError').innerText = 'Username dan password tidak boleh kosong!';
                return;
            }
            
            const panel = await db.getPanel(username);
            if (panel && panel.password === password) {
                await showLoading(30, "Mengakses mode panel...");
                currentPanelUser = panel;
                await loadPage('panel');
            } else {
                document.getElementById('panelLoginError').innerText = 'Username atau password salah!';
            }
        };
    }
    
    const logoutPanelBtn = document.getElementById('logoutPanelBtn');
    if (logoutPanelBtn) {
        logoutPanelBtn.onclick = () => {
            currentPanelUser = null;
            loadPage('panel');
        };
    }
    
    document.querySelectorAll('.buy-btn').forEach(btn => {
        btn.onclick = async () => {
            const product = JSON.parse(btn.dataset.product);
            
            if (product.type === 'unli_panel') {
                const username = prompt('Masukkan username untuk panel Anda (min 3 karakter):');
                if (!username || username.length < 3) {
                    alert('Username minimal 3 karakter!');
                    return;
                }
                const password = prompt('Masukkan password untuk panel Anda (min 4 karakter):');
                if (!password || password.length < 4) {
                    alert('Password minimal 4 karakter!');
                    return;
                }
                const email = prompt('Masukkan email Anda untuk verifikasi:');
                if (!email || !email.includes('@')) {
                    alert('Email tidak valid!');
                    return;
                }
                
                try {
                    const paid = await paymentSystem.processPayment(product, { username, email });
                    if (paid) {
                        await showLoading(45, "Membuat panel server...");
                        const result = await pterodactyl.createServer(username, password, email);
                        await db.addPanel({
                            username: username,
                            password: password,
                            email: email,
                            role: 'user',
                            panelUrl: result.panelUrl,
                            productId: product.id,
                            serverId: result.serverId
                        });
                        alert(`✅ Panel berhasil dibuat!\n\nURL: ${result.panelUrl}\nUsername: ${username}\nPassword: ${password}\n\nSilakan login ke Mode Panel menggunakan credentials di atas.`);
                        currentPanelUser = { username, password, role: 'user', email };
                        await loadPage('panel');
                    }
                } catch (error) {
                    alert('❌ Error: ' + error.message);
                }
            } 
            else if (product.type === 'admin_panel') {
                const username = prompt('Masukkan username admin (min 3 karakter):');
                if (!username || username.length < 3) {
                    alert('Username minimal 3 karakter!');
                    return;
                }
                const password = prompt('Masukkan password admin (min 4 karakter):');
                if (!password || password.length < 4) {
                    alert('Password minimal 4 karakter!');
                    return;
                }
                const email = prompt('Masukkan email Anda untuk verifikasi:');
                if (!email || !email.includes('@')) {
                    alert('Email tidak valid!');
                    return;
                }
                
                try {
                    const paid = await paymentSystem.processPayment(product, { username, email });
                    if (paid) {
                        await showLoading(30, "Membuat akun admin...");
                        const result = await pterodactyl.createAdminUser(username, password, email);
                        await db.addPanel({
                            username: username,
                            password: password,
                            email: email,
                            role: 'admin',
                            panelUrl: result.panelUrl,
                            productId: product.id,
                            userId: result.userId
                        });
                        alert(`✅ Admin Panel berhasil dibuat!\n\nURL: ${result.panelUrl}\nUsername: ${username}\nPassword: ${password}\n\nSilakan login ke Mode Panel menggunakan credentials di atas.`);
                        currentPanelUser = { username, password, role: 'admin', email };
                        await loadPage('panel');
                    }
                } catch (error) {
                    alert('❌ Error: ' + error.message);
                }
            }
            else if (product.type === 'bot_script' || product.type === 'bot_pack') {
                const username = prompt('Masukkan username untuk aktivasi license:');
                if (!username) return;
                
                try {
                    const paid = await paymentSystem.processPayment(product, { username });
                    if (paid) {
                        if (product.download_url) {
                            window.open(product.download_url, '_blank');
                            alert(`✅ Pembelian berhasil!\n\nProduk: ${product.name}\nLink download telah dibuka.\n\nTerima kasih telah berbelanja!`);
                        } else {
                            alert(`✅ Pembelian berhasil!\n\nProduk: ${product.name}\nLink download akan dikirim ke email Anda.\n\nTerima kasih telah berbelanja!`);
                        }
                    }
                } catch (error) {
                    alert('❌ Error: ' + error.message);
                }
            }
        };
    });
}

async function initMusicPlayer() {
    songs = await db.getActiveSongs();
    if (songs.length === 0) {
        songs = await db.getAllSongs();
    }
    
    audioPlayer = document.getElementById('audioPlayer');
    const playPauseBtn = document.getElementById('playPauseBtn');
    const nextSongBtn = document.getElementById('nextSongBtn');
    const currentSongSpan = document.getElementById('currentSong');
    
    if (songs.length > 0) {
        currentSongSpan.textContent = songs[0].title;
        audioPlayer.src = songs[0].url;
    }
    
    if (playPauseBtn) {
        playPauseBtn.onclick = () => {
            if (audioPlayer.paused) {
                audioPlayer.play();
                playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
            } else {
                audioPlayer.pause();
                playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
            }
        };
    }
    
    if (nextSongBtn) {
        nextSongBtn.onclick = () => {
            if (songs.length > 0) {
                currentSongIndex = (currentSongIndex + 1) % songs.length;
                currentSongSpan.textContent = songs[currentSongIndex].title;
                audioPlayer.src = songs[currentSongIndex].url;
                audioPlayer.play();
                playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
            }
        };
    }
    
    audioPlayer.addEventListener('ended', () => {
        if (nextSongBtn) nextSongBtn.click();
    });
}

function startStatusMonitor() {
    if (statusInterval) clearInterval(statusInterval);
    
    statusInterval = setInterval(async () => {
        if (currentPage === 'status' || currentPage === 'home' || currentPage === 'panel') {
            await loadPage(currentPage);
        }
        
        const config = await db.getAllConfig();
        const signal = Math.floor(Math.random() * 30 + 70);
        
        const signalElements = document.querySelectorAll('.stat-card .signal-value');
        if (signalElements.length > 0) {
            // Update signal in real-time if needed
        }
    }, 30000);
}

// Start the application
init();

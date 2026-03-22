/* FILE: database.js */
class Database {
    constructor() {
        this.dbName = "NexusPanelDB";
        this.dbVersion = 1;
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                this.loadInitialData();
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Config store
                if (!db.objectStoreNames.contains('config')) {
                    db.createObjectStore('config', { keyPath: 'key' });
                }
                
                // Products store
                if (!db.objectStoreNames.contains('products')) {
                    const productStore = db.createObjectStore('products', { keyPath: 'id', autoIncrement: true });
                    productStore.createIndex('type', 'type');
                    productStore.createIndex('status', 'status');
                }
                
                // Panels store
                if (!db.objectStoreNames.contains('panels')) {
                    const panelStore = db.createObjectStore('panels', { keyPath: 'id', autoIncrement: true });
                    panelStore.createIndex('username', 'username', { unique: true });
                    panelStore.createIndex('role', 'role');
                }
                
                // Orders store
                if (!db.objectStoreNames.contains('orders')) {
                    const orderStore = db.createObjectStore('orders', { keyPath: 'id', autoIncrement: true });
                    orderStore.createIndex('status', 'status');
                    orderStore.createIndex('userId', 'userId');
                }
                
                // Songs store
                if (!db.objectStoreNames.contains('songs')) {
                    db.createObjectStore('songs', { keyPath: 'id', autoIncrement: true });
                }
            };
        });
    }
    
    async loadInitialData() {
        // Check if config already exists
        const websiteName = await this.getConfig('website_name');
        
        if (!websiteName) {
            // Config Settings
            await this.setConfig('website_name', 'NexusPanel Store');
            await this.setConfig('panel_status', 'online');
            await this.setConfig('panel_ping', '24ms');
            await this.setConfig('panel_cpu', '12');
            await this.setConfig('panel_memory', '384');
            await this.setConfig('panel_disk', '2048');
            
            // Developer Info
            await this.setConfig('dev_name', 'Chris');
            await this.setConfig('dev_role', 'Full Stack Developer');
            await this.setConfig('instagram', 'https://instagram.com/chrisdev');
            await this.setConfig('whatsapp', 'https://wa.me/6281234567890');
            await this.setConfig('github', 'https://github.com/chrisdev');
            
            // Payment Config
            await this.setConfig('pakasir_slug', 'chris-official');
            await this.setConfig('pakasir_api_key', '3cm15DEiB8Y7H5fgxLQQXhOgTT0rpQZB');
            
            // Pterodactyl Config
            await this.setConfig('pterodactyl_url', 'https://panel.yourdomain.com');
            await this.setConfig('pterodactyl_api_key', 'ptla_ZFdLS5DKtFpIy4gqzR2z9MnpxfT5KZ5tI40qUPQIUQS');
            await this.setConfig('pterodactyl_client_key', 'ptlc_DXwAmYmUigrN08NKJi7tuvxfKx09ENJXAWjRkIfCZ5Q');
        }
        
        // Check if products exist
        const products = await this.getAllProducts();
        if (products.length === 0) {
            // Product 1: Panel Unlimited
            await this.addProduct({
                name: "Panel Unlimited",
                price: 85000,
                type: "unli_panel",
                description: "Akses penuh unlimited panel Pterodactyl dengan resource unlimited",
                status: "active",
                features: ["Unlimited Resource", "Full Access", "24/7 Support"]
            });
            
            // Product 2: Admin Panel
            await this.addProduct({
                name: "Admin Panel",
                price: 150000,
                type: "admin_panel",
                description: "Role admin dengan akses penuh dan bisa membuat panel sendiri",
                status: "active",
                features: ["Admin Role", "Create Sub Panels", "Full Control"]
            });
            
            // Product 3: Bot Script MD
            await this.addProduct({
                name: "Bot Script MD",
                price: 45000,
                type: "bot_script",
                description: "Full WhatsApp bot script dengan auto update dan fitur lengkap",
                status: "active",
                download_url: "https://www.mediafire.com/file/botscript.zip",
                features: ["Auto Update", "Multi Device", "All Features"]
            });
            
            // Product 4: Premium Bot Pack
            await this.addProduct({
                name: "Premium Bot Pack",
                price: 120000,
                type: "bot_pack",
                description: "Bundle 5 bot scripts premium + source code + support 24/7",
                status: "active",
                download_url: "https://www.mediafire.com/file/botpack.zip",
                features: ["5 Bot Scripts", "Source Code", "Priority Support"]
            });
        }
        
        // Check if songs exist
        const songs = await this.getAllSongs();
        if (songs.length === 0) {
            await this.addSong({ 
                title: "LoFi Study Beats", 
                url: "https://files.catbox.moe/lofi1.mp3", 
                duration: "3:45",
                active: true
            });
            await this.addSong({ 
                title: "Electronic Dreams", 
                url: "https://files.catbox.moe/electronic.mp3", 
                duration: "4:20",
                active: true
            });
            await this.addSong({ 
                title: "Chill Vibes", 
                url: "https://files.catbox.moe/chill.mp3", 
                duration: "3:30",
                active: true
            });
            await this.addSong({ 
                title: "Ambient Waves", 
                url: "https://files.catbox.moe/ambient.mp3", 
                duration: "5:15",
                active: true
            });
            await this.addSong({ 
                title: "Midnight Journey", 
                url: "https://files.catbox.moe/midnight.mp3", 
                duration: "4:45",
                active: true
            });
        }
    }
    
    // Config Methods
    async getConfig(key) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['config'], 'readonly');
            const store = transaction.objectStore('config');
            const request = store.get(key);
            request.onsuccess = () => resolve(request.result ? request.result.value : null);
            request.onerror = () => reject(request.error);
        });
    }
    
    async setConfig(key, value) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['config'], 'readwrite');
            const store = transaction.objectStore('config');
            const request = store.put({ key: key, value: value });
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
    
    async getAllConfig() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['config'], 'readonly');
            const store = transaction.objectStore('config');
            const request = store.getAll();
            request.onsuccess = () => {
                const config = {};
                request.result.forEach(item => { config[item.key] = item.value; });
                resolve(config);
            };
            request.onerror = () => reject(request.error);
        });
    }
    
    // Product Methods
    async addProduct(product) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['products'], 'readwrite');
            const store = transaction.objectStore('products');
            const request = store.add(product);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    
    async updateProduct(id, product) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['products'], 'readwrite');
            const store = transaction.objectStore('products');
            const request = store.put({ ...product, id: id });
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
    
    async deleteProduct(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['products'], 'readwrite');
            const store = transaction.objectStore('products');
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
    
    async getAllProducts() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['products'], 'readonly');
            const store = transaction.objectStore('products');
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    
    async getProductsByType(type) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['products'], 'readonly');
            const store = transaction.objectStore('products');
            const index = store.index('type');
            const request = index.getAll(type);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    
    // Panel Methods
    async addPanel(panelData) {
        panelData.createdAt = new Date().toISOString();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['panels'], 'readwrite');
            const store = transaction.objectStore('panels');
            const request = store.add(panelData);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    
    async getPanel(username) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['panels'], 'readonly');
            const store = transaction.objectStore('panels');
            const index = store.index('username');
            const request = index.get(username);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    
    async getAllPanels() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['panels'], 'readonly');
            const store = transaction.objectStore('panels');
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    
    async updatePanel(id, panelData) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['panels'], 'readwrite');
            const store = transaction.objectStore('panels');
            const request = store.put({ ...panelData, id: id });
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
    
    async deletePanel(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['panels'], 'readwrite');
            const store = transaction.objectStore('panels');
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
    
    // Order Methods
    async addOrder(order) {
        order.date = new Date().toISOString();
        order.status = "pending";
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['orders'], 'readwrite');
            const store = transaction.objectStore('orders');
            const request = store.add(order);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    
    async updateOrder(orderId, updates) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['orders'], 'readwrite');
            const store = transaction.objectStore('orders');
            const request = store.get(orderId);
            request.onsuccess = () => {
                const order = request.result;
                Object.assign(order, updates);
                const updateRequest = store.put(order);
                updateRequest.onsuccess = () => resolve(order);
                updateRequest.onerror = () => reject(updateRequest.error);
            };
            request.onerror = () => reject(request.error);
        });
    }
    
    async getAllOrders() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['orders'], 'readonly');
            const store = transaction.objectStore('orders');
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    
    async getOrdersByStatus(status) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['orders'], 'readonly');
            const store = transaction.objectStore('orders');
            const index = store.index('status');
            const request = index.getAll(status);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    
    // Song Methods
    async addSong(song) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['songs'], 'readwrite');
            const store = transaction.objectStore('songs');
            const request = store.add(song);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    
    async updateSong(id, song) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['songs'], 'readwrite');
            const store = transaction.objectStore('songs');
            const request = store.put({ ...song, id: id });
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
    
    async deleteSong(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['songs'], 'readwrite');
            const store = transaction.objectStore('songs');
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
    
    async getAllSongs() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['songs'], 'readonly');
            const store = transaction.objectStore('songs');
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    
    async getActiveSongs() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['songs'], 'readonly');
            const store = transaction.objectStore('songs');
            const request = store.getAll();
            request.onsuccess = () => {
                const activeSongs = request.result.filter(song => song.active !== false);
                resolve(activeSongs);
            };
            request.onerror = () => reject(request.error);
        });
    }
    
    // Dashboard Stats
    async getDashboardStats() {
        const panels = await this.getAllPanels();
        const orders = await this.getAllOrders();
        const paidOrders = await this.getOrdersByStatus('paid');
        
        return {
            totalPanels: panels.length,
            totalOrders: orders.length,
            totalRevenue: paidOrders.reduce((sum, order) => sum + order.amount, 0),
            activePanels: panels.filter(p => p.status !== 'suspended').length
        };
    }
}

const db = new Database();

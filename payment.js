/* FILE: payment.js */
class PaymentSystem {
    constructor() {
        this.pakasirEndpoint = "https://api.pakasir.com/v1";
    }
    
    async getPakasirConfig() {
        const slug = await db.getConfig('pakasir_slug');
        const apiKey = await db.getConfig('pakasir_api_key');
        return { slug, apiKey };
    }
    
    async createQRISPayment(amount, orderId, customerName) {
        const { slug, apiKey } = await this.getPakasirConfig();
        
        const paymentData = {
            amount: amount,
            order_id: orderId,
            customer_name: customerName,
            payment_method: "QRIS",
            slug: slug,
            api_key: apiKey
        };
        
        try {
            const response = await fetch(`${this.pakasirEndpoint}/create-payment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify(paymentData)
            });
            
            const data = await response.json();
            
            if (data.status === 'success') {
                return {
                    qrCode: data.qr_code_url,
                    paymentId: data.payment_id,
                    expiryTime: data.expiry_time,
                    amount: amount,
                    orderId: orderId
                };
            } else {
                throw new Error(data.message || 'Payment creation failed');
            }
        } catch (error) {
            console.error("Payment creation error:", error);
            throw error;
        }
    }
    
    async checkPaymentStatus(paymentId) {
        const { apiKey } = await this.getPakasirConfig();
        
        try {
            const response = await fetch(`${this.pakasirEndpoint}/payment-status/${paymentId}`, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`
                }
            });
            
            const data = await response.json();
            return data.status === 'paid';
        } catch (error) {
            console.error("Payment status check error:", error);
            return false;
        }
    }
    
    async sendTelegramNotification(message) {
        const botToken = await db.getConfig('telegram_bot_token');
        const chatId = await db.getConfig('telegram_chat_id');
        
        if (botToken && chatId && botToken !== '') {
            try {
                await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        chat_id: chatId,
                        text: message,
                        parse_mode: 'HTML'
                    })
                });
                console.log("Telegram notification sent");
            } catch (error) {
                console.error("Telegram notification failed:", error);
            }
        } else {
            console.log("Telegram notification (demo):", message);
        }
    }
    
    async processPayment(product, userData) {
        return new Promise(async (resolve, reject) => {
            try {
                const orderId = Date.now() + "_" + Math.random().toString(36).substr(2, 8);
                const order = {
                    id: orderId,
                    productId: product.id,
                    productName: product.name,
                    productType: product.type,
                    amount: product.price,
                    userId: userData.username,
                    userEmail: userData.email || '',
                    status: "pending",
                    date: new Date().toISOString()
                };
                
                await db.addOrder(order);
                
                const payment = await this.createQRISPayment(product.price, orderId, userData.username);
                
                this.showPaymentModal(payment, order, product, userData, resolve);
                
            } catch (error) {
                reject(error);
            }
        });
    }
    
    showPaymentModal(payment, order, product, userData, resolve) {
        const modal = document.createElement('div');
        modal.className = 'loading-overlay';
        modal.style.flexDirection = 'column';
        modal.innerHTML = `
            <div class="card" style="max-width: 450px; text-align: center;">
                <h2><i class="fas fa-qrcode"></i> QRIS Payment</h2>
                <div style="margin: 20px 0;">
                    <img src="${payment.qrCode}" style="width: 250px; height: 250px; border: 2px solid var(--border); border-radius: 15px;">
                </div>
                <div style="background: var(--bg-secondary); padding: 15px; border-radius: 10px; margin: 10px 0;">
                    <p><strong>Total Pembayaran:</strong></p>
                    <p style="font-size: 24px; color: var(--accent); font-weight: bold;">Rp ${product.price.toLocaleString()}</p>
                </div>
                <div style="text-align: left; margin: 15px 0;">
                    <p><i class="fas fa-shopping-cart"></i> <strong>Produk:</strong> ${product.name}</p>
                    <p><i class="fas fa-user"></i> <strong>Pembeli:</strong> ${userData.username}</p>
                    <p><i class="fas fa-hashtag"></i> <strong>Order ID:</strong> ${order.id}</p>
                    <p><i class="fas fa-clock"></i> <strong>Expired:</strong> ${new Date(payment.expiryTime).toLocaleTimeString()}</p>
                </div>
                <div class="loading-spinner" style="margin: 20px auto;"></div>
                <p><i class="fas fa-info-circle"></i> Scan QR code di atas menggunakan aplikasi pembayaran (DANA, OVO, GOPAY, LinkAja, ShopeePay)</p>
                <p style="color: var(--warning); font-size: 12px; margin-top: 10px;">Pembayaran akan otomatis terdeteksi dalam 5-10 detik</p>
                <button class="btn" id="checkPaymentBtn" style="margin-top: 15px;">
                    <i class="fas fa-sync-alt"></i> Cek Status Pembayaran
                </button>
                <button class="btn btn-danger" id="closePaymentBtn" style="margin-top: 10px; background: var(--danger);">
                    <i class="fas fa-times"></i> Tutup
                </button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        let checkInterval;
        let isResolved = false;
        
        const completePayment = async () => {
            if (isResolved) return;
            isResolved = true;
            
            if (checkInterval) clearInterval(checkInterval);
            
            await db.updateOrder(order.id, { status: "paid", paidAt: new Date().toISOString() });
            
            const notification = `
🎉 <b>PEMBAYARAN BERHASIL!</b> 🎉

━━━━━━━━━━━━━━━━━━━━
📅 <b>Tanggal:</b> ${new Date().toLocaleString()}
👤 <b>Pembeli:</b> ${userData.username}
🛒 <b>Produk:</b> ${product.name}
💰 <b>Harga:</b> Rp ${product.price.toLocaleString()}
💳 <b>Metode:</b> QRIS (Pakasir)
🆔 <b>Order ID:</b> ${order.id}
✅ <b>Status:</b> PAID
━━━━━━━━━━━━━━━━━━━━
            `;
            
            await this.sendTelegramNotification(notification);
            
            modal.remove();
            resolve(true);
        };
        
        const checkPayment = async () => {
            try {
                const paid = await this.checkPaymentStatus(payment.paymentId);
                if (paid) {
                    await completePayment();
                } else {
                    alert("⏳ Pembayaran belum terdeteksi. Silakan scan QR code dan lakukan pembayaran terlebih dahulu.");
                }
            } catch (error) {
                alert("Error checking payment: " + error.message);
            }
        };
        
        document.getElementById('checkPaymentBtn').onclick = checkPayment;
        document.getElementById('closePaymentBtn').onclick = () => {
            if (checkInterval) clearInterval(checkInterval);
            modal.remove();
            resolve(false);
        };
        
        checkInterval = setInterval(async () => {
            try {
                const paid = await this.checkPaymentStatus(payment.paymentId);
                if (paid && !isResolved) {
                    clearInterval(checkInterval);
                    await completePayment();
                }
            } catch (error) {
                console.error("Auto-check error:", error);
            }
        }, 5000);
        
        setTimeout(() => {
            if (!isResolved && document.body.contains(modal)) {
                const expiredMsg = document.createElement('div');
                expiredMsg.style.cssText = `
                    position: fixed;
                    bottom: 20px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: var(--danger);
                    color: white;
                    padding: 10px 20px;
                    border-radius: 10px;
                    z-index: 10000;
                    animation: fadeOut 5s forwards;
                `;
                expiredMsg.innerHTML = '<i class="fas fa-clock"></i> QRIS akan expired dalam 5 menit!';
                document.body.appendChild(expiredMsg);
                setTimeout(() => expiredMsg.remove(), 5000);
            }
        }, 600000);
    }
    
    async refundPayment(orderId) {
        try {
            const order = await db.getOrder(orderId);
            if (!order || order.status !== 'paid') {
                throw new Error('Order not found or not paid');
            }
            
            const { apiKey } = await this.getPakasirConfig();
            
            const response = await fetch(`${this.pakasirEndpoint}/refund/${orderId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            
            if (data.status === 'success') {
                await db.updateOrder(orderId, { status: 'refunded', refundedAt: new Date().toISOString() });
                await this.sendTelegramNotification(`🔄 REFUND: Order ${orderId} telah di-refund`);
                return true;
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            console.error("Refund error:", error);
            throw error;
        }
    }
    
    async getPaymentHistory(userId) {
        const orders = await db.getAllOrders();
        return orders.filter(order => order.userId === userId);
    }
    
    async getDailyRevenue() {
        const orders = await db.getOrdersByStatus('paid');
        const today = new Date().toDateString();
        
        const todayOrders = orders.filter(order => {
            return new Date(order.paidAt).toDateString() === today;
        });
        
        return {
            date: today,
            totalOrders: todayOrders.length,
            totalRevenue: todayOrders.reduce((sum, order) => sum + order.amount, 0),
            orders: todayOrders
        };
    }
    
    async getMonthlyRevenue() {
        const orders = await db.getOrdersByStatus('paid');
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        
        const monthlyOrders = orders.filter(order => {
            const orderDate = new Date(order.paidAt);
            return orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear;
        });
        
        const revenueByProduct = {};
        monthlyOrders.forEach(order => {
            if (!revenueByProduct[order.productName]) {
                revenueByProduct[order.productName] = 0;
            }
            revenueByProduct[order.productName] += order.amount;
        });
        
        return {
            month: new Date().toLocaleString('id-ID', { month: 'long', year: 'numeric' }),
            totalOrders: monthlyOrders.length,
            totalRevenue: monthlyOrders.reduce((sum, order) => sum + order.amount, 0),
            revenueByProduct: revenueByProduct
        };
    }
}

const paymentSystem = new PaymentSystem();

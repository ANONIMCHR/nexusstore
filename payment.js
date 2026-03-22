/* FILE: payment.js - VERSI PAKASIR AKTIF (Langsung Copy Paste) */
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
            slug: slug
        };
        
        try {
            const response = await fetch(`${this.pakasirEndpoint}/create-payment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                    'Accept': 'application/json'
                },
                body: JSON.stringify(paymentData)
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.status === 'success') {
                return {
                    qrCode: data.qr_code_url,
                    paymentId: data.payment_id,
                    expiryTime: data.expiry_time
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
                    'Authorization': `Bearer ${apiKey}`,
                    'Accept': 'application/json'
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
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: chatId,
                        text: message,
                        parse_mode: 'HTML'
                    })
                });
            } catch (error) {
                console.error("Telegram notification failed:", error);
            }
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
                alert("Error: " + error.message);
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
                    <p><strong>Total:</strong> Rp ${product.price.toLocaleString()}</p>
                </div>
                <div style="text-align: left; margin: 15px 0;">
                    <p><strong>Produk:</strong> ${product.name}</p>
                    <p><strong>Pembeli:</strong> ${userData.username}</p>
                    <p><strong>Order ID:</strong> ${order.id}</p>
                </div>
                <div class="loading-spinner" style="margin: 20px auto;"></div>
                <p>Scan QR code dengan aplikasi pembayaran</p>
                <button class="btn" id="checkPaymentBtn" style="margin-top: 15px;">
                    <i class="fas fa-sync-alt"></i> Cek Status
                </button>
                <button class="btn btn-danger" id="closePaymentBtn" style="margin-top: 10px;">
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
            clearInterval(checkInterval);
            
            await db.updateOrder(order.id, { status: "paid", paidAt: new Date().toISOString() });
            
            const notification = `🎉 PEMBAYARAN BERHASIL!\nProduk: ${product.name}\nPembeli: ${userData.username}\nTotal: Rp ${product.price.toLocaleString()}`;
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
                    alert("⏳ Pembayaran belum terdeteksi. Silakan scan QR code dan bayar.");
                }
            } catch (error) {
                alert("Error: " + error.message);
            }
        };
        
        document.getElementById('checkPaymentBtn').onclick = checkPayment;
        document.getElementById('closePaymentBtn').onclick = () => {
            clearInterval(checkInterval);
            modal.remove();
            resolve(false);
        };
        
        checkInterval = setInterval(async () => {
            try {
                const paid = await this.checkPaymentStatus(payment.paymentId);
                if (paid && !isResolved) {
                    await completePayment();
                }
            } catch (error) {
                console.error("Auto-check error:", error);
            }
        }, 5000);
    }
}

const paymentSystem = new PaymentSystem();

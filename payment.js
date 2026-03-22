/* FILE: payment.js - FULL REAL (TANPA DEMO MODE) */
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
        
        if (!apiKey || apiKey === '') {
            throw new Error("API Key Pakasir belum diisi. Silakan isi di database.");
        }
        
        const paymentData = {
            amount: amount,
            order_id: orderId,
            customer_name: customerName,
            payment_method: "QRIS",
            slug: slug
        };
        
        console.log("Mengirim ke Pakasir:", paymentData);
        
        const response = await fetch(`${this.pakasirEndpoint}/create-payment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(paymentData)
        });
        
        console.log("Response status:", response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error("Error response:", errorText);
            throw new Error(`Pakasir Error: ${response.status} - ${errorText}`);
        }
        
        const data = await response.json();
        console.log("Response data:", data);
        
        if (data.status === 'success') {
            return {
                qrCode: data.qr_code_url,
                paymentId: data.payment_id,
                expiryTime: data.expiry_time
            };
        } else {
            throw new Error(data.message || 'Gagal membuat payment');
        }
    }
    
    async checkPaymentStatus(paymentId) {
        const { apiKey } = await this.getPakasirConfig();
        
        const response = await fetch(`${this.pakasirEndpoint}/payment-status/${paymentId}`, {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        
        const data = await response.json();
        return data.status === 'paid';
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
                console.log("Telegram notifikasi terkirim");
            } catch (error) {
                console.error("Telegram error:", error);
            }
        } else {
            console.log("Telegram belum dikonfigurasi");
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
                
                this.showPaymentModal(payment, order, product, userData, resolve, reject);
                
            } catch (error) {
                alert("❌ Error: " + error.message);
                reject(error);
            }
        });
    }
    
    showPaymentModal(payment, order, product, userData, resolve, reject) {
        const modal = document.createElement('div');
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.background = 'rgba(0,0,0,0.95)';
        modal.style.display = 'flex';
        modal.style.justifyContent = 'center';
        modal.style.alignItems = 'center';
        modal.style.zIndex = '9999';
        
        modal.innerHTML = `
            <div style="background: #1e1e2f; padding: 30px; border-radius: 20px; text-align: center; max-width: 400px; color: white;">
                <h2><i class="fas fa-qrcode"></i> QRIS Payment</h2>
                <div style="background: white; padding: 20px; border-radius: 10px; margin: 20px 0;">
                    <img src="${payment.qrCode}" style="width: 200px;">
                </div>
                <p style="font-size: 28px; color: #00ff00; font-weight: bold;">Rp ${product.price.toLocaleString()}</p>
                <p><i class="fas fa-hashtag"></i> Order ID: ${order.id}</p>
                <p><i class="fas fa-user"></i> Pembeli: ${userData.username}</p>
                <p><i class="fas fa-clock"></i> Expired: ${new Date(payment.expiryTime).toLocaleTimeString()}</p>
                <hr style="margin: 20px 0; border-color: #333;">
                <div class="loading-spinner" style="margin: 20px auto; width: 40px; height: 40px; border: 3px solid #fff; border-top-color: #00ff00; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                <p>Scan QR code dengan aplikasi pembayaran (DANA, OVO, GOPAY, LinkAja)</p>
                <p style="font-size: 12px; color: #aaa;">Pembayaran akan otomatis terdeteksi dalam 5-10 detik</p>
                <button id="checkBtn" style="margin-top: 20px; padding: 12px 30px; background: #00ff00; color: black; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">
                    <i class="fas fa-sync-alt"></i> Cek Status Pembayaran
                </button>
                <button id="closeBtn" style="margin-top: 10px; padding: 12px 30px; background: #ff4444; color: white; border: none; border-radius: 8px; cursor: pointer;">
                    <i class="fas fa-times"></i> Tutup
                </button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Tambahkan style untuk animasi spin
        const style = document.createElement('style');
        style.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
        
        let interval;
        let isResolved = false;
        
        const completePayment = async () => {
            if (isResolved) return;
            isResolved = true;
            if (interval) clearInterval(interval);
            
            await db.updateOrder(order.id, { status: "paid", paidAt: new Date().toISOString() });
            
            const notification = `🎉 PEMBAYARAN BERHASIL! 🎉\n\nProduk: ${product.name}\nPembeli: ${userData.username}\nTotal: Rp ${product.price.toLocaleString()}\nOrder ID: ${order.id}`;
            await this.sendTelegramNotification(notification);
            
            modal.remove();
            alert(`✅ Pembayaran BERHASIL!\n\nProduk: ${product.name}\nTotal: Rp ${product.price.toLocaleString()}\n\nTerima kasih telah berbelanja!`);
            resolve(true);
        };
        
        const checkPayment = async () => {
            try {
                const paid = await this.checkPaymentStatus(payment.paymentId);
                if (paid) {
                    await completePayment();
                } else {
                    alert("⏳ Pembayaran belum terdeteksi.\n\nSilakan scan QR code dan lakukan pembayaran terlebih dahulu.\n\nJika sudah bayar, tunggu beberapa saat lalu cek lagi.");
                }
            } catch (error) {
                alert("Error: " + error.message);
            }
        };
        
        document.getElementById('checkBtn').onclick = checkPayment.bind(this);
        document.getElementById('closeBtn').onclick = () => {
            if (interval) clearInterval(interval);
            modal.remove();
            resolve(false);
        };
        
        // Auto check setiap 5 detik
        interval = setInterval(async () => {
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

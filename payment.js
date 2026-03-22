/* FILE: payment.js - LANGSUNG COPY PASTE */
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
            throw new Error("API Key Pakasir belum diisi");
        }
        
        const response = await fetch(`${this.pakasirEndpoint}/create-payment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                amount: amount,
                order_id: orderId,
                customer_name: customerName,
                payment_method: "QRIS",
                slug: slug
            })
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            return {
                qrCode: data.qr_code_url,
                paymentId: data.payment_id,
                expiryTime: data.expiry_time
            };
        } else {
            throw new Error(data.message || 'Gagal');
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
        console.log("NOTIF:", message);
    }
    
    async processPayment(product, userData) {
        return new Promise(async (resolve, reject) => {
            try {
                const orderId = Date.now() + "_" + Math.random().toString(36).substr(2, 6);
                
                const order = {
                    id: orderId,
                    productName: product.name,
                    amount: product.price,
                    userId: userData.username,
                    status: "pending",
                    date: new Date().toISOString()
                };
                
                await db.addOrder(order);
                
                const payment = await this.createQRISPayment(product.price, orderId, userData.username);
                
                const modal = document.createElement('div');
                modal.style.position = 'fixed';
                modal.style.top = '0';
                modal.style.left = '0';
                modal.style.width = '100%';
                modal.style.height = '100%';
                modal.style.background = 'rgba(0,0,0,0.9)';
                modal.style.display = 'flex';
                modal.style.justifyContent = 'center';
                modal.style.alignItems = 'center';
                modal.style.zIndex = '9999';
                
                modal.innerHTML = `
                    <div style="background: #1a1a2e; padding: 30px; border-radius: 20px; text-align: center; max-width: 400px;">
                        <h2>QRIS Payment</h2>
                        <img src="${payment.qrCode}" style="width: 250px; margin: 20px 0;">
                        <p style="font-size: 24px; color: #00ff00;">Rp ${product.price.toLocaleString()}</p>
                        <p>Order ID: ${orderId}</p>
                        <button id="checkBtn" style="margin: 10px; padding: 10px 20px; background: #00ff00; border: none; border-radius: 5px; cursor: pointer;">Cek Status</button>
                        <button id="closeBtn" style="margin: 10px; padding: 10px 20px; background: red; border: none; border-radius: 5px; cursor: pointer;">Tutup</button>
                        <p id="statusMsg"></p>
                    </div>
                `;
                
                document.body.appendChild(modal);
                
                let interval = setInterval(async () => {
                    try {
                        const paid = await this.checkPaymentStatus(payment.paymentId);
                        if (paid) {
                            clearInterval(interval);
                            modal.remove();
                            await db.updateOrder(order.id, { status: "paid" });
                            alert("Pembayaran berhasil!");
                            resolve(true);
                        }
                    } catch(e) {
                        console.log(e);
                    }
                }, 5000);
                
                document.getElementById('checkBtn').onclick = async () => {
                    const paid = await this.checkPaymentStatus(payment.paymentId);
                    if (paid) {
                        clearInterval(interval);
                        modal.remove();
                        await db.updateOrder(order.id, { status: "paid" });
                        alert("Pembayaran berhasil!");
                        resolve(true);
                    } else {
                        document.getElementById('statusMsg').innerHTML = 'Belum terbayar, coba lagi nanti';
                    }
                };
                
                document.getElementById('closeBtn').onclick = () => {
                    clearInterval(interval);
                    modal.remove();
                    resolve(false);
                };
                
            } catch(error) {
                alert("Error: " + error.message);
                reject(error);
            }
        });
    }
}

const paymentSystem = new PaymentSystem();

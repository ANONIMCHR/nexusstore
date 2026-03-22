/* FILE: api.js */
class PterodactylAPI {
    constructor() {
        this.baseURL = null;
        this.apiKey = null;
        this.clientKey = null;
    }
    
    async init() {
        this.baseURL = await db.getConfig('pterodactyl_url');
        this.apiKey = await db.getConfig('pterodactyl_api_key');
        this.clientKey = await db.getConfig('pterodactyl_client_key');
        
        if (!this.baseURL || !this.apiKey) {
            console.warn("Pterodactyl config not set");
        }
    }
    
    // Create new server for user
    async createServer(username, password, email) {
        await this.init();
        
        if (!this.baseURL || !this.apiKey) {
            throw new Error("Pterodactyl configuration not found. Please configure in admin panel.");
        }
        
        const serverData = {
            name: `Panel-${username}`,
            user: username,
            email: email,
            password: password,
            nest: 1,
            egg: 1,
            docker_image: "ghcr.io/pterodactyl/yolks:java_17",
            startup: "java -Xms128M -Xmx1024M -jar server.jar",
            limits: {
                memory: 1024,
                swap: 0,
                disk: 5120,
                io: 500,
                cpu: 100
            },
            feature_limits: {
                databases: 2,
                allocations: 3,
                backups: 4
            },
            environment: {
                SERVER_JARFILE: "server.jar",
                VERSION: "latest"
            }
        };
        
        try {
            const response = await fetch(`${this.baseURL}/api/application/servers`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(serverData)
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.errors?.[0]?.detail || `API Error: ${response.status}`);
            }
            
            const data = await response.json();
            
            return {
                success: true,
                serverId: data.attributes.id,
                serverIdentifier: data.attributes.identifier,
                panelUrl: `${this.baseURL}/server/${data.attributes.identifier}`,
                credentials: { username, password },
                status: data.attributes.status
            };
        } catch (error) {
            console.error("Pterodactyl create server error:", error);
            throw error;
        }
    }
    
    // Create admin user
    async createAdminUser(username, password, email) {
        await this.init();
        
        if (!this.baseURL || !this.apiKey) {
            throw new Error("Pterodactyl configuration not found. Please configure in admin panel.");
        }
        
        const userData = {
            username: username,
            email: email,
            password: password,
            root_admin: true,
            language: "en"
        };
        
        try {
            const response = await fetch(`${this.baseURL}/api/application/users`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(userData)
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.errors?.[0]?.detail || `API Error: ${response.status}`);
            }
            
            const data = await response.json();
            
            return {
                success: true,
                userId: data.attributes.id,
                panelUrl: this.baseURL,
                credentials: { username, password, role: "admin" },
                email: email
            };
        } catch (error) {
            console.error("Pterodactyl create admin error:", error);
            throw error;
        }
    }
    
    // Get server status
    async getServerStatus(serverId) {
        await this.init();
        
        if (!this.baseURL || !this.apiKey) {
            return {
                status: "unknown",
                cpu: 0,
                memory: 0,
                disk: 0,
                isOnline: false
            };
        }
        
        try {
            const response = await fetch(`${this.baseURL}/api/application/servers/${serverId}`, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Accept': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                return {
                    status: data.attributes.status || "running",
                    cpu: data.attributes.cpu || 0,
                    memory: data.attributes.memory || 0,
                    disk: data.attributes.disk || 0,
                    isOnline: data.attributes.status === "running",
                    lastUsed: data.attributes.last_used_at
                };
            } else {
                return {
                    status: "unknown",
                    cpu: 0,
                    memory: 0,
                    disk: 0,
                    isOnline: false,
                    error: `HTTP ${response.status}`
                };
            }
        } catch (error) {
            console.error("Server status error:", error);
            return {
                status: "error",
                cpu: 0,
                memory: 0,
                disk: 0,
                isOnline: false,
                error: error.message
            };
        }
    }
    
    // Start server
    async startServer(serverId) {
        await this.init();
        
        try {
            const response = await fetch(`${this.baseURL}/api/client/servers/${serverId}/power`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.clientKey}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ signal: "start" })
            });
            
            if (!response.ok) {
                throw new Error(`Failed to start server: ${response.status}`);
            }
            
            return { success: true, message: "Server started" };
        } catch (error) {
            console.error("Start server error:", error);
            throw error;
        }
    }
    
    // Stop server
    async stopServer(serverId) {
        await this.init();
        
        try {
            const response = await fetch(`${this.baseURL}/api/client/servers/${serverId}/power`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.clientKey}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ signal: "stop" })
            });
            
            if (!response.ok) {
                throw new Error(`Failed to stop server: ${response.status}`);
            }
            
            return { success: true, message: "Server stopped" };
        } catch (error) {
            console.error("Stop server error:", error);
            throw error;
        }
    }
    
    // Restart server
    async restartServer(serverId) {
        await this.init();
        
        try {
            const response = await fetch(`${this.baseURL}/api/client/servers/${serverId}/power`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.clientKey}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ signal: "restart" })
            });
            
            if (!response.ok) {
                throw new Error(`Failed to restart server: ${response.status}`);
            }
            
            return { success: true, message: "Server restarting" };
        } catch (error) {
            console.error("Restart server error:", error);
            throw error;
        }
    }
    
    // Get server resources (CPU, Memory, Disk usage)
    async getServerResources(serverId) {
        await this.init();
        
        try {
            const response = await fetch(`${this.baseURL}/api/client/servers/${serverId}/resources`, {
                headers: {
                    'Authorization': `Bearer ${this.clientKey}`,
                    'Accept': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                return {
                    cpu: data.attributes.cpu_percent || 0,
                    memory: {
                        current: data.attributes.memory_bytes || 0,
                        limit: data.attributes.memory_limit_bytes || 0
                    },
                    disk: {
                        current: data.attributes.disk_bytes || 0,
                        limit: data.attributes.disk_limit_bytes || 0
                    },
                    uptime: data.attributes.uptime || 0
                };
            } else {
                return {
                    cpu: 0,
                    memory: { current: 0, limit: 0 },
                    disk: { current: 0, limit: 0 },
                    uptime: 0
                };
            }
        } catch (error) {
            console.error("Get resources error:", error);
            return null;
        }
    }
    
    // Get all servers (for admin)
    async getAllServers() {
        await this.init();
        
        try {
            const response = await fetch(`${this.baseURL}/api/application/servers`, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Accept': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                return data.data.map(server => ({
                    id: server.attributes.id,
                    identifier: server.attributes.identifier,
                    name: server.attributes.name,
                    status: server.attributes.status,
                    user: server.attributes.user,
                    createdAt: server.attributes.created_at
                }));
            } else {
                return [];
            }
        } catch (error) {
            console.error("Get all servers error:", error);
            return [];
        }
    }
    
    // Delete server
    async deleteServer(serverId) {
        await this.init();
        
        try {
            const response = await fetch(`${this.baseURL}/api/application/servers/${serverId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Failed to delete server: ${response.status}`);
            }
            
            return { success: true, message: "Server deleted" };
        } catch (error) {
            console.error("Delete server error:", error);
            throw error;
        }
    }
    
    // Get server details by identifier
    async getServerByIdentifier(identifier) {
        await this.init();
        
        try {
            const response = await fetch(`${this.baseURL}/api/client/servers/${identifier}`, {
                headers: {
                    'Authorization': `Bearer ${this.clientKey}`,
                    'Accept': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                return {
                    id: data.attributes.id,
                    identifier: data.attributes.identifier,
                    name: data.attributes.name,
                    status: data.attributes.status,
                    limits: data.attributes.limits,
                    isOnline: data.attributes.status === "running"
                };
            } else {
                return null;
            }
        } catch (error) {
            console.error("Get server error:", error);
            return null;
        }
    }
    
    // Test connection to Pterodactyl API
    async testConnection() {
        await this.init();
        
        if (!this.baseURL || !this.apiKey) {
            return {
                success: false,
                message: "Pterodactyl configuration not set"
            };
        }
        
        try {
            const response = await fetch(`${this.baseURL}/api/application/users`, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Accept': 'application/json'
                }
            });
            
            if (response.ok) {
                return {
                    success: true,
                    message: "Connection successful",
                    status: response.status
                };
            } else {
                return {
                    success: false,
                    message: `Connection failed: ${response.status}`,
                    status: response.status
                };
            }
        } catch (error) {
            return {
                success: false,
                message: `Connection error: ${error.message}`,
                error: error.message
            };
        }
    }
}

const pterodactyl = new PterodactylAPI();

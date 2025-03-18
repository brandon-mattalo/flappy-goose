class HighScoreManager {
    constructor() {
        this.dbName = 'FlappyGooseDB';
        this.dbVersion = 3;
        this.storeName = 'highScores';
        this.maxScores = 50;
        this.db = null;
        this.cachedLocation = null;
        this.initDB();
        this.requestInitialLocation();
    }

    async requestInitialLocation() {
        try {
            // First check if geolocation is supported
            if (!navigator.geolocation) {
                throw new Error('Geolocation is not supported by your browser');
            }

            // Check if we already have permission
            const permissionStatus = await navigator.permissions.query({ name: 'geolocation' });
            
            if (permissionStatus.state === 'denied') {
                throw new Error('Location permission was denied');
            }

            // If permission is granted or prompt, try to get location
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: false, // Set to false for faster response
                    timeout: 10000, // Increased timeout for mobile
                    maximumAge: 300000 // Cache location for 5 minutes
                });
            });

            const { latitude, longitude } = position.coords;
            const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}`);
            
            if (!response.ok) {
                throw new Error('Failed to fetch location data');
            }

            const data = await response.json();
            this.cachedLocation = {
                country: data.countryCode,
                countryName: data.countryName
            };
        } catch (error) {
            console.log('Location error:', error.message);
            // Set default location and continue
            this.cachedLocation = {
                country: 'XX',
                countryName: 'Unknown'
            };
        }
    }

    async initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (db.objectStoreNames.contains(this.storeName)) {
                    db.deleteObjectStore(this.storeName);
                }
                const store = db.createObjectStore(this.storeName, { keyPath: 'id', autoIncrement: true });
                store.createIndex('score', 'score', { unique: false });
                store.createIndex('country', 'country', { unique: false });
                store.createIndex('placement', 'placement', { unique: false });
            };
        });
    }

    async getLocation() {
        // Return cached location if available
        if (this.cachedLocation) {
            return this.cachedLocation;
        }

        // If not cached yet, wait for the initial request
        try {
            await new Promise((resolve) => {
                const checkCache = () => {
                    if (this.cachedLocation) {
                        resolve();
                    } else {
                        setTimeout(checkCache, 100);
                    }
                };
                checkCache();
            });
            return this.cachedLocation;
        } catch (error) {
            console.error('Error getting location:', error);
            return {
                country: 'XX',
                countryName: 'Unknown'
            };
        }
    }

    async getPlacement(newScore) {
        const scores = await this.getScores();
        const placement = scores.findIndex(score => newScore > score.score) + 1;
        return placement === 0 ? scores.length + 1 : placement;
    }

    async addScore(name, score) {
        const placement = await this.getPlacement(score);
        if (placement > this.maxScores) {
            return { added: false, placement: null };
        }

        const location = await this.getLocation();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            
            const scoreEntry = {
                name: name,
                score: score,
                date: new Date().toISOString(),
                country: location.country,
                countryName: location.countryName,
                placement: placement
            };

            const request = store.add(scoreEntry);

            request.onsuccess = async () => {
                const scores = await this.getScores();
                scores.sort((a, b) => b.score - a.score);
                
                if (scores.length > this.maxScores) {
                    const deletePromises = scores.slice(this.maxScores).map(score => 
                        this.deleteScore(score.id)
                    );
                    await Promise.all(deletePromises);
                }
                
                resolve({ added: true, placement: placement });
            };
            request.onerror = () => reject(request.error);
        });
    }

    async getScores() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.getAll();

            request.onsuccess = () => {
                const scores = request.result;
                scores.sort((a, b) => b.score - a.score);
                resolve(scores);
            };
            request.onerror = () => reject(request.error);
        });
    }

    async deleteScore(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async isHighScore(score) {
        const scores = await this.getScores();
        const placement = await this.getPlacement(score);
        return { isHighScore: placement <= this.maxScores, placement: placement };
    }
} 
class HighScoreManager {
    constructor() {
        this.maxScores = 50;
        this.cachedLocation = null;
        // Public Firebase config - restricted to specific domains and operations
        this.firebaseConfig = {
            apiKey: "AIzaSyApecnHgYs22T-r4g4YrYzLn_un9IvjPUo",
            authDomain: "flappy-goose-c2e64.firebaseapp.com",
            projectId: "flappy-goose-c2e64",
            storageBucket: "flappy-goose-c2e64.firebasestorage.app",
            messagingSenderId: "111182419038",
            appId: "1:111182419038:web:ac2294fb0eedd1d4e5d0cf",
            measurementId: "G-FELC5S2655",
            databaseURL: "https://flappy-goose-c2e64-default-rtdb.firebaseio.com"
        };
        this.location = null;
        this.country = null;
        this.countryName = null;
        this.lastAddedScore = null;
        this.initFirebase();
        this.requestInitialLocation();
    }

    async initFirebase() {
        try {
            // Initialize with the built-in config
            if (!firebase.apps.length) {
                firebase.initializeApp(this.firebaseConfig);
            }
            
            this.database = firebase.database();
            
            // Set up security rules
            const scoresRef = this.database.ref('scores');
            
            // Add some basic validation
            scoresRef.on('child_added', (snapshot) => {
                const score = snapshot.val();
                if (!this.isValidScore(score)) {
                    console.warn('Invalid score detected:', score);
                    // Don't try to remove invalid scores - let Firebase Rules handle this
                    return;
                }
            });

            return true;
        } catch (error) {
            console.error('Error initializing Firebase:', error);
            return false;
        }
    }

    isValidScore(score) {
        // Basic validation rules
        if (!score) {
            console.warn('Score object is null or undefined');
            return false;
        }
        if (typeof score.score !== 'number') {
            console.warn('Score value is not a number:', score.score);
            return false;
        }
        if (score.score < 0 || score.score > 999999) {
            console.warn('Score out of valid range:', score.score);
            return false;
        }
        if (typeof score.name !== 'string') {
            console.warn('Name is not a string:', score.name);
            return false;
        }
        if (score.name.length < 1 || score.name.length > 20) {
            console.warn('Name length invalid:', score.name.length);
            return false;
        }
        if (typeof score.date !== 'number') {
            console.warn('Date is not a number:', score.date);
            return false;
        }
        if (!score.country || typeof score.country !== 'string') {
            console.warn('Country is invalid:', score.country);
            return false;
        }
        if (!score.countryName || typeof score.countryName !== 'string') {
            console.warn('Country name is invalid:', score.countryName);
            return false;
        }
        
        return true;
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
            console.log('Got coordinates:', latitude, longitude);
            
            const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`);
            
            if (!response.ok) {
                throw new Error('Failed to fetch location data');
            }

            const data = await response.json();
            console.log('Location data:', data);
            
            // Set both cached and instance variables
            this.cachedLocation = {
                country: data.countryCode,
                countryName: data.countryName
            };
            
            // Set instance variables for immediate use
            this.country = data.countryCode;
            this.countryName = data.countryName;
            
            console.log('Location set:', this.country, this.countryName);
        } catch (error) {
            console.log('Location error:', error.message);
            // Set default location
            this.cachedLocation = {
                country: 'XX',
                countryName: 'Unknown'
            };
            this.country = 'XX';
            this.countryName = 'Unknown';
        }
    }

    async getLocation() {
        if (this.cachedLocation) {
            // Update instance variables from cache
            this.country = this.cachedLocation.country;
            this.countryName = this.cachedLocation.countryName;
            return this.cachedLocation;
        }

        try {
            await new Promise((resolve) => {
                const checkCache = () => {
                    if (this.cachedLocation) {
                        // Update instance variables from cache
                        this.country = this.cachedLocation.country;
                        this.countryName = this.cachedLocation.countryName;
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
            this.country = 'XX';
            this.countryName = 'Unknown';
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
        try {
            if (!this.database) {
                console.error('Database not initialized');
                return false;
            }

            const scoresRef = this.database.ref('scores');
            const newScoreRef = scoresRef.push();
            
            const scoreData = {
                name: name,
                score: score,
                date: Date.now(),
                country: this.country || 'XX',
                countryName: this.countryName || 'Unknown'
            };

            console.log('Adding score:', scoreData);
            
            await newScoreRef.set(scoreData);
            this.lastAddedScore = newScoreRef.key;
            console.log('Score added successfully with key:', this.lastAddedScore);
            
            return true;
        } catch (error) {
            console.error('Error adding score:', error);
            return false;
        }
    }

    async getHighScores() {
        try {
            if (!this.database) {
                console.error('Database not initialized');
                return { scores: [], lastAddedIndex: -1 };
            }

            console.log('Fetching high scores...');
            const scoresRef = this.database.ref('scores');
            const snapshot = await scoresRef.once('value');
            const scores = [];
            let lastAddedIndex = -1;

            snapshot.forEach((childSnapshot) => {
                const score = childSnapshot.val();
                score.id = childSnapshot.key;
                scores.push(score);
            });

            console.log('Retrieved scores:', scores.length);

            // Sort by score (descending)
            scores.sort((a, b) => b.score - a.score);

            // Find index of last added score
            if (this.lastAddedScore) {
                lastAddedIndex = scores.findIndex(score => score.id === this.lastAddedScore);
                console.log('Last added score index:', lastAddedIndex);
            }

            return { scores, lastAddedIndex };
        } catch (error) {
            console.error('Error getting high scores:', error);
            return { scores: [], lastAddedIndex: -1 };
        }
    }

    async getScores() {
        try {
            const snapshot = await this.database.ref('scores').once('value');
            const scores = [];
            
            snapshot.forEach((childSnapshot) => {
                scores.push({
                    id: childSnapshot.key,
                    ...childSnapshot.val()
                });
            });
            
            // Sort by score (highest first)
            scores.sort((a, b) => b.score - a.score);
            return scores;
        } catch (error) {
            console.error('Error getting scores:', error);
            return [];
        }
    }

    async isHighScore(score) {
        const scores = await this.getScores();
        const placement = await this.getPlacement(score);
        return { isHighScore: placement <= this.maxScores, placement: placement };
    }

    async purgeDatabase() {
        try {
            console.log('Attempting to purge database...');
            const scoresRef = this.database.ref('scores');
            await scoresRef.remove();
            console.log('Database purged successfully');
            return true;
        } catch (error) {
            console.error('Error purging database:', error);
            return false;
        }
    }
} 
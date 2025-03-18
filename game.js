class FlappyGoose {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = 400;
        this.canvas.height = 600;
        
        // Game state
        this.isPlaying = false;
        this.score = 0;
        this.gameOver = false;
        this.baseSpeed = 2;
        this.speedMultiplier = 1;
        this.scoreSubmitted = false;
        
        // Space warp effect
        this.stars = [];
        this.createStars();
        
        // Goose properties
        this.goose = {
            x: 100,
            y: this.canvas.height / 2,
            width: 48,
            height: 48,
            velocity: 0,
            gravity: 0.22,    // Reduced from 0.25 for more gradual falling
            jump: -5.0,      // Increased from -4.6 for higher jumps
            rotation: 0,
            wingAngle: 0,
            wingSpeed: 0.15
        };
        
        // Maple trees (obstacles)
        this.trees = [];
        this.treeWidth = 60;
        this.treeGap = 200;
        this.treeSpeed = this.baseSpeed;
        
        // Flock explosion properties
        this.flockGeese = [];
        this.lastFlockScore = 0;
        
        // Initialize high score manager
        this.highScoreManager = new HighScoreManager();
        
        // Goose color
        this.gooseColor = '#694d3c'; // Default brown color
        
        // Initialize goose selection
        this.initializeGooseSelection();
        
        this.canRestart = true;
        
        // Event listeners
        document.addEventListener('keydown', (e) => {
            // Prevent spacebar from triggering when inputting name
            if (document.activeElement.id === 'playerName') {
                return;
            }
            
            if (e.code === 'Space') {
                e.preventDefault(); // Prevent page scroll
                if (!this.isPlaying && this.canRestart) {
                    this.start();
                } else if (this.isPlaying) {
                    this.jump();
                }
            }
        });
        
        // Add click/touch support
        this.canvas.addEventListener('click', (e) => {
            if (!this.isPlaying && this.canRestart) {
                this.start();
            } else if (this.isPlaying) {
                this.jump();
            }
        });
        
        // Add touch support for mobile
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault(); // Prevent scrolling
            if (!this.isPlaying && this.canRestart) {
                this.start();
            } else if (this.isPlaying) {
                this.jump();
            }
        });
        
        // Fix high scores button event listeners
        const highScoresButtons = document.querySelectorAll('#highScoresButton');
        highScoresButtons.forEach(button => {
            button.addEventListener('click', () => this.showHighScores());
        });
        
        document.getElementById('startButton').addEventListener('click', () => this.start());
        document.getElementById('restartButton').addEventListener('click', () => this.restart());
        document.getElementById('backButton').addEventListener('click', () => this.hideHighScores());
        document.getElementById('submitScore').addEventListener('click', () => this.submitHighScore());
        document.getElementById('playerName').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.submitHighScore();
        });
        document.getElementById('changeGooseButton').addEventListener('click', () => this.showGooseSelection());
        
        // Add event listeners for high score controls
        document.getElementById('refreshScores').addEventListener('click', () => this.refreshHighScores());
        document.getElementById('sortScores').addEventListener('change', (e) => this.sortHighScores(e.target.value));
        
        // Add event listener for purge button (hidden by default)
        const purgeButton = document.getElementById('purgeScores');
        purgeButton.addEventListener('click', async () => {
            if (confirm('Are you sure you want to purge all high scores? This cannot be undone!')) {
                const success = await this.highScoreManager.purgeDatabase();
                if (success) {
                    alert('High scores purged successfully!');
                    this.showHighScores();
                } else {
                    alert('Failed to purge high scores. Please try again.');
                }
            }
        });

        // Show purge button with Ctrl+Shift+P
        document.addEventListener('keydown', (event) => {
            if (event.ctrlKey && event.shiftKey && event.key === 'P') {
                purgeButton.style.display = purgeButton.style.display === 'none' ? 'flex' : 'none';
            }
        });
        
        // Store high scores for sorting
        this.currentScores = [];
        this.currentSortMethod = 'score';

        // Visual effects
        this.visualEffects = {
            stars: [],
            fireworks: [],
            mapleLeaves: [],
            lastFireworkTime: 0,
            backgroundHue: 0,
            pulseValue: 0,
            pulseDirection: 1
        };

        // Create initial stars
        this.createStars();

        // Parallax mountains
        this.mountains = {
            layers: [
                { mountains: [], speed: 0.2, color: '#4B6584', y: this.canvas.height * 0.75, baseColor: '#4B6584' },
                { mountains: [], speed: 0.4, color: '#2C3A47', y: this.canvas.height * 0.8, baseColor: '#2C3A47' },
                { mountains: [], speed: 0.6, color: '#1B2631', y: this.canvas.height * 0.85, baseColor: '#1B2631' }
            ]
        };

        // Initialize mountains
        this.initializeMountains();

        // Object types for mountains
        this.mountainObjects = [
            { type: 'cabin', width: 40, height: 40, color: '#8B4513', rarity: 0.3 },
            { type: 'snowman', width: 30, height: 40, color: '#FFFFFF', rarity: 0.4 },
            { type: 'monster', width: 50, height: 50, color: '#556B2F', rarity: 0.2 },
            { type: 'godzilla', width: 80, height: 100, color: '#2F4F4F', rarity: 0.1 }
        ];
    }

    createStars() {
        // Create initial stars for the space warp effect
        for (let i = 0; i < 100; i++) {
            this.stars.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                size: Math.random() * 2 + 1,
                speed: Math.random() * 2 + 1  // Reduced star speed
            });
        }
    }

    updateStars() {
        // Update star positions for warp effect
        for (let star of this.stars) {
            star.x -= star.speed * this.speedMultiplier;
            if (star.x < 0) {
                star.x = this.canvas.width;
                star.y = Math.random() * this.canvas.height;
            }
        }
    }

    drawStars() {
        for (let star of this.stars) {
            if (star.isMapleLeaf) {
                // Draw maple leaf
                this.drawMapleLeaf(star.x, star.y, star.size, star.rotation);
            } else {
                // Draw star/snow - always white
                this.ctx.beginPath();
                this.ctx.strokeStyle = '#FFFFFF';
                this.ctx.lineWidth = star.size;
                this.ctx.moveTo(star.x, star.y);
                this.ctx.lineTo(star.x - (star.speed * this.speedMultiplier * 2), star.y);
                this.ctx.stroke();
            }
        }
    }
    
    start() {
        // Hide all screens
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('visible');
            screen.classList.add('hidden');
        });
        
        // Reset all game state
        this.isPlaying = true;
        this.gameOver = false;
        this.score = 0;
        this.scoreSubmitted = false;
        this.trees = [];
        
        // Reset speed values
        this.speedMultiplier = 1;
        this.treeSpeed = this.baseSpeed;
        
        // Reset goose position and velocity
        this.goose.y = this.canvas.height / 2;
        this.goose.velocity = 0;
        this.goose.rotation = 0;
        
        // Reset flock
        this.flockGeese = [];
        this.lastFlockScore = 0;

        // Make canvas active
        this.canvas.classList.add('active');
        
        // Start game loop
        requestAnimationFrame(() => this.update());
    }
    
    restart() {
        this.start();
    }
    
    jump() {
        if (!this.gameOver) {
            this.goose.velocity = this.goose.jump;
            this.goose.rotation = -30;
            if (!this.isPlaying) {
                this.isPlaying = true;
            }
        }
    }
    
    createTree() {
        const minGapY = 100;
        const maxGapY = this.canvas.height - this.treeGap - 100;
        const gapY = Math.random() * (maxGapY - minGapY) + minGapY;
        this.trees.push({
            x: this.canvas.width,
            gapY: gapY,
            passed: false
        });
    }
    
    createFlockExplosion() {
        const numGeese = 8;
        const rainbowColors = [
            '#FF0000', // Red
            '#FF7F00', // Orange
            '#FFFF00', // Yellow
            '#00FF00', // Green
            '#0000FF', // Blue
            '#4B0082', // Indigo
            '#9400D3', // Violet
            '#FF69B4'  // Hot Pink
        ];
        
        for (let i = 0; i < numGeese; i++) {
            const angle = (i / numGeese) * Math.PI * 2;
            const speed = 5;
            this.flockGeese.push({
                x: this.goose.x,
                y: this.goose.y,
                velocityX: Math.cos(angle) * speed,
                velocityY: Math.sin(angle) * speed,
                rotation: Math.atan2(Math.sin(angle), Math.cos(angle)) * 180 / Math.PI,
                wingAngle: 0,
                wingSpeed: 0.3,
                color: rainbowColors[i] // Assign rainbow color to each goose
            });
        }
    }

    updateFlockGeese() {
        for (let i = this.flockGeese.length - 1; i >= 0; i--) {
            const goose = this.flockGeese[i];
            goose.x += goose.velocityX;
            goose.y += goose.velocityY;
            goose.wingAngle += goose.wingSpeed;
            
            // Remove geese that go off screen
            if (goose.x < -50 || goose.x > this.canvas.width + 50 || 
                goose.y < -50 || goose.y > this.canvas.height + 50) {
                this.flockGeese.splice(i, 1);
            }
        }
    }

    initializeGooseSelection() {
        const gooseSelection = document.getElementById('gooseSelection');
        const options = gooseSelection.querySelectorAll('.goose-option');
        const previewContainer = gooseSelection.querySelector('.goose-preview');
        
        // Clear any existing canvases
        previewContainer.innerHTML = '';
        options.forEach(option => {
            option.innerHTML = '';
        });
        
        // Create preview canvas
        const previewCanvas = document.createElement('canvas');
        previewCanvas.width = 140;
        previewCanvas.height = 140;
        previewContainer.appendChild(previewCanvas);
        
        // Create option canvases and draw initial geese
        options.forEach(option => {
            const canvas = document.createElement('canvas');
            canvas.width = 50;
            canvas.height = 50;
            option.appendChild(canvas);
            
            // Draw initial goose
            this.previewGoose(option.dataset.color, canvas, 0);
            
            option.addEventListener('click', () => {
                options.forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');
                this.gooseColor = option.dataset.color;
                this.previewGoose(option.dataset.color, previewCanvas, this.goose.wingAngle);
            });
        });

        // Clear any existing animation
        if (this.selectionAnimationId) {
            clearInterval(this.selectionAnimationId);
        }

        // Animate wings in selection screen
        this.selectionAnimationId = setInterval(() => {
            this.goose.wingAngle += 0.1; // Slower wing flapping
            this.previewGoose(this.gooseColor, previewCanvas, this.goose.wingAngle);
            options.forEach(option => {
                this.previewGoose(option.dataset.color, option.querySelector('canvas'), this.goose.wingAngle);
            });
        }, 50);

        // Show initial preview
        this.previewGoose(this.gooseColor, previewCanvas, this.goose.wingAngle);
    }

    showGooseSelection() {
        // Clear any existing animation interval
        if (this.selectionAnimationId) {
            clearInterval(this.selectionAnimationId);
        }
        
        // Hide all screens
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('visible');
            screen.classList.add('hidden');
        });
        
        // Show start screen
        const startScreen = document.getElementById('startScreen');
        startScreen.classList.remove('hidden');
        startScreen.classList.add('visible');
        
        // Initialize goose selection
        this.initializeGooseSelection();
    }

    previewGoose(color, canvas, wingAngle = 0) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Calculate scale based on canvas size to make goose fill the box
        const gooseWidth = 14; // Width of goose in pixels
        const gooseHeight = 9; // Height of goose in pixels
        const scale = Math.min(canvas.width / (gooseWidth + 4), canvas.height / (gooseHeight + 4)) * 0.8; // Add padding and use 80% of space
        const pixelSize = scale;
        
        // Calculate centering offsets
        const offsetX = (canvas.width - (gooseWidth * scale)) / 2;
        const offsetY = (canvas.height - (gooseHeight * scale)) / 2;

        const blackColor = '#000000';
        const bodyColor = color;
        const whiteColor = '#ffffff';

        const drawPixel = (x, y, color) => {
            ctx.fillStyle = color;
            ctx.fillRect(
                x * pixelSize + offsetX,
                y * pixelSize + offsetY,
                pixelSize,
                pixelSize
            );
        };

        // Body
        for (let y = 0; y < 6; y++) {
            for (let x = 0; x < 10; x++) {
                drawPixel(x + 2, y + 2, bodyColor);
            }
        }

        // Black neck
        for (let y = 0; y < 3; y++) {
            drawPixel(10, y, blackColor);
            drawPixel(11, y, blackColor);
        }

        // Black head
        drawPixel(12, 0, blackColor);
        drawPixel(13, 0, blackColor);
        drawPixel(14, 0, blackColor);
        drawPixel(12, 1, blackColor);
        drawPixel(13, 1, blackColor);
        drawPixel(14, 1, blackColor);

        // White cheek patch
        drawPixel(12, 2, whiteColor);
        drawPixel(13, 2, whiteColor);
        drawPixel(14, 2, whiteColor);

        // Animated wings
        const wingOffset = Math.sin(wingAngle) * 0.5; // Reduced wing movement
        for (let y = 0; y < 3; y++) {
            drawPixel(4 + wingOffset, y + 3, blackColor);
            drawPixel(5 + wingOffset, y + 3, blackColor);
            drawPixel(6 + wingOffset, y + 3, blackColor);
        }

        // White chest patch
        drawPixel(8, 6, whiteColor);
        drawPixel(9, 6, whiteColor);
        drawPixel(10, 6, whiteColor);
        drawPixel(8, 7, whiteColor);
        drawPixel(9, 7, whiteColor);

        // Tail feathers
        drawPixel(1, 4, blackColor);
        drawPixel(2, 4, blackColor);
        drawPixel(1, 5, blackColor);
        drawPixel(2, 5, blackColor);
    }

    drawFlockGoose(x, y, rotation, wingAngle, color) {
        this.ctx.save();
        this.ctx.translate(x + this.goose.width / 2, y + this.goose.height / 2);
        this.ctx.rotate(rotation * Math.PI / 180);

        const scale = 3;
        const pixelSize = 1 * scale;

        const blackColor = '#000000';
        const bodyColor = color || this.gooseColor; // Use selected goose color
        const whiteColor = '#ffffff';

        const drawPixel = (x, y, color) => {
            this.ctx.fillStyle = color;
            this.ctx.fillRect(
                x * pixelSize - this.goose.width / 2,
                y * pixelSize - this.goose.height / 2,
                pixelSize,
                pixelSize
            );
        };

        // Body (rainbow color)
        for (let y = 3; y < 9; y++) {
            for (let x = 2; x < 12; x++) {
                drawPixel(x, y, bodyColor);
            }
        }

        // Black neck
        for (let y = 1; y < 4; y++) {
            drawPixel(10, y, blackColor);
            drawPixel(11, y, blackColor);
        }

        // Black head
        drawPixel(12, 1, blackColor);
        drawPixel(13, 1, blackColor);
        drawPixel(14, 1, blackColor);
        drawPixel(12, 2, blackColor);
        drawPixel(13, 2, blackColor);
        drawPixel(14, 2, blackColor);

        // White cheek patch
        drawPixel(13, 3, whiteColor);
        drawPixel(14, 3, whiteColor);
        drawPixel(12, 3, whiteColor);

        // Animated wings
        const wingOffset = Math.sin(wingAngle) * 2;
        for (let y = 4; y < 7; y++) {
            drawPixel(4 + wingOffset, y, blackColor);
            drawPixel(5 + wingOffset, y, blackColor);
            drawPixel(6 + wingOffset, y, blackColor);
        }

        // White chest patch
        drawPixel(8, 7, whiteColor);
        drawPixel(9, 7, whiteColor);
        drawPixel(10, 7, whiteColor);
        drawPixel(8, 8, whiteColor);
        drawPixel(9, 8, whiteColor);

        // Tail feathers
        drawPixel(1, 5, blackColor);
        drawPixel(2, 5, blackColor);
        drawPixel(1, 6, blackColor);
        drawPixel(2, 6, blackColor);

        this.ctx.restore();
    }

    drawGoose() {
        // Update wing animation
        this.goose.wingAngle += this.goose.wingSpeed;
        this.drawFlockGoose(this.goose.x, this.goose.y, this.goose.rotation, this.goose.wingAngle);
    }
    
    drawTree(x, y, height, isTop = false) {
        if (isTop) {
            // Draw shorter top tree with gap at bottom
            const shortenedHeight = height - 60; // Leave space at bottom
            
            // Draw tree trunk at the top
            this.ctx.fillStyle = '#8B4513';
            this.ctx.fillRect(x + this.treeWidth / 3, y, this.treeWidth / 3, shortenedHeight);
            
            // Draw leaves pointing downward
            const leafColors = ['#FF0000', '#FF4500', '#FF6347'];
            let leafY = y + shortenedHeight; // Start from bottom of shortened trunk
            
            for (let i = 0; i < 3; i++) {
                this.ctx.fillStyle = leafColors[i];
                // Draw triangular shape pointing downward
                this.ctx.beginPath();
                this.ctx.moveTo(x, leafY);
                this.ctx.lineTo(x + this.treeWidth, leafY);
                this.ctx.lineTo(x + this.treeWidth / 2, leafY + 40);
                this.ctx.closePath();
                this.ctx.fill();
                leafY += 30;
            }
        } else {
            // Draw shorter bottom tree with gap at top
            const shortenedHeight = height - 60; // Leave space at top
            const adjustedY = y + 60; // Move tree down to create gap
            
            // Bottom tree trunk
            this.ctx.fillStyle = '#8B4513';
            this.ctx.fillRect(x + this.treeWidth / 3, adjustedY, this.treeWidth / 3, shortenedHeight);
            
            const leafColors = ['#FF0000', '#FF4500', '#FF6347'];
            let leafY = adjustedY;
            
            for (let i = 0; i < 3; i++) {
                this.ctx.fillStyle = leafColors[i];
                this.ctx.beginPath();
                this.ctx.moveTo(x, leafY);
                this.ctx.lineTo(x + this.treeWidth, leafY);
                this.ctx.lineTo(x + this.treeWidth / 2, leafY - 40);
                this.ctx.closePath();
                this.ctx.fill();
                leafY -= 30;
            }
        }
    }
    
    update() {
        if (this.isPlaying && !this.gameOver) {
            // Update speed based on score - increase 0.1x every 10 points
            this.speedMultiplier = 1 + Math.floor(this.score / 10) * 0.1;
            this.treeSpeed = this.baseSpeed * this.speedMultiplier;

            // Update mountains
            this.updateMountains();

            // Update stars with consistent movement
            this.updateStars();
            
            // Update goose physics
            this.goose.velocity += this.goose.gravity;
            this.goose.velocity = Math.min(this.goose.velocity, 6); // Reduced max fall speed
            this.goose.y += this.goose.velocity;
            
            // Smoother rotation
            if (this.goose.velocity < 0) {
                this.goose.rotation = -25; // Less steep upward rotation
            } else if (this.goose.rotation < 90) {
                this.goose.rotation += Math.min(4, this.goose.velocity * 1.5); // Slower rotation
            }
            
            // Create new trees
            if (this.trees.length === 0 || 
                this.trees[this.trees.length - 1].x < this.canvas.width - 250) {
                this.createTree();
            }
            
            // Update trees and check collisions
            for (let i = this.trees.length - 1; i >= 0; i--) {
                const tree = this.trees[i];
                tree.x -= this.treeSpeed;
                
                // Check collision
                if (this.checkCollision(tree)) {
                    this.gameOver = true;
                    break;
                }
                
                // Update score
                if (!tree.passed && tree.x < this.goose.x) {
                    tree.passed = true;
                    this.score++;
                }
                
                // Remove off-screen trees
                if (tree.x < -this.treeWidth) {
                    this.trees.splice(i, 1);
                }
            }
            
            // Check boundaries
            if (this.goose.y < 0 || this.goose.y + this.goose.height > this.canvas.height) {
                this.gameOver = true;
            }

            // Check for flock explosion
            if (this.score > 0 && this.score % 10 === 0 && this.score !== this.lastFlockScore) {
                this.createFlockExplosion();
                this.lastFlockScore = this.score;
            }

            // Update flock geese
            this.updateFlockGeese();

            // Check for score milestones
            if (this.score > 0 && this.score % 10 === 0) {
                // Create firework if we just hit a multiple of 10
                if (this.score !== this.visualEffects.lastFireworkTime) {
                    this.createFirework(this.score);
                    this.visualEffects.lastFireworkTime = this.score;
                }

                // Update visual effects based on new milestones
                if (this.score >= 10) {
                    this.stars.forEach(star => {
                        if (!star.color) {
                            star.color = `hsl(${Math.random() * 360}, 100%, 50%)`;
                        }
                    });
                }
                if (this.score >= 20) {
                    // Add maple leaves if not already present
                    if (!this.stars.some(star => star.isMapleLeaf)) {
                        for (let i = 0; i < 20; i++) {
                            this.stars.push({
                                x: Math.random() * this.canvas.width,
                                y: Math.random() * this.canvas.height,
                                size: Math.random() * 3 + 2,
                                speed: Math.random() * 3 + 2,
                                color: '#FF0000',
                                isMapleLeaf: true,
                                rotation: Math.random() * 360
                            });
                        }
                    }
                }
            }

            // Update background effects at new milestones
            if (this.score >= 30) {
                this.visualEffects.backgroundHue = (this.visualEffects.backgroundHue + 1) % 360;
            }
            if (this.score >= 40) {
                this.visualEffects.pulseValue += 0.05 * this.visualEffects.pulseDirection;
                if (this.visualEffects.pulseValue >= 1) {
                    this.visualEffects.pulseDirection = -1;
                } else if (this.visualEffects.pulseValue <= 0) {
                    this.visualEffects.pulseDirection = 1;
                }
            }

            // Update fireworks
            this.updateFireworks();
        }

        // Draw the game
        this.draw();

        // Request next frame if game is still running
        if (!this.gameOver && this.isPlaying) {
            requestAnimationFrame(() => this.update());
        } else if (this.gameOver) {
            this.handleGameOver();
        }
    }
    
    checkCollision(tree) {
        const collision = (
            this.goose.x + this.goose.width > tree.x &&
            this.goose.x < tree.x + this.treeWidth &&
            (this.goose.y < tree.gapY || 
             this.goose.y + this.goose.height > tree.gapY + this.treeGap)
        );
        
        if (collision) {
            this.gameOver = true;
        }
        
        return collision;
    }
    
    draw() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw background with effects
        if (this.score >= 30) {
            const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
            gradient.addColorStop(0, `hsl(${this.visualEffects.backgroundHue}, 60%, 70%)`);
            gradient.addColorStop(1, `hsl(${(this.visualEffects.backgroundHue + 60) % 360}, 60%, 70%)`);
            this.ctx.fillStyle = gradient;
        } else {
            const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
            const skyDarkness = Math.min(0.6, (this.speedMultiplier - 1) * 0.3);
            gradient.addColorStop(0, `rgb(${135 * (1-skyDarkness)}, ${206 * (1-skyDarkness)}, ${235 * (1-skyDarkness)})`);
            gradient.addColorStop(1, `rgb(${224 * (1-skyDarkness)}, ${246 * (1-skyDarkness)}, ${255 * (1-skyDarkness)})`);
            this.ctx.fillStyle = gradient;
        }
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw stars
        this.drawStars();

        // Draw mountains and their objects
        this.drawMountains();

        // Draw fireworks
        this.drawFireworks();
        
        // Draw trees
        this.trees.forEach(tree => {
            this.drawTree(tree.x, 0, tree.gapY, true);
            this.drawTree(tree.x, tree.gapY + this.treeGap, 
                this.canvas.height - (tree.gapY + this.treeGap), false);
        });
        
        // Draw flock geese with their colors
        this.flockGeese.forEach(goose => {
            this.drawFlockGoose(goose.x, goose.y, goose.rotation, goose.wingAngle, goose.color);
        });
        
        // Draw goose
        this.drawGoose();
        
        // Draw score
        this.ctx.fillStyle = 'white';
        this.ctx.font = 'bold 24px Arial';
        this.ctx.fillText(`Score: ${this.score}`, 10, 30);
        
        // Draw speed multiplier
        this.ctx.font = 'bold 16px Arial';
        this.ctx.fillText(`Speed: ${this.speedMultiplier.toFixed(1)}x`, 10, 60);

        // Apply screen pulse effect
        if (this.score >= 40) {
            this.ctx.fillStyle = `rgba(255, 255, 255, ${this.visualEffects.pulseValue * 0.2})`;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }
    
    async handleGameOver() {
        // Stop the game loop
        this.isPlaying = false;
        this.canRestart = false; // Prevent immediate restart
        this.scoreSubmitted = false; // Reset score submitted flag
        
        // Update the final score display
        document.getElementById('finalScore').textContent = this.score;
        
        // Check if it's a high score
        const { isHighScore, placement } = await this.highScoreManager.isHighScore(this.score);
        
        // Show appropriate screen elements
        if (isHighScore && !this.scoreSubmitted) {
            const highScoreEntry = document.getElementById('highScoreEntry');
            highScoreEntry.classList.remove('hidden');
            document.getElementById('gameOverOptions').classList.add('hidden');
            
            // Remove any existing placement message
            const existingMsg = highScoreEntry.querySelector('.placement-message');
            if (existingMsg) {
                existingMsg.remove();
            }
            
            // Update placement message
            const placementMsg = document.createElement('div');
            placementMsg.className = 'placement-message';
            placementMsg.textContent = `You're in ${this.getOrdinal(placement)} place!`;
            placementMsg.style.color = '#FF0000';
            placementMsg.style.fontSize = '24px';
            placementMsg.style.marginBottom = '20px';
            placementMsg.style.textShadow = '0 0 10px rgba(255, 0, 0, 0.5)';
            
            // Show and prepare name input
            const nameInput = document.getElementById('playerName');
            const submitButton = document.getElementById('submitScore');
            nameInput.style.display = 'block';
            submitButton.style.display = 'block';
            nameInput.value = ''; // Clear any previous input
            nameInput.maxLength = 10; // Set maximum length to 10
            nameInput.placeholder = 'Enter 1-10 characters'; // Update placeholder
            nameInput.parentNode.insertBefore(placementMsg, nameInput);
            nameInput.focus();
            
            // Reset and show the announcement
            const announcement = document.querySelector('.high-score-announcement');
            announcement.style.opacity = '0';
            setTimeout(() => {
                announcement.style.opacity = '1';
            }, 300);
        } else {
            document.getElementById('highScoreEntry').classList.add('hidden');
            document.getElementById('gameOverOptions').classList.remove('hidden');
        }
        
        // Show the game over screen
        const gameOverScreen = document.getElementById('gameOverScreen');
        gameOverScreen.classList.remove('hidden');
        gameOverScreen.classList.add('visible');
        
        // Allow restart after 1 second
        setTimeout(() => {
            this.canRestart = true;
        }, 1000);
    }

    getOrdinal(n) {
        const s = ["th", "st", "nd", "rd"];
        const v = n % 100;
        return n + (s[(v - 20) % 10] || s[v] || s[0]);
    }

    async submitHighScore() {
        const playerName = document.getElementById('playerName').value.trim();
        if (!playerName) {
            alert('Please enter your name!');
            return;
        }

        try {
            console.log('Submitting score:', { name: playerName, score: this.score });
            const success = await this.highScoreManager.addScore(playerName, this.score);
            
            if (success) {
                console.log('Score submitted successfully');
                this.showHighScores();
            } else {
                console.error('Failed to submit score');
                alert('Failed to submit score. Please try again.');
            }
        } catch (error) {
            console.error('Error submitting score:', error);
            alert('An error occurred while submitting your score. Please try again.');
        }
    }

    getFlagEmoji(countryCode) {
        if (!countryCode || countryCode === 'unknown') return '🌎';
        const codePoints = countryCode
            .toUpperCase()
            .split('')
            .map(char => 127397 + char.charCodeAt());
        return String.fromCodePoint(...codePoints);
    }

    async refreshHighScores() {
        const refreshButton = document.getElementById('refreshScores');
        refreshButton.disabled = true;
        refreshButton.textContent = '🔄 Refreshing...';
        
        try {
            await this.showHighScores();
            refreshButton.textContent = '✅ Updated!';
            setTimeout(() => {
                refreshButton.disabled = false;
                refreshButton.textContent = '🔄 Refresh';
            }, 1000);
        } catch (error) {
            refreshButton.textContent = '❌ Error';
            setTimeout(() => {
                refreshButton.disabled = false;
                refreshButton.textContent = '🔄 Refresh';
            }, 1000);
        }
    }

    sortHighScores(method, lastAddedIndex = -1) {
        this.currentSortMethod = method;
        let sortedScores = [...this.currentScores];

        switch (method) {
            case 'score':
                sortedScores.sort((a, b) => b.score - a.score);
                break;
            case 'date':
                sortedScores.sort((a, b) => new Date(b.date) - new Date(a.date));
                break;
            case 'country':
                sortedScores.sort((a, b) => {
                    const countryA = a.countryName || 'Unknown';
                    const countryB = b.countryName || 'Unknown';
                    return countryA.localeCompare(countryB);
                });
                break;
        }

        // Find the new index of the last added score after sorting
        const newLastAddedIndex = lastAddedIndex !== -1 ? 
            sortedScores.findIndex(score => score.id === this.currentScores[lastAddedIndex].id) : -1;

        this.displayHighScores(sortedScores, newLastAddedIndex);
    }

    displayHighScores(scores, lastAddedIndex) {
        const highScoresList = document.getElementById('highScoresList');
        highScoresList.innerHTML = ''; // Clear existing scores

        if (scores.length === 0) {
            highScoresList.innerHTML = '<li>No high scores yet!</li>';
            return;
        }

        // Create and append score elements with animation delays
        scores.forEach((score, index) => {
            const li = document.createElement('li');
            li.style.animationDelay = `${index * 0.1}s`;
            
            const flag = this.getFlagEmoji(score.country);
            const countryCode = score.country === 'XX' ? '??' : score.country || '??';
            const date = new Date(score.date);
            
            // Format date as "M/D" (e.g., "3/15")
            const formattedDate = `${date.getMonth() + 1}/${date.getDate()}`;
            
            li.innerHTML = `
                <span class="rank">${index + 1}</span>
                <span class="name">${score.name}</span>
                <span class="score">${score.score}</span>
                <span class="country">${flag} ${countryCode}</span>
                <span class="date">${formattedDate}</span>
            `;

            // Add full date as a tooltip
            const fullDate = date.toLocaleDateString(undefined, { 
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            li.title = `Added: ${fullDate}`;

            // Highlight the user's score
            if (index === lastAddedIndex) {
                li.style.background = 'rgba(255, 215, 0, 0.2)';
                li.style.borderColor = '#FFD700';
            }

            highScoresList.appendChild(li);
        });

        // Scroll to the user's score if it exists
        if (lastAddedIndex !== -1) {
            const scoreElements = highScoresList.children;
            if (scoreElements[lastAddedIndex]) {
                setTimeout(() => {
                    scoreElements[lastAddedIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 500); // Wait for animations to complete
            }
        }
    }

    async showHighScores() {
        // Show the high scores screen
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('visible');
            screen.classList.add('hidden');
        });
        document.getElementById('highScoresScreen').classList.remove('hidden');
        document.getElementById('highScoresScreen').classList.add('visible');

        try {
            console.log('Fetching high scores...');
            // Get high scores from Firebase
            const { scores, lastAddedIndex } = await this.highScoreManager.getHighScores();
            this.currentScores = scores;
            
            // Sort using current method
            this.sortHighScores(this.currentSortMethod, lastAddedIndex);
        } catch (error) {
            console.error('Error displaying high scores:', error);
            document.getElementById('highScoresList').innerHTML = '<li>Error loading high scores</li>';
        }
    }

    hideHighScores() {
        document.getElementById('highScoresScreen').classList.remove('visible');
        document.getElementById('highScoresScreen').classList.add('hidden');
        document.getElementById('startScreen').classList.remove('hidden');
        document.getElementById('startScreen').classList.add('visible');
    }

    createFirework(score) {
        const colors = [
            '#FF0000', '#00FF00', '#0000FF', '#FFFF00', 
            '#FF00FF', '#00FFFF', '#FFA500', '#FF69B4'
        ];
        
        // Create multiple particles for the firework
        const particles = [];
        const numParticles = 50;
        // Center firework on goose position with some random variation
        const centerX = this.goose.x + this.goose.width/2 + (Math.random() - 0.5) * 50;
        const centerY = this.goose.y + this.goose.height/2 + (Math.random() - 0.5) * 50;
        const color = colors[Math.floor(Math.random() * colors.length)];
        
        // Create score text particles
        const scoreText = score.toString();
        const textParticles = this.createTextParticles(scoreText, centerX, centerY, color);
        
        // Create explosion particles
        for (let i = 0; i < numParticles; i++) {
            const angle = (Math.PI * 2 * i) / numParticles;
            const speed = Math.random() * 2 + 2;
            particles.push({
                x: centerX,
                y: centerY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                alpha: 1,
                color: color,
                size: Math.random() * 3 + 2
            });
        }

        this.visualEffects.fireworks.push({
            particles: particles,
            textParticles: textParticles,
            created: Date.now()
        });
    }

    createTextParticles(text, centerX, centerY, color) {
        const particles = [];
        const fontSize = 48;
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.font = `${fontSize}px "Press Start 2P"`;
        
        const textWidth = tempCtx.measureText(text).width;
        const startX = centerX - textWidth / 2;
        
        tempCtx.fillStyle = color;
        tempCtx.fillText(text, 0, fontSize);
        
        const imageData = tempCtx.getImageData(0, 0, textWidth, fontSize);
        const pixels = imageData.data;
        
        for (let y = 0; y < fontSize; y += 2) {
            for (let x = 0; x < textWidth; x += 2) {
                const i = (y * textWidth + x) * 4;
                if (pixels[i + 3] > 0) {
                    particles.push({
                        x: startX + x,
                        y: centerY - fontSize/2 + y,
                        originalX: startX + x,
                        originalY: centerY - fontSize/2 + y,
                        vx: (Math.random() - 0.5) * 2,
                        vy: (Math.random() - 0.5) * 2,
                        alpha: 1,
                        color: color,
                        size: 2
                    });
                }
            }
        }
        
        return particles;
    }

    updateFireworks() {
        for (let i = this.visualEffects.fireworks.length - 1; i >= 0; i--) {
            const firework = this.visualEffects.fireworks[i];
            const age = Date.now() - firework.created;
            
            if (age > 2000) {
                this.visualEffects.fireworks.splice(i, 1);
                continue;
            }
            
            // Update explosion particles
            firework.particles.forEach(particle => {
                particle.x += particle.vx;
                particle.y += particle.vy;
                particle.vy += 0.05; // Gravity
                particle.alpha = Math.max(0, 1 - age / 2000);
            });
            
            // Update text particles
            firework.textParticles.forEach(particle => {
                if (age < 1000) {
                    // Explode outward
                    particle.x += particle.vx;
                    particle.y += particle.vy;
                } else {
                    // Return to original position
                    particle.x += (particle.originalX - particle.x) * 0.1;
                    particle.y += (particle.originalY - particle.y) * 0.1;
                }
                particle.alpha = Math.max(0, 1 - age / 2000);
            });
        }
    }

    drawFireworks() {
        this.visualEffects.fireworks.forEach(firework => {
            // Draw explosion particles
            firework.particles.forEach(particle => {
                this.ctx.globalAlpha = particle.alpha;
                this.ctx.fillStyle = particle.color;
                this.ctx.beginPath();
                this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                this.ctx.fill();
            });
            
            // Draw text particles
            firework.textParticles.forEach(particle => {
                this.ctx.globalAlpha = particle.alpha;
                this.ctx.fillStyle = particle.color;
                this.ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
            });
        });
        this.ctx.globalAlpha = 1;
    }

    drawMapleLeaf(x, y, size, rotation) {
        this.ctx.save();
        this.ctx.translate(x, y);
        this.ctx.rotate(rotation * Math.PI / 180);
        this.ctx.fillStyle = '#FF0000';
        
        // Simple maple leaf shape
        this.ctx.beginPath();
        this.ctx.moveTo(0, -size);
        this.ctx.lineTo(size, 0);
        this.ctx.lineTo(0, size);
        this.ctx.lineTo(-size, 0);
        this.ctx.closePath();
        this.ctx.fill();
        
        this.ctx.restore();
    }

    initializeMountains() {
        this.mountains.layers.forEach(layer => {
            let x = 0;
            while (x < this.canvas.width + 300) {
                const height = Math.random() * 150 + 100;
                const width = Math.random() * 150 + 150;
                layer.mountains.push({
                    x: x,
                    width: width,
                    height: height
                });
                x += width - 40;
            }
        });
    }

    updateMountains() {
        // Update mountain positions
        this.mountains.layers.forEach((layer, index) => {
            // Update mountain colors if score >= 10
            if (this.score >= 10) {
                if (Math.random() < 0.02) {
                    const hue = Math.floor(Math.random() * 360);
                    const lightness = 30 + (20 * (1 - index/2));
                    layer.color = `hsl(${hue}, 40%, ${lightness}%)`;
                }
            } else {
                layer.color = layer.baseColor;
            }

            layer.mountains.forEach(mountain => {
                mountain.x -= this.treeSpeed * layer.speed * 0.5; // Slowed down mountain movement
            });

            // Remove mountains that are off screen and add new ones
            const firstMountain = layer.mountains[0];
            if (firstMountain && firstMountain.x + firstMountain.width < 0) {
                layer.mountains.shift();
                const lastMountain = layer.mountains[layer.mountains.length - 1];
                const newX = lastMountain.x + lastMountain.width - 40;
                layer.mountains.push({
                    x: newX,
                    width: Math.random() * 150 + 150,
                    height: Math.random() * 150 + 100
                });
            }
        });
    }

    drawMountains() {
        // Draw each layer of mountains
        this.mountains.layers.forEach(layer => {
            this.ctx.fillStyle = layer.color;
            layer.mountains.forEach(mountain => {
                this.ctx.beginPath();
                this.ctx.moveTo(mountain.x, this.canvas.height);
                this.ctx.lineTo(mountain.x + mountain.width/2, layer.y - mountain.height);
                this.ctx.lineTo(mountain.x + mountain.width, this.canvas.height);
                this.ctx.closePath();
                this.ctx.fill();
            });
        });
    }
}

// Start the game when the page loads
window.onload = () => {
    new FlappyGoose();
}; 
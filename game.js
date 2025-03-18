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
        this.scoreSubmitted = false; // Add flag to track if score was submitted
        
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
            gravity: 0.25,
            jump: -4.6,
            rotation: 0,
            wingAngle: 0,  // For wing animation
            wingSpeed: 0.3 // Wing flapping speed
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
            if (e.code === 'Space') {
                if (!this.isPlaying && this.canRestart) {
                    this.start();
                } else if (this.isPlaying) {
                    this.jump();
                }
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
    }

    createStars() {
        // Create initial stars for the space warp effect
        for (let i = 0; i < 100; i++) {
            this.stars.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                size: Math.random() * 2 + 1,
                speed: Math.random() * 3 + 2
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
        // Draw stars with elongated effect based on speed
        this.ctx.fillStyle = 'white';
        for (let star of this.stars) {
            this.ctx.beginPath();
            this.ctx.moveTo(star.x, star.y);
            this.ctx.lineTo(star.x - (star.speed * this.speedMultiplier * 2), star.y);
            this.ctx.lineWidth = star.size;
            this.ctx.strokeStyle = 'white';
            this.ctx.stroke();
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
        this.scoreSubmitted = false; // Reset score submitted flag
        this.trees = [];
        
        // Reset speed values
        this.speedMultiplier = 1;
        this.treeSpeed = this.baseSpeed;
        
        // Reset goose position and velocity
        this.goose.y = this.canvas.height / 2;
        this.goose.velocity = 0;
        this.goose.rotation = 0;
        this.goose.gravity = 0.25;
        
        // Reset flock
        this.flockGeese = [];
        this.lastFlockScore = 0;

        // Make canvas active
        this.canvas.classList.add('active');
        
        // Start game loop
        this.gameLoop();
    }
    
    restart() {
        this.start();
    }
    
    jump() {
        this.goose.velocity = this.goose.jump;
        this.goose.rotation = -30;
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
        // Update speed based on score (only affects trees and stars)
        this.speedMultiplier = 1 + Math.floor(this.score / 10) * 0.2; // Increase speed by 20% every 10 points
        this.treeSpeed = this.baseSpeed * this.speedMultiplier;

        // Update stars
        this.updateStars();
        
        // Update goose (physics independent of game speed)
        this.goose.velocity += this.goose.gravity;
        this.goose.y += this.goose.velocity;
        
        // Update rotation (slower rotation for better control)
        if (this.goose.rotation < 90) {
            this.goose.rotation += 1;
        }
        
        // Create new trees
        if (this.trees.length === 0 || 
            this.trees[this.trees.length - 1].x < this.canvas.width - 200) {
            this.createTree();
        }
        
        // Update trees
        for (let i = this.trees.length - 1; i >= 0; i--) {
            const tree = this.trees[i];
            tree.x -= this.treeSpeed;
            
            // Check collision
            if (this.checkCollision(tree)) {
                this.gameOver = true;
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
        
        // Draw sky gradient that gets darker with speed
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        const skyDarkness = Math.min(0.6, (this.speedMultiplier - 1) * 0.3);
        gradient.addColorStop(0, `rgb(${135 * (1-skyDarkness)}, ${206 * (1-skyDarkness)}, ${235 * (1-skyDarkness)})`);
        gradient.addColorStop(1, `rgb(${224 * (1-skyDarkness)}, ${246 * (1-skyDarkness)}, ${255 * (1-skyDarkness)})`);
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw stars (more visible as sky darkens)
        this.drawStars();
        
        // Draw trees
        this.trees.forEach(tree => {
            // Draw top tree (trunk at top, leaves pointing down)
            this.drawTree(tree.x, 0, tree.gapY, true);
            
            // Draw bottom tree (normal)
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
    }
    
    gameLoop() {
        if (!this.gameOver) {
            this.update();
            this.draw();
            requestAnimationFrame(() => this.gameLoop());
        } else {
            this.handleGameOver();
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
        const nameInput = document.getElementById('playerName');
        const name = nameInput.value.toUpperCase().trim();
        
        if (name.length >= 1 && name.length <= 10 && !this.scoreSubmitted) {
            const result = await this.highScoreManager.addScore(name, this.score);
            if (result.added) {
                this.scoreSubmitted = true; // Mark score as submitted
                nameInput.value = '';
                document.getElementById('highScoreEntry').classList.add('hidden');
                document.getElementById('gameOverOptions').classList.remove('hidden');
                // Show high scores after submission
                await this.showHighScores();
            }
        }
    }

    async showHighScores() {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('visible');
            screen.classList.add('hidden');
        });
        
        const highScoresScreen = document.getElementById('highScoresScreen');
        highScoresScreen.classList.remove('hidden');
        highScoresScreen.classList.add('visible');

        // Update the high scores list
        await this.updateHighScoresList();
    }

    async updateHighScoresList() {
        const highScoresList = document.getElementById('highScoresList');
        const scores = await this.highScoreManager.getScores();
        
        // Clear existing scores
        highScoresList.innerHTML = '';
        
        // Add each score to the list
        scores.forEach((score, index) => {
            const scoreEntry = document.createElement('div');
            scoreEntry.className = 'score-entry';
            
            // Create flag element
            const flagSpan = document.createElement('span');
            flagSpan.className = 'flag';
            flagSpan.textContent = score.country === 'XX' ? '🌎' : this.getFlagEmoji(score.country);
            
            const rankSpan = document.createElement('span');
            rankSpan.className = 'rank';
            rankSpan.textContent = `${this.getOrdinal(index + 1)}`;
            
            const nameSpan = document.createElement('span');
            nameSpan.className = 'name';
            nameSpan.textContent = score.name;
            
            const scoreSpan = document.createElement('span');
            scoreSpan.className = 'score';
            scoreSpan.textContent = score.score;
            
            scoreEntry.appendChild(rankSpan);
            scoreEntry.appendChild(flagSpan);
            scoreEntry.appendChild(nameSpan);
            scoreEntry.appendChild(scoreSpan);
            highScoresList.appendChild(scoreEntry);
        });

        // If no scores, show a message
        if (scores.length === 0) {
            const noScores = document.createElement('div');
            noScores.className = 'score-entry no-scores';
            noScores.textContent = 'No high scores yet! Be the first!';
            highScoresList.appendChild(noScores);
        }
    }

    getFlagEmoji(countryCode) {
        const codePoints = countryCode
            .toUpperCase()
            .split('')
            .map(char => 127397 + char.charCodeAt());
        return String.fromCodePoint(...codePoints);
    }

    hideHighScores() {
        document.getElementById('highScoresScreen').classList.remove('visible');
        document.getElementById('highScoresScreen').classList.add('hidden');
        
        // If game is over, remove high score entry elements and show game over options
        if (this.gameOver) {
            const highScoreEntry = document.getElementById('highScoreEntry');
            
            // Remove placement message if it exists
            const placementMsg = highScoreEntry.querySelector('.placement-message');
            if (placementMsg) {
                placementMsg.remove();
            }
            
            // Hide all high score entry elements
            const nameInput = document.getElementById('playerName');
            const submitButton = document.getElementById('submitScore');
            nameInput.style.display = 'none';
            submitButton.style.display = 'none';
            nameInput.value = '';
            
            // Hide high score entry and show game over options
            highScoreEntry.classList.add('hidden');
            document.getElementById('gameOverOptions').classList.remove('hidden');
            
            // Reset high score announcement
            const announcement = document.querySelector('.high-score-announcement');
            if (announcement) {
                announcement.style.opacity = '0';
            }
        }
        
        const screenToShow = this.gameOver ? 'gameOverScreen' : 'startScreen';
        const screen = document.getElementById(screenToShow);
        screen.classList.remove('hidden');
        screen.classList.add('visible');
    }
}

// Start the game when the page loads
window.onload = () => {
    new FlappyGoose();
}; 
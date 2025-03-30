// Get game elements
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('scoreValue');
const finalScoreElement = document.getElementById('finalScore');
const pauseBtn = document.getElementById('pauseBtn');
const restartBtn = document.getElementById('restartBtn');
const restartBtnOverlay = document.getElementById('restartBtnOverlay');
const gameOverScreen = document.getElementById('gameOverScreen');
const speedBar = document.getElementById('speedBar');
const playerNameInput = document.getElementById('playerName');
const saveScoreBtn = document.getElementById('saveScoreBtn');
const leaderboardEntries = document.getElementById('leaderboardEntries');
const resetLeaderboardBtn = document.getElementById('resetLeaderboardBtn');

// Touch controls
const upBtn = document.getElementById('up-btn');
const downBtn = document.getElementById('down-btn');
const leftBtn = document.getElementById('left-btn');
const rightBtn = document.getElementById('right-btn');

// Game settings
const gridSize = 25;
const tileCount = canvas.width / gridSize;
const snakeColor = '#4CAF50';
const snakeHeadColor = '#2E7D32';
const snakeBorderColor = '#E8F5E9';
const foodColor = '#F44336';
const foodBorderColor = '#FFEBEE';
const gridColor = '#E0E0E0';
const initialGameSpeed = 5;
const maxGameSpeed = 15;
const speedIncrement = 0.3;

// Sound effects
const eatSoundURL = 'https://assets.mixkit.co/sfx/preview/mixkit-arcade-game-jump-coin-216.mp3';
const gameOverSoundURL = 'https://assets.mixkit.co/sfx/preview/mixkit-player-losing-or-failing-2042.mp3';

let eatSound;
let gameOverSound;

// Game state
let snake = [
    {x: 10, y: 10}
];
let velocityX = 0;
let velocityY = 0;
let foodX = 5;
let foodY = 5;
let gameSpeed = initialGameSpeed;
let score = 0;
let isPaused = false;
let isGameRunning = true;
let lastRenderTime = 0;
let flashAnimation = 0;
let lastDirection = { x: 0, y: 0 };
let pendingDirection = null;
let countdown = 0;
let collisionAnimation = 0;
let collisionPoint = null;

// Initialize sounds
function initSounds() {
    eatSound = new Audio(eatSoundURL);
    eatSound.volume = 0.3;
    
    gameOverSound = new Audio(gameOverSoundURL);
    gameOverSound.volume = 0.3;
}

// Load and display leaderboard
function loadLeaderboard() {
    const leaderboard = getLeaderboardFromStorage();
    displayLeaderboard(leaderboard);
}

function getLeaderboardFromStorage() {
    const leaderboardData = localStorage.getItem('snakeLeaderboard');
    return leaderboardData ? JSON.parse(leaderboardData) : [];
}

function saveLeaderboardToStorage(leaderboard) {
    localStorage.setItem('snakeLeaderboard', JSON.stringify(leaderboard));
}

function displayLeaderboard(leaderboard) {
    // Sort by score (highest first)
    leaderboard.sort((a, b) => b.score - a.score);
    
    // Take only top 10
    const topScores = leaderboard.slice(0, 10);
    
    // Clear current entries
    leaderboardEntries.innerHTML = '';
    
    // Add entries to DOM
    topScores.forEach(entry => {
        const entryElement = document.createElement('div');
        entryElement.className = 'leaderboard-entry';
        
        const nameElement = document.createElement('div');
        nameElement.className = 'entry-name';
        nameElement.textContent = entry.name;
        
        const scoreElement = document.createElement('div');
        scoreElement.className = 'entry-score';
        scoreElement.textContent = entry.score;
        
        entryElement.appendChild(nameElement);
        entryElement.appendChild(scoreElement);
        leaderboardEntries.appendChild(entryElement);
    });
    
    // If no entries, show message
    if (topScores.length === 0) {
        const emptyElement = document.createElement('div');
        emptyElement.className = 'leaderboard-entry';
        emptyElement.textContent = 'No scores yet!';
        leaderboardEntries.appendChild(emptyElement);
    }
}

function addScoreToLeaderboard(name, score) {
    const leaderboard = getLeaderboardFromStorage();
    leaderboard.push({ name, score });
    saveLeaderboardToStorage(leaderboard);
    displayLeaderboard(leaderboard);
}

function resetLeaderboard() {
    if (confirm('Are you sure you want to reset the leaderboard?')) {
        localStorage.removeItem('snakeLeaderboard');
        loadLeaderboard();
    }
}

// Start the game
function startGame() {
    snake = [{ x: 10, y: 10 }];
    velocityX = 0;
    velocityY = 0;
    lastDirection = { x: 0, y: 0 };
    pendingDirection = null;
    gameSpeed = initialGameSpeed;
    score = 0;
    scoreElement.textContent = score;
    updateSpeedBar();
    generateFood();
    isGameRunning = true;
    isPaused = false;
    pauseBtn.textContent = 'Pause';
    gameOverScreen.style.display = 'none';
    countdown = 3; // Start with 3 second countdown
    collisionAnimation = 0;
    collisionPoint = null;
    
    // Start the game loop
    requestAnimationFrame(gameLoop);
}

// Update speed bar in UI
function updateSpeedBar() {
    const percentage = ((gameSpeed - initialGameSpeed) / (maxGameSpeed - initialGameSpeed)) * 100;
    speedBar.style.width = `${percentage}%`;
    
    // Change color based on speed
    if (percentage < 33) {
        speedBar.style.backgroundColor = '#f9e2af'; // Yellow
    } else if (percentage < 66) {
        speedBar.style.backgroundColor = '#fab387'; // Orange
    } else {
        speedBar.style.backgroundColor = '#f38ba8'; // Red
    }
}

// Main game loop with time-based animation
function gameLoop(currentTime) {
    if (!isGameRunning) return;
    
    if (isPaused) {
        requestAnimationFrame(gameLoop);
        return;
    }
    
    const secondsSinceLastRender = (currentTime - lastRenderTime) / 1000;
    
    // Handle countdown
    if (countdown > 0) {
        if (lastRenderTime === 0) {
            lastRenderTime = currentTime;
            requestAnimationFrame(gameLoop);
            return;
        }
        
        if (secondsSinceLastRender > 1) {
            countdown--;
            lastRenderTime = currentTime;
            render(); // Render the countdown
        }
        
        requestAnimationFrame(gameLoop);
        return;
    }
    
    // Normal game update timing
    if (secondsSinceLastRender < 1 / gameSpeed) {
        requestAnimationFrame(gameLoop);
        return;
    }
    
    lastRenderTime = currentTime;
    
    // Apply pending direction if it exists
    if (pendingDirection) {
        velocityX = pendingDirection.x;
        velocityY = pendingDirection.y;
        lastDirection = { x: velocityX, y: velocityY };
        pendingDirection = null;
    }
    
    update();
    render();
    
    if (isGameRunning) {
        requestAnimationFrame(gameLoop);
    }
}

function update() {
    // Update snake position
    const head = {x: snake[0].x + velocityX, y: snake[0].y + velocityY};
    
    // Check game over conditions
    if (isGameOver(head)) {
        handleGameOver(head);
        return;
    }
    
    snake.unshift(head);
    
    // Check for food collision
    if (head.x === foodX && head.y === foodY) {
        handleFoodCollision();
    } else {
        snake.pop();
    }
}

function render() {
    clearScreen();
    drawGrid();
    drawFood();
    drawSnake();
    
    // Draw countdown if active
    if (countdown > 0) {
        drawCountdown();
    }
    
    // Flash effect when eating food
    if (flashAnimation > 0) {
        ctx.fillStyle = `rgba(255, 255, 255, ${flashAnimation / 5})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        flashAnimation -= 1;
    }
    
    // Collision animation
    if (collisionAnimation > 0) {
        drawCollisionEffect();
        collisionAnimation -= 1;
    }
}

// Draw countdown overlay
function drawCountdown() {
    // Semi-transparent background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Countdown text
    ctx.fillStyle = '#ffffff';
    ctx.font = '80px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    if (countdown > 0) {
        ctx.fillText(countdown.toString(), canvas.width / 2, canvas.height / 2);
    } else {
        ctx.fillText('GO!', canvas.width / 2, canvas.height / 2);
    }
}

// Draw collision effect
function drawCollisionEffect() {
    if (!collisionPoint) return;
    
    const x = collisionPoint.x * gridSize + gridSize / 2;
    const y = collisionPoint.y * gridSize + gridSize / 2;
    
    // Draw explosion/collision effect
    const radius = (10 - collisionAnimation) * 5;
    const opacity = collisionAnimation / 10;
    
    // Outer circle
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(243, 139, 168, ${opacity * 0.5})`;
    ctx.fill();
    
    // Inner circle
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.6, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(243, 139, 168, ${opacity})`;
    ctx.fill();
}

// Grid for better visibility
function drawGrid() {
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 0.5;
    
    // Draw vertical lines
    for (let i = 0; i <= tileCount; i++) {
        ctx.beginPath();
        ctx.moveTo(i * gridSize, 0);
        ctx.lineTo(i * gridSize, canvas.height);
        ctx.stroke();
    }
    
    // Draw horizontal lines
    for (let i = 0; i <= tileCount; i++) {
        ctx.beginPath();
        ctx.moveTo(0, i * gridSize);
        ctx.lineTo(canvas.width, i * gridSize);
        ctx.stroke();
    }
}

function clearScreen() {
    ctx.fillStyle = '#f8f8f8';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawSnake() {
    // Draw snake body
    snake.forEach((part, index) => {
        const radius = gridSize / 5;
        const x = part.x * gridSize;
        const y = part.y * gridSize;
        const size = gridSize - 2;
        
        // Different color for head
        ctx.fillStyle = index === 0 ? snakeHeadColor : snakeColor;
        
        // Draw rounded rectangle
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + size - radius, y);
        ctx.quadraticCurveTo(x + size, y, x + size, y + radius);
        ctx.lineTo(x + size, y + size - radius);
        ctx.quadraticCurveTo(x + size, y + size, x + size - radius, y + size);
        ctx.lineTo(x + radius, y + size);
        ctx.quadraticCurveTo(x, y + size, x, y + size - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        ctx.fill();
        
        // Border
        ctx.strokeStyle = snakeBorderColor;
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Draw eyes on head
        if (index === 0) {
            // Position eyes based on direction
            let eyeOffsetX = 0;
            let eyeOffsetY = 0;
            
            if (lastDirection.x === 1) eyeOffsetX = 3;
            if (lastDirection.x === -1) eyeOffsetX = -3;
            if (lastDirection.y === 1) eyeOffsetY = 3;
            if (lastDirection.y === -1) eyeOffsetY = -3;
            
            // Left eye
            ctx.fillStyle = 'white';
            ctx.beginPath();
            ctx.arc(x + size/3 + eyeOffsetX, y + size/3 + eyeOffsetY, 3, 0, Math.PI * 2);
            ctx.fill();
            
            // Right eye
            ctx.beginPath();
            ctx.arc(x + 2*size/3 + eyeOffsetX, y + size/3 + eyeOffsetY, 3, 0, Math.PI * 2);
            ctx.fill();
            
            // Pupils
            ctx.fillStyle = 'black';
            ctx.beginPath();
            ctx.arc(x + size/3 + eyeOffsetX + 1, y + size/3 + eyeOffsetY + 1, 1.5, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.beginPath();
            ctx.arc(x + 2*size/3 + eyeOffsetX + 1, y + size/3 + eyeOffsetY + 1, 1.5, 0, Math.PI * 2);
            ctx.fill();
        }
    });
}

function drawFood() {
    // Create apple-like shape with stem
    const x = foodX * gridSize;
    const y = foodY * gridSize;
    const size = gridSize - 2;
    
    // Apple body
    ctx.fillStyle = foodColor;
    ctx.beginPath();
    ctx.arc(x + size/2, y + size/2, size/2, 0, Math.PI * 2);
    ctx.fill();
    
    // Apple stem
    ctx.fillStyle = '#795548';
    ctx.fillRect(x + size/2 - 1, y + 2, 2, 5);
    
    // Apple highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.arc(x + size/3, y + size/3, size/6, 0, Math.PI * 2);
    ctx.fill();
    
    // Food pulse animation
    const pulseSize = size / 2 + Math.sin(Date.now() / 200) * 2;
    ctx.strokeStyle = foodBorderColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x + size/2, y + size/2, pulseSize, 0, Math.PI * 2);
    ctx.stroke();
}

function handleFoodCollision() {
    score += 1;
    scoreElement.textContent = score;
    generateFood();
    
    // Increase game speed gradually
    if (gameSpeed < maxGameSpeed) {
        gameSpeed += speedIncrement;
        updateSpeedBar();
    }
    
    // Flash effect
    flashAnimation = 5;
    
    // Play sound effect
    try {
        eatSound.currentTime = 0;
        eatSound.play().catch(() => {});
    } catch (e) {
        console.error("Couldn't play sound:", e);
    }
}

function isGameOver(head) {
    // Wall collision
    if (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount) {
        return true;
    }
    
    // Self collision (skip the check if not moving yet)
    if (velocityX === 0 && velocityY === 0) {
        return false;
    }
    
    for (let i = 1; i < snake.length; i++) {
        if (head.x === snake[i].x && head.y === snake[i].y) {
            return true;
        }
    }
    
    return false;
}

function handleGameOver(head) {
    isGameRunning = false;
    finalScoreElement.textContent = score;
    
    // Store collision point for animation
    collisionPoint = head;
    collisionAnimation = 10;
    
    // Render the final state with collision
    render();
    
    // Show game over screen after a short delay
    setTimeout(() => {
        gameOverScreen.style.display = 'flex';
        
        // Focus on the name input
        playerNameInput.focus();
        
        // Play game over sound
        try {
            gameOverSound.currentTime = 0;
            gameOverSound.play().catch(() => {});
        } catch (e) {
            console.error("Couldn't play sound:", e);
        }
    }, 800);
}

function generateFood() {
    foodX = Math.floor(Math.random() * tileCount);
    foodY = Math.floor(Math.random() * tileCount);
    
    // Make sure food doesn't appear on snake
    for (let i = 0; i < snake.length; i++) {
        if (foodX === snake[i].x && foodY === snake[i].y) {
            generateFood();
            return;
        }
    }
}

function changeDirection(dx, dy) {
    // Prevent 180-degree turns
    if ((velocityX === 0 && velocityY === 0) || 
        (dx !== -velocityX || dy !== -velocityY)) {
        // Store the next direction to be applied on the next game update
        pendingDirection = { x: dx, y: dy };
    }
}

// Event handlers
function keyDown(event) {
    // Don't process keys during countdown
    if (countdown > 0) return;
    
    switch(event.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
            changeDirection(0, -1);
            event.preventDefault();
            break;
        case 'ArrowDown':
        case 's':
        case 'S':
            changeDirection(0, 1);
            event.preventDefault();
            break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
            changeDirection(-1, 0);
            event.preventDefault();
            break;
        case 'ArrowRight':
        case 'd':
        case 'D':
            changeDirection(1, 0);
            event.preventDefault();
            break;
        case ' ':
        case 'p':
        case 'P':
            togglePause();
            event.preventDefault();
            break;
    }
}

function togglePause() {
    // Don't allow pausing during countdown
    if (countdown > 0) return;
    
    isPaused = !isPaused;
    pauseBtn.textContent = isPaused ? 'Resume' : 'Pause';
}

// Handle score saving
function saveScore() {
    const name = playerNameInput.value.trim();
    
    if (name === '') {
        alert('Please enter your name before saving!');
        playerNameInput.focus();
        return;
    }
    
    // Add score to leaderboard
    addScoreToLeaderboard(name, score);
    
    // Disable save button to prevent multiple saves
    saveScoreBtn.disabled = true;
    saveScoreBtn.textContent = 'Saved!';
}

// Touch controls
upBtn.addEventListener('click', () => {
    if (countdown === 0) changeDirection(0, -1);
});
downBtn.addEventListener('click', () => {
    if (countdown === 0) changeDirection(0, 1);
});
leftBtn.addEventListener('click', () => {
    if (countdown === 0) changeDirection(-1, 0);
});
rightBtn.addEventListener('click', () => {
    if (countdown === 0) changeDirection(1, 0);
});

// Button event listeners
pauseBtn.addEventListener('click', togglePause);
restartBtn.addEventListener('click', startGame);
restartBtnOverlay.addEventListener('click', startGame);
saveScoreBtn.addEventListener('click', saveScore);
resetLeaderboardBtn.addEventListener('click', resetLeaderboard);

// Keyboard events
document.addEventListener('keydown', keyDown);

// Add swipe gesture support for mobile
let touchStartX = 0;
let touchStartY = 0;

canvas.addEventListener('touchstart', function(e) {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
    e.preventDefault();
}, { passive: false });

canvas.addEventListener('touchend', function(e) {
    // Don't process swipes during countdown
    if (countdown > 0) return;
    
    const touchEndX = e.changedTouches[0].screenX;
    const touchEndY = e.changedTouches[0].screenY;
    
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;
    
    // Higher sensitivity threshold for swipes
    const swipeThreshold = 30;
    
    // Determine swipe direction
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
        if (deltaX > swipeThreshold) {
            changeDirection(1, 0); // Right swipe
        } else if (deltaX < -swipeThreshold) {
            changeDirection(-1, 0); // Left swipe
        }
    } else {
        if (deltaY > swipeThreshold) {
            changeDirection(0, 1); // Down swipe
        } else if (deltaY < -swipeThreshold) {
            changeDirection(0, -1); // Up swipe
        }
    }
    e.preventDefault();
}, { passive: false });

// Prevent screen scrolling on touch devices
document.addEventListener('touchmove', function(e) {
    if (e.target === canvas) {
        e.preventDefault();
    }
}, { passive: false });

// Resize canvas when window size changes
function resizeCanvas() {
    // Determine the maximum size while maintaining the aspect ratio
    const maxWidth = Math.min(window.innerWidth * 0.9, 500);
    const maxHeight = Math.min(window.innerHeight * 0.7, 500);
    
    const size = Math.min(maxWidth, maxHeight);
    
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Initialize game
function init() {
    initSounds();
    loadLeaderboard();
    startGame();
}

// Start everything
init();

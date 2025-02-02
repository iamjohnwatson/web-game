"use strict";

// Ensure Phaser is included
if (typeof Phaser === 'undefined') { 
  throw new Error('Phaser library is not loaded. Please include Phaser library in your HTML file.');
}

// Ensure DOM is fully loaded before accessing elements
document.addEventListener('DOMContentLoaded', (event) => { 
  const startButton = document.getElementById('start-button');
  if (!startButton) {
    console.error('Start button not found in the DOM.');
    return;
  }
  startButton.addEventListener('click', startGame);
});

// =============================================
// MAIN SCENE CLASS 
// =============================================
class MainScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainScene' });

    // Game state variables
    this.player = null;
    this.controls = null;
    this.score = 0;
    this.timeLeft = 200;
    this.currentLevel = 1;
    this.collectibles = null;
    this.hazards = null;
    this.timerEvent = null;

    // DOM elements
    this.scoreElement = null;
    this.timeElement = null;
    this.levelElement = null;
    this.levelUpElement = null;
    this.gameOverElement = null;
  }

  // =============================================
  // PHASER LIFECYCLE METHODS
  // =============================================

  preload() {
    this.load.image('avatar', 'assets/player.png');
    this.load.image('gold', 'assets/gold.png');
    this.load.image('silver', 'assets/silver.png');
    this.load.image('bronze', 'assets/bronze.png');
    this.load.image('hazard', 'assets/spinning_blade.gif');
    this.load.image('rocks', 'assets/rocks.png');
    this.load.audio('hit', 'assets/hit.mp3');
    this.load.audio('level_up', 'assets/level_up.mp3');
    this.load.audio('end_game', 'assets/end_game.mp3');
  }

  create() {
    // Unlock audio context
    if (this.sound.context.state === 'suspended') {
      this.sound.context.resume().then(() => {
        this.sound.play('hit', { volume: 0 });
      });
    }

    // Initialize game objects
    this.player = this.physics.add.sprite(400, 300, 'avatar')
      .setCollideWorldBounds(true)
      .setScale(1.5);
    
    this.collectibles = this.physics.add.group();
    this.hazards = this.physics.add.group();

    // Setup controls
    this.controls = this.input.keyboard.createCursorKeys();

    // Initialize UI references
    this.scoreElement = document.getElementById('score');
    this.timeElement = document.getElementById('time');
    this.levelElement = document.getElementById('level');
    this.levelUpElement = document.getElementById('level-up-message');
    this.gameOverElement = document.getElementById('game-over-message');

    this.resetGameState();
    this.initializeCollectibles();
    this.initializeHazards();

    // Setup collisions
    this.physics.add.overlap(
      this.player, 
      this.collectibles, 
      (p, c) => this.obtainCollectible(p, c), 
      null, 
      this
    );
    this.physics.add.collider(
      this.player, 
      this.hazards, 
      (p, h) => this.hitHazard(p, h), 
      null, 
      this
    );

    // Start timer
    this.timerEvent = this.time.addEvent({
      delay: 1000,
      callback: () => this.updateGameTimer(),
      loop: true
    });
  }

  update() {
    const speed = 300;
    this.player.setVelocity(0);
    if (this.controls.left.isDown) this.player.setVelocityX(-speed);
    if (this.controls.right.isDown) this.player.setVelocityX(speed);
    if (this.controls.up.isDown) this.player.setVelocityY(-speed);
    if (this.controls.down.isDown) this.player.setVelocityY(speed);
  }

  // =============================================
  // GAME LOGIC METHODS
  // =============================================

  resetGameState() {
    this.score = 0;
    this.currentLevel = 1;
    this.timeLeft = 200;
    this.scoreElement.textContent = `SCORE: ${this.score}`;
    this.levelElement.textContent = `LEVEL: ${this.currentLevel}`;
    this.timeElement.textContent = `TIME: ${this.timeLeft}`;
    this.levelUpElement.style.display = 'none';
    this.gameOverElement.style.display = 'none';
  }

  initializeCollectibles() {
    this.collectibles.clear(true, true);
    const total = 20 + (this.currentLevel * 5);
    const types = ['gold', 'silver', 'bronze'];
    for (let i = 0; i < total; i++) {
      const collectible = this.collectibles.create(0, 0, Phaser.Math.RND.pick(types));
      this.ensureNoOverlap(collectible, this.collectibles, this.hazards);
    }
  }

  initializeHazards() {
    this.hazards.clear(true, true);
    const total = 5 + this.currentLevel;
    const types = ['hazard', 'rocks'];
    for (let i = 0; i < total; i++) {
      const hazard = this.hazards.create(0, 0, Phaser.Math.RND.pick(types));
      this.ensureNoOverlap(hazard, this.hazards, this.collectibles);
    }
  }

  ensureNoOverlap(object, group, otherGroup, maxAttempts = 100) {
    let safePosition = false;
    let attempts = 0;
    while (!safePosition && attempts < maxAttempts) {
      object.setPosition(
        Phaser.Math.Between(50, 750), 
        Phaser.Math.Between(50, 550)
      );
      const groupSafe = group.getChildren().every(obj => obj === object || Phaser.Math.Distance.Between(obj.x, obj.y, object.x, object.y) >= 80 );
      const otherGroupSafe = otherGroup.getChildren().every(obj => Phaser.Math.Distance.Between(obj.x, obj.y, object.x, object.y) >= 80 );
      safePosition = groupSafe && otherGroupSafe;
      attempts++;
    }
  }

  obtainCollectible(player, collectible) {
    collectible.destroy();
    const points = { gold: 5, silver: 3, bronze: 1 }[collectible.texture.key];
    this.score += points;
    this.scoreElement.textContent = `SCORE: ${this.score}`;
    if (this.collectibles.countActive(true) === 0) {
      this.advanceLevel();
    }
  }

  hitHazard(player, hazard) {
    this.score -= 10;  // Decrease score when hitting a hazard
    this.scoreElement.textContent = `SCORE: ${this.score}`;
  
    // Subtract 10 seconds from the timer when a hazard is hit
    this.timeLeft -= 10;
    if (this.timeLeft < 0) {
      this.timeLeft = 0;  // Prevent negative time
    }
    this.timeElement.textContent = `TIME: ${this.timeLeft}`;
  
    // Play the hit sound
    this.sound.play('hit');
  
    // Set random velocity and angular velocity for the hazard
    hazard.setVelocity(Phaser.Math.Between(-300, 300), Phaser.Math.Between(-300, 300));
    hazard.setAngularVelocity(Phaser.Math.Between(100, 300));
  
    // Destroy hazard after some time
    this.time.delayedCall(500, () => hazard.destroy());
  
    // Reset player's position
    player.setPosition(400, 300);
  
    // Flash the player three times
    let flashCount = 0;
    const flashInterval = 200; // Interval between flashes in milliseconds
    const totalFlashes = 3;
  
    // Flash the player three times
    const flashPlayer = () => {
      if (flashCount < totalFlashes) {
        player.setTint(0xff0000);  // Set tint to red
        this.time.delayedCall(flashInterval, () => {
          player.clearTint();  // Clear tint
          flashCount++;
          this.time.delayedCall(flashInterval, flashPlayer);  // Repeat if flashes left
        });
      }
    };
  
    // Start the flashing effect
    flashPlayer();
  }
    

  updateGameTimer() {
    this.timeLeft--;
    this.timeElement.textContent = `TIME: ${this.timeLeft}`;
    if (this.timeLeft <= 0) {
      this.endGame("Time's up! Game Over!");
    }
  }

  advanceLevel() {
    if (this.currentLevel === 5) {
      this.endGame(`Congratulations! Final Score: ${this.score}`);
      return;
    }
    this.physics.pause();
    this.timerEvent.remove();
    this.levelUpElement.textContent = `Level ${this.currentLevel} Complete!`;
    this.levelUpElement.style.display = 'block';
    this.sound.play('level_up');
    this.time.delayedCall(3000, () => {
      this.levelUpElement.style.display = 'none';
      this.currentLevel++;
      this.levelElement.textContent = `LEVEL: ${this.currentLevel}`;
      this.player.setPosition(400, 300);
      this.initializeCollectibles();
      this.initializeHazards();
      this.physics.resume();
      this.timerEvent = this.time.addEvent({
        delay: 1000,
        callback: () => this.updateGameTimer(),
        loop: true
      });
    });
  }

  endGame(message) {
    this.physics.pause();
    if (this.timerEvent) this.timerEvent.remove();
    this.gameOverElement.textContent = message;
    this.gameOverElement.style.display = 'block';
    this.sound.play('end_game');
    const highScore = localStorage.getItem('highScore') || 0;
    if (this.score > highScore) {
      localStorage.setItem('highScore', this.score);
    }
  }
}

// =============================================
// CONFIG
// =============================================
const CONFIG = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: '#1a1a1a',
  parent: 'game-container',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },
  scene: MainScene // Reference to the MainScene class
};

// =============================================
// GAME MANAGEMENT
// =============================================
let gameInstance;

function startGame() {
  // Cleanup previous game
  if (gameInstance) {
    gameInstance.destroy(true);
    document.getElementById('game-container').innerHTML = '';
  }

  // Create new game
  gameInstance = new Phaser.Game(CONFIG);

  // Update UI visibility
  document.getElementById('start-container').style.display = 'none';
  document.getElementById('ui-container').style.display = 'flex';
  document.getElementById('game-container').style.display = 'block';
}

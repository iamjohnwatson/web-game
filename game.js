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
    this.timeLeft = 150;
    this.currentLevel = 1;
    this.collectibles = null;
    this.powerups = null;
    this.hazards = null;
    this.timerEvent = null;

    // DOM elements
    this.scoreElement = null;
    this.timeElement = null;
    this.levelElement = null;
    this.levelUpElement = null;
    this.gameOverElement = null;
    this.leaderboardElement = null; // For displaying leaderboard
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
    this.load.image('poop', 'assets/poop.png');
    this.load.audio('hit', 'assets/hit.mp3');
    this.load.audio('level_up', 'assets/level_up.mp3');
    this.load.audio('end_game', 'assets/end_game.mp3');
    this.load.image('powerup', 'assets/powerup.png'); // Power-up image
    this.load.audio('powerupSound', 'assets/powerup.mp3'); // Power-up sound
    this.load.audio('bgMusic', 'assets/background_music.mp3'); // Background music
    this.load.image('npc', 'assets/npc.png'); // Load NPC image
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
      .setScale(1.2);
    
    this.collectibles = this.physics.add.group();
    this.powerups = this.physics.add.group();
    this.hazards = this.physics.add.group();

    // Play background music once when the scene starts
    this.bgMusic = this.sound.add('bgMusic', { loop: true, volume: 0.5 }); 
    this.bgMusic.play();

    // Setup controls
    this.controls = this.input.keyboard.createCursorKeys();

    // Initialize UI references
    this.scoreElement = document.getElementById('score');
    this.timeElement = document.getElementById('time');
    this.levelElement = document.getElementById('level');
    this.levelUpElement = document.getElementById('level-up-message');
    this.gameOverElement = document.getElementById('game-over-message');
    this.leaderboardElement = document.getElementById('leaderboard'); // For leaderboard

    this.resetGameState();
    this.initializeCollectibles();
    this.initializePowerUps();
    this.initializeHazards();

    // Setup collisions
    this.physics.add.overlap(this.player, this.collectibles, this.obtainCollectible, null, this);
    this.physics.add.overlap(this.player, this.powerups, this.collectPowerUp, null, this);
    this.physics.add.collider(this.player, this.hazards, this.hitHazard, null, this);

    //create npc
    this.npc = this.physics.add.sprite(600, 300, 'npc')
    .setCollideWorldBounds(true)
    .setScale(1.5)
    .setBounce(1) // NPC bounces off walls
    .setVelocity(75,75); // Set NPC velocity

    this.setRandomNPCMovement(); // Set random NPC movement
    
    // Check collision between player and NPC
    this.physics.add.collider(this.player, this.npc, this.hitNPC, null, this);

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

  respawnNPC(npc) {
    console.log("Respawning NPC in a corner...");

    // Define possible corners
    const corners = [
        { x: 50, y: 50 },       // Top-left
        { x: 750, y: 50 },      // Top-right
        { x: 50, y: 550 },      // Bottom-left
        { x: 750, y: 550 }      // Bottom-right
    ];

    // Pick a random corner
    const randomCorner = Phaser.Math.RND.pick(corners);
    
    // Move NPC to the new position
    npc.setPosition(randomCorner.x, randomCorner.y);
}  

  hitNPC(player, npc) {
    console.log("Player hit The Hunter! Both are frozen for 5 seconds...");

    // Stop player movement
    this.player.setVelocity(0);
    this.player.body.moves = false; // Disable player movement

    // Stop NPC movement
    npc.setVelocity(0);
    npc.body.moves = false; // Disable NPC movement

    // ✅ Show freeze message
    let freezeMessage = document.getElementById('freeze-message');

    if (!freezeMessage) {
        freezeMessage = document.createElement('div');
        freezeMessage.id = 'freeze-message';
        freezeMessage.style.position = 'absolute';
        freezeMessage.style.top = '50%';
        freezeMessage.style.left = '50%';
        freezeMessage.style.transform = 'translate(-50%, -50%)';
        freezeMessage.style.padding = '15px';
        freezeMessage.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        freezeMessage.style.color = 'white';
        freezeMessage.style.borderRadius = '8px';
        freezeMessage.style.fontSize = '24px';
        document.body.appendChild(freezeMessage);
    }

    freezeMessage.textContent = "You got caught! Frozen for 5 seconds!";
    freezeMessage.style.display = 'block';

    // ✅ Respawn NPC in a random corner after 5 seconds
    this.time.delayedCall(5000, () => {
        this.player.body.moves = true; // Re-enable player movement
        npc.body.moves = true; // Re-enable NPC movement

        // Move NPC to a random corner
        this.respawnNPC(npc);

        // Restart NPC movement
        this.setRandomNPCMovement();

        freezeMessage.style.display = 'none'; // Hide message
        console.log("Both player and NPC can move again!");
    });
  }


setRandomNPCMovement() {
  if (!this.npc.body.moves) return; // If NPC is frozen, don't move

  this.time.addEvent({
      delay: 2000, // Every 2 seconds, NPC picks a new direction
      callback: () => {
          if (!this.npc.body.moves) return; // If NPC is frozen, don't change direction
          
          const speed = 150;
          const directions = [
              { x: speed, y: 0 },   // Right
              { x: -speed, y: 0 },  // Left
              { x: 0, y: speed },   // Down
              { x: 0, y: -speed }   // Up
          ];
          
          const randomDirection = Phaser.Math.RND.pick(directions);
          this.npc.setVelocity(randomDirection.x, randomDirection.y);
      },
      loop: true
  });
}


  // =============================================
  // GAME LOGIC METHODS
  // =============================================
  resetGameState() {
    this.score = 0;
    this.currentLevel = 1;
    this.timeLeft = 150;
    this.scoreElement.textContent = `SCORE: ${this.score}`;
    this.levelElement.textContent = `LEVEL: ${this.currentLevel}`;
    this.timeElement.textContent = `TIME: ${this.timeLeft}`;
    this.levelUpElement.style.display = 'none';
    this.gameOverElement.style.display = 'none';
  }

  initializeCollectibles() {
    // Clear existing collectibles
    this.collectibles.clear(true, true);
  
    // Max score is 300, distribute points accordingly
    const maxScore = 500;
    
    // Define points per collectible
    const points = { gold: 5, silver: 3, bronze: 1 };
    
    // Calculate how many collectibles of each type we need based on the level
    const totalCollectibles = 12 + this.currentLevel * 4;  // Number of collectibles increases by 2 with each level
    
    // Ensure the total number of collectibles leads to a maximum score of 300
    let goldCount = Math.floor(totalCollectibles * 0.20);  // 20% golds
    let silverCount = Math.floor(totalCollectibles * 0.40);  // 40% silvers
    let bronzeCount = totalCollectibles - (goldCount + silverCount);  // Remaining as bronze
    
    // Adjust if the sum is off due to rounding
    while (goldCount * 5 + silverCount * 3 + bronzeCount * 1 > maxScore) {
      if (goldCount > 0) goldCount--;
      else if (silverCount > 0) silverCount--;
      else bronzeCount--;
    }

    // Generate collectibles (gold, silver, bronze) at random positions
for (let i = 0; i < goldCount; i++) {
  const collectible = this.collectibles.create(0, 0, 'gold');
  this.ensureNoOverlap(collectible, this.collectibles, this.hazards, 100);
}

for (let i = 0; i < silverCount; i++) {
  const collectible = this.collectibles.create(0, 0, 'silver');
  this.ensureNoOverlap(collectible, this.collectibles, this.hazards, 100);
}

for (let i = 0; i < bronzeCount; i++) {
  const collectible = this.collectibles.create(0, 0, 'bronze');
  this.ensureNoOverlap(collectible, this.collectibles, this.hazards, 100);
}
  }

  initializePowerUps() {
    // Clear existing power-ups
    this.powerups.clear(true, true);
  
    // Place power-ups in the corners of the screen
    const corners = [
      { x: 50, y: 50 },         // Top-left
      { x: 750, y: 50 },        // Top-right
      { x: 50, y: 550 },        // Bottom-left
      { x: 750, y: 550 }        // Bottom-right
    ];
  
    // Create 1 power-up at a random corner
    for (let i = 0; i < 1; i++) {  // Increase the number of power-ups
      const corner = Phaser.Math.RND.pick(corners);
      const powerup = this.powerups.create(corner.x, corner.y, 'powerup');
      powerup.setScale(1);  // Increase the scale to make the power-up larger
    }
  
    // Enable overlap detection for power-up collection
    this.physics.add.overlap(this.player, this.powerups, this.collectPowerUp, null, this);
  }
  
  initializeHazards() {
    this.hazards.clear(true, true);
  
    // Calculate the total number of hazards based on the current level, increased by 25% per level
    const baseHazards = 5;
    const increasedHazards = Math.floor(baseHazards + baseHazards * (0.25 * this.currentLevel));
  
    const total = increasedHazards;
    const types = ['hazard', 'poop'];
  
    for (let i = 0; i < total; i++) {
      const hazard = this.hazards.create(0, 0, Phaser.Math.RND.pick(types));
      this.ensureNoOverlap(hazard, this.hazards, this.collectibles, 100); // Ensure no overlap for each hazard
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
    // Log when a collectible is obtained
    console.log(`Collected: ${collectible.texture.key}`);
  
    // Increase score based on collectible type
    const points = { gold: 5, silver: 3, bronze: 1 }[collectible.texture.key];
    this.score += points;
    this.scoreElement.textContent = `SCORE: ${this.score}`;
  
    // Check if score exceeds 300, prevent it from going beyond
    if (this.score > 300) {
      this.score = 300;
      this.scoreElement.textContent = `SCORE: ${this.score}`;
    }
  
    // Destroy the collectible after collection
    collectible.destroy();
  
    // Check if all collectibles are collected to advance the level
    if (this.collectibles.countActive(true) === 0) {
      this.advanceLevel();
    }
  }

  collectPowerUp(player, powerup) {
    this.sound.play('powerupSound'); // Play power-up collection sound

    // Increase time left by 20 seconds
    this.timeLeft += 20;
    this.timeElement.textContent = `TIME: ${this.timeLeft}`;

    // Destroy the collected power-up
    powerup.destroy();

  }

  hitHazard(player, hazard) {
    this.score -= 10;
    this.scoreElement.textContent = `SCORE: ${this.score}`;
    this.timeLeft -= 10;
    if (this.timeLeft < 0) {
      this.timeLeft = 0;
    }
    this.timeElement.textContent = `TIME: ${this.timeLeft}`;
    this.sound.play('hit');

    hazard.setVelocity(Phaser.Math.Between(-300, 300), Phaser.Math.Between(-300, 300));
    hazard.setAngularVelocity(Phaser.Math.Between(100, 300));
    this.time.delayedCall(500, () => hazard.destroy());

    player.setPosition(400, 300);

    let flashCount = 0;
    const flashInterval = 200;
    const totalFlashes = 3;

    const flashPlayer = () => {
      if (flashCount < totalFlashes) {
        player.setTint(0xff0000);
        this.time.delayedCall(flashInterval, () => {
          player.clearTint();
          flashCount++;
          this.time.delayedCall(flashInterval, flashPlayer);
        });
      }
    };

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
      this.initializePowerUps();
      this.initializeHazards();

      this.physics.resume();
      this.timerEvent = this.time.addEvent({
        delay: 1000,
        callback: () => this.updateGameTimer(),
        loop: true
      });
    });
  }

 // At the end of the game
 endGame(message) {
  console.log("Game Over:", message);
  this.physics.pause();

  if (this.timerEvent) {
    this.timerEvent.remove();

    // Display game-over message
    if (this.gameOverElement) {
      this.gameOverElement.textContent = message;
      this.gameOverElement.style.display = 'block';
  }
  // Stop background music
  if (this.bgMusic) {
    this.bgMusic.stop();
  }
  this.sound.play('end_game'); // Play game-over sound
  }

  // Clear the game screen and show final score
  document.getElementById('game-container').style.display = 'none'; // Hide game screen
  document.getElementById('ui-container').style.display = 'none';   // Hide UI container

  // Calculate the final score by adding the remaining time to the score
  const finalScore = this.score + this.timeLeft;

  // Display the final message with the calculated final score
  const gameOverMessage = document.getElementById('game-over-message');
  gameOverMessage.innerHTML = `Congratulations! Final Score: ${finalScore}`;
  gameOverMessage.style.display = 'block'; // Show the final score message

  // Create a name input form to allow the user to enter their name
  const nameInputContainer = document.createElement('div');
  nameInputContainer.id = 'name-input-container';
  nameInputContainer.innerHTML = `  
    <input type="text" id="player-name" placeholder="Enter your name" />
    <button id="submit-score">Submit</button>
  `;
  document.body.appendChild(nameInputContainer);

  // Add event listener for the submit button
  document.getElementById('submit-score').addEventListener('click', () => {
    const playerName = document.getElementById('player-name').value;
    if (playerName) {
      this.saveScore(playerName, finalScore); // Save the score with the player's name
    } else {
      alert('Please enter a name!');
    }
  });

  // Display the leaderboard
  this.displayLeaderboard();
}

// Save score with the player's name
saveScore(playerName, finalScore) {
  const leaderboard = JSON.parse(localStorage.getItem('leaderboard')) || [];
  leaderboard.push({ name: playerName, score: finalScore });
  leaderboard.sort((a, b) => b.score - a.score); // Sort leaderboard by final score (descending)

  // Save the updated leaderboard to localStorage
  localStorage.setItem('leaderboard', JSON.stringify(leaderboard));

  // Hide the name input and display the updated leaderboard
  document.getElementById('name-input-container').style.display = 'none'; // Hide input
  this.displayLeaderboard();
}

// Display the leaderboard
displayLeaderboard() {
  const leaderboardContainer = document.getElementById('leaderboard');
  const leaderboard = JSON.parse(localStorage.getItem('leaderboard')) || [];

  // Clear previous leaderboard content
  leaderboardContainer.innerHTML = '<h2>Leaderboard</h2>';

  // Display the leaderboard in descending order
  leaderboard.forEach((entry, index) => {
    const leaderboardEntry = document.createElement('div');
    leaderboardEntry.classList.add('leaderboard-entry');
    leaderboardEntry.innerHTML = `${index + 1}. ${entry.name} - ${entry.score}`;
    leaderboardContainer.appendChild(leaderboardEntry);
  });

  leaderboardContainer.style.display = 'block'; // Show the leaderboard
}
}

// =============================================
// GAME MANAGEMENT
// =============================================
let gameInstance;

function startGame() {
  if (gameInstance) {
    gameInstance.destroy(true);
    document.getElementById('game-container').innerHTML = '';
  }

  gameInstance = new Phaser.Game(CONFIG);

  document.getElementById('start-container').style.display = 'none';
  document.getElementById('ui-container').style.display = 'flex';
  document.getElementById('game-container').style.display = 'block';
}

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
  scene: MainScene
};

// Define the exitGame function
function exitGame() {
  console.log("Exiting the game...");

  // Option 1: Stop the Phaser game and display a message or return to the start screen
  if (gameInstance) {
    gameInstance.destroy(true); // Stop the game instance
    document.getElementById('game-container').innerHTML = ''; // Clear the game container
    document.getElementById('game-over-message').textContent = 'Game has been exited!';
    document.getElementById('game-over-message').style.display = 'block';
  }

  // Wait for 3 seconds (3000 milliseconds), then redirect to the start page
  setTimeout(() => {
    // Option 2: Redirect to the start page
    window.location.href = 'index.html'; // Replace with the actual URL of your start page
  }, 3000); // 3 seconds delay
}

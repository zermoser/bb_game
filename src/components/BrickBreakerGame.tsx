import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Game constants
const GAME_WIDTH = 320;
const GAME_HEIGHT = 480;
const PADDLE_WIDTH = 60;
const PADDLE_HEIGHT = 8;
const BALL_SIZE = 10;
const BRICK_WIDTH = 28;
const BRICK_HEIGHT = 16;
const BRICK_ROWS = 8;
const BRICK_COLS = 10;
const BRICK_PADDING = 2;

// Types
interface Position {
  x: number;
  y: number;
}

interface Velocity {
  x: number;
  y: number;
}

interface Brick {
  id: string;
  x: number;
  y: number;
  destroyed: boolean;
  color: string;
  points: number;
}

interface GameState {
  paddle: Position;
  ball: Position;
  ballVelocity: Velocity;
  bricks: Brick[];
  score: number;
  lives: number;
  gameOver: boolean;
  gameWon: boolean;
  level: number;
  paused: boolean;
  gameStarted: boolean;
}

// Softer, less harsh colors
const BRICK_CONFIGS = [
  { color: 'bg-rose-400', points: 50 },
  { color: 'bg-orange-400', points: 40 },
  { color: 'bg-amber-400', points: 30 },
  { color: 'bg-emerald-400', points: 20 },
  { color: 'bg-sky-400', points: 15 },
  { color: 'bg-violet-400', points: 15 },
  { color: 'bg-pink-400', points: 10 },
  { color: 'bg-teal-400', points: 10 }
];

// Initialize bricks
const initializeBricks = (): Brick[] => {
  const bricks: Brick[] = [];
  const startX = (GAME_WIDTH - (BRICK_COLS * (BRICK_WIDTH + BRICK_PADDING) - BRICK_PADDING)) / 2;
  
  for (let row = 0; row < BRICK_ROWS; row++) {
    for (let col = 0; col < BRICK_COLS; col++) {
      const config = BRICK_CONFIGS[row % BRICK_CONFIGS.length];
      bricks.push({
        id: `${row}-${col}`,
        x: startX + col * (BRICK_WIDTH + BRICK_PADDING),
        y: 40 + row * (BRICK_HEIGHT + BRICK_PADDING),
        destroyed: false,
        color: config.color,
        points: config.points
      });
    }
  }
  
  return bricks;
};

// Initial game state
const createInitialState = (level: number = 1): GameState => ({
  paddle: { x: GAME_WIDTH / 2 - PADDLE_WIDTH / 2, y: GAME_HEIGHT - 30 },
  ball: { x: GAME_WIDTH / 2, y: GAME_HEIGHT - 50 },
  ballVelocity: { x: 0, y: 0 },
  bricks: initializeBricks(),
  score: 0,
  lives: 3,
  gameOver: false,
  gameWon: false,
  level,
  paused: false,
  gameStarted: false
});

// Individual components
const Paddle: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <div
    className="absolute bg-white shadow-md"
    style={{
      left: x,
      top: y,
      width: PADDLE_WIDTH,
      height: PADDLE_HEIGHT,
      borderRadius: '4px',
    }}
  />
);

const Ball: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <div
    className="absolute bg-white shadow-md"
    style={{
      left: x - BALL_SIZE / 2,
      top: y - BALL_SIZE / 2,
      width: BALL_SIZE,
      height: BALL_SIZE,
      borderRadius: '50%',
    }}
  />
);

const Brick: React.FC<{ brick: Brick }> = ({ brick }) => {
  if (brick.destroyed) return null;
  
  return (
    <motion.div
      className={`absolute ${brick.color} shadow-sm`}
      style={{
        left: brick.x,
        top: brick.y,
        width: BRICK_WIDTH,
        height: BRICK_HEIGHT,
        borderRadius: '3px',
      }}
      initial={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.8, opacity: 0 }}
      transition={{ duration: 0.2 }}
    />
  );
};

const GameStats: React.FC<{ 
  score: number; 
  lives: number; 
  level: number; 
}> = ({ score, lives, level }) => (
  <div className="bg-white bg-opacity-95 backdrop-blur-sm p-4 rounded-xl shadow-lg mb-4">
    <div className="flex justify-between items-center">
      <div className="text-center">
        <div className="text-2xl font-bold text-gray-800">{score}</div>
        <div className="text-xs text-gray-600">SCORE</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-gray-800">{level}</div>
        <div className="text-xs text-gray-600">LEVEL</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-red-500">{'❤️'.repeat(lives)}</div>
        <div className="text-xs text-gray-600">LIVES</div>
      </div>
    </div>
  </div>
);

const StartScreen: React.FC<{ onStart: () => void }> = ({ onStart }) => (
  <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-purple-50 bg-opacity-95 backdrop-blur-sm flex items-center justify-center z-20">
    <div className="text-center p-6">
      <div className="text-6xl mb-4">🎮</div>
      <h1 className="text-3xl font-bold mb-4 text-gray-800">Brick Breaker</h1>
      <p className="text-lg mb-6 text-gray-600">Break all the bricks!</p>
      <div className="space-y-2 mb-6 text-sm text-gray-500">
        <p>📱 Drag the paddle to move</p>
        <p>🎯 Different colors = Different points</p>
        <p>❤️ You have 3 lives</p>
      </div>
      <button
        onClick={onStart}
        className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-4 rounded-full text-lg font-bold shadow-lg transition-all transform hover:scale-105 active:scale-95"
      >
        Start Game
      </button>
    </div>
  </div>
);

const GameOverScreen: React.FC<{ 
  gameWon: boolean; 
  score: number; 
  level: number;
  onRestart: () => void;
  onNextLevel: () => void;
}> = ({ gameWon, score, onRestart, onNextLevel }) => (
  <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-purple-50 bg-opacity-95 backdrop-blur-sm flex items-center justify-center z-20">
    <motion.div
      className="bg-white p-6 rounded-2xl shadow-xl text-center mx-4 max-w-sm"
      initial={{ scale: 0.8, opacity: 0, y: 20 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="text-6xl mb-4">{gameWon ? '🎉' : '😢'}</div>
      <h2 className="text-2xl font-bold mb-4 text-gray-800">
        {gameWon ? 'Level Complete!' : 'Game Over'}
      </h2>
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <div className="text-2xl font-bold text-blue-600 mb-1">{score}</div>
        <div className="text-sm text-gray-600">Final Score</div>
      </div>
      <div className="flex gap-3 justify-center">
        <button
          onClick={onRestart}
          className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-full font-medium shadow-md transition-all transform hover:scale-105 active:scale-95"
        >
          Play Again
        </button>
        {gameWon && (
          <button
            onClick={onNextLevel}
            className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-full font-medium shadow-md transition-all transform hover:scale-105 active:scale-95"
          >
            Next Level
          </button>
        )}
      </div>
    </motion.div>
  </div>
);

const PauseScreen: React.FC<{ onResume: () => void }> = ({ onResume }) => (
  <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-purple-50 bg-opacity-95 backdrop-blur-sm flex items-center justify-center z-10">
    <motion.div
      className="bg-white p-6 rounded-2xl shadow-xl text-center"
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
    >
      <div className="text-4xl mb-4">⏸️</div>
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Paused</h2>
      <button
        onClick={onResume}
        className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-full font-medium shadow-md transition-all transform hover:scale-105 active:scale-95"
      >
        Resume
      </button>
    </motion.div>
  </div>
);

// Main game component
const BrickBreakerGame: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(createInitialState());
  const [keys, setKeys] = useState<{ [key: string]: boolean }>({});
  const [bestScore, setBestScore] = useState<number>(0);
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>(0);

  // Collision detection
  const checkCollision = useCallback((
    obj1: { x: number; y: number; width: number; height: number },
    obj2: { x: number; y: number; width: number; height: number }
  ): boolean => {
    return (
      obj1.x < obj2.x + obj2.width &&
      obj1.x + obj1.width > obj2.x &&
      obj1.y < obj2.y + obj2.height &&
      obj1.y + obj1.height > obj2.y
    );
  }, []);

  // Game loop
  const gameLoop = useCallback(() => {
    setGameState(prevState => {
      if (prevState.gameOver || prevState.gameWon || prevState.paused || !prevState.gameStarted) {
        return prevState;
      }

      const newState = { ...prevState };
      
      // Move paddle based on keyboard input
      if (keys['ArrowLeft'] && newState.paddle.x > 0) {
        newState.paddle.x = Math.max(0, newState.paddle.x - 5);
      }
      if (keys['ArrowRight'] && newState.paddle.x < GAME_WIDTH - PADDLE_WIDTH) {
        newState.paddle.x = Math.min(GAME_WIDTH - PADDLE_WIDTH, newState.paddle.x + 5);
      }

      // Move ball
      newState.ball.x += newState.ballVelocity.x;
      newState.ball.y += newState.ballVelocity.y;

      // Ball collision with walls
      if (newState.ball.x <= BALL_SIZE / 2 || newState.ball.x >= GAME_WIDTH - BALL_SIZE / 2) {
        newState.ballVelocity.x = -newState.ballVelocity.x;
        newState.ball.x = Math.max(BALL_SIZE / 2, Math.min(GAME_WIDTH - BALL_SIZE / 2, newState.ball.x));
      }
      if (newState.ball.y <= BALL_SIZE / 2) {
        newState.ballVelocity.y = -newState.ballVelocity.y;
        newState.ball.y = BALL_SIZE / 2;
      }

      // Ball collision with paddle
      const paddleCollision = checkCollision(
        { x: newState.ball.x - BALL_SIZE / 2, y: newState.ball.y - BALL_SIZE / 2, width: BALL_SIZE, height: BALL_SIZE },
        { x: newState.paddle.x, y: newState.paddle.y, width: PADDLE_WIDTH, height: PADDLE_HEIGHT }
      );

      if (paddleCollision && newState.ballVelocity.y > 0) {
        newState.ballVelocity.y = -Math.abs(newState.ballVelocity.y);
        
        // Add angle based on paddle hit position
        const hitPos = (newState.ball.x - (newState.paddle.x + PADDLE_WIDTH / 2)) / (PADDLE_WIDTH / 2);
        const maxAngle = Math.PI / 4; // 45 degrees
        const angle = hitPos * maxAngle;
        const speed = Math.sqrt(newState.ballVelocity.x * newState.ballVelocity.x + newState.ballVelocity.y * newState.ballVelocity.y);
        
        newState.ballVelocity.x = Math.sin(angle) * speed;
        newState.ballVelocity.y = -Math.cos(angle) * speed;
      }

      // Ball collision with bricks
      newState.bricks.forEach(brick => {
        if (!brick.destroyed) {
          const brickCollision = checkCollision(
            { x: newState.ball.x - BALL_SIZE / 2, y: newState.ball.y - BALL_SIZE / 2, width: BALL_SIZE, height: BALL_SIZE },
            { x: brick.x, y: brick.y, width: BRICK_WIDTH, height: BRICK_HEIGHT }
          );

          if (brickCollision) {
            brick.destroyed = true;
            newState.score += brick.points;
            
            // Determine bounce direction based on collision side
            const ballCenterX = newState.ball.x;
            const ballCenterY = newState.ball.y;
            const brickCenterX = brick.x + BRICK_WIDTH / 2;
            const brickCenterY = brick.y + BRICK_HEIGHT / 2;
            
            const dx = ballCenterX - brickCenterX;
            const dy = ballCenterY - brickCenterY;
            
            if (Math.abs(dx) > Math.abs(dy)) {
              newState.ballVelocity.x = -newState.ballVelocity.x;
            } else {
              newState.ballVelocity.y = -newState.ballVelocity.y;
            }
          }
        }
      });

      // Check win condition
      const remainingBricks = newState.bricks.filter(brick => !brick.destroyed);
      if (remainingBricks.length === 0) {
        newState.gameWon = true;
      }

      // Check game over condition
      if (newState.ball.y > GAME_HEIGHT) {
        newState.lives--;
        if (newState.lives <= 0) {
          newState.gameOver = true;
        } else {
          // Reset ball position
          newState.ball = { x: GAME_WIDTH / 2, y: GAME_HEIGHT - 50 };
          newState.ballVelocity = { x: 0, y: 0 };
          newState.gameStarted = false;
        }
      }

      return newState;
    });

    if (!gameState.gameOver && !gameState.gameWon && !gameState.paused && gameState.gameStarted) {
      animationRef.current = requestAnimationFrame(gameLoop);
    }
  }, [keys, checkCollision, gameState.gameOver, gameState.gameWon, gameState.paused, gameState.gameStarted]);

  // Start game loop
  useEffect(() => {
    if (gameState.gameStarted && !gameState.gameOver && !gameState.gameWon && !gameState.paused) {
      animationRef.current = requestAnimationFrame(gameLoop);
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameLoop, gameState.gameStarted, gameState.gameOver, gameState.gameWon, gameState.paused]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
        e.preventDefault();
        setKeys(prev => ({ ...prev, [e.code]: true }));
      }
      if (e.code === 'Space') {
        e.preventDefault();
        if (!gameState.gameStarted && !gameState.gameOver && !gameState.gameWon) {
          startGame();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
        e.preventDefault();
        setKeys(prev => ({ ...prev, [e.code]: false }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState.gameStarted, gameState.gameOver, gameState.gameWon]);

  // Touch controls
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    if (!gameState.gameStarted && !gameState.gameOver && !gameState.gameWon) {
      startGame();
      return;
    }
    
    const touch = e.touches[0];
    const rect = gameAreaRef.current?.getBoundingClientRect();
    if (rect) {
      const x = touch.clientX - rect.left;
      const scale = GAME_WIDTH / rect.width;
      const gameX = x * scale;
      
      setGameState(prev => ({
        ...prev,
        paddle: { 
          ...prev.paddle, 
          x: Math.max(0, Math.min(GAME_WIDTH - PADDLE_WIDTH, gameX - PADDLE_WIDTH / 2))
        }
      }));
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = gameAreaRef.current?.getBoundingClientRect();
    if (rect) {
      const x = touch.clientX - rect.left;
      const scale = GAME_WIDTH / rect.width;
      const gameX = x * scale;
      
      setGameState(prev => ({
        ...prev,
        paddle: { 
          ...prev.paddle, 
          x: Math.max(0, Math.min(GAME_WIDTH - PADDLE_WIDTH, gameX - PADDLE_WIDTH / 2))
        }
      }));
    }
  };

  // Game controls
  const startGame = () => {
    setGameState(prev => ({
      ...prev,
      gameStarted: true,
      ballVelocity: { x: 2 + prev.level * 0.3, y: -(2.5 + prev.level * 0.3) }
    }));
  };

  const togglePause = () => {
    setGameState(prev => ({ ...prev, paused: !prev.paused }));
  };

  const restartGame = () => {
    if (gameState.score > bestScore) {
      setBestScore(gameState.score);
    }
    setGameState(createInitialState());
    setKeys({});
  };

  const nextLevel = () => {
    if (gameState.score > bestScore) {
      setBestScore(gameState.score);
    }
    setGameState(prev => ({
      ...createInitialState(prev.level + 1),
      score: prev.score
    }));
    setKeys({});
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-purple-50 to-pink-100 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <GameStats 
          score={gameState.score} 
          lives={gameState.lives}
          level={gameState.level}
        />
        
        {bestScore > 0 && (
          <div className="text-center bg-white bg-opacity-80 backdrop-blur-sm rounded-lg p-2 mb-4">
            <div className="text-sm text-gray-600">Best Score</div>
            <div className="text-lg font-bold text-blue-600">{bestScore}</div>
          </div>
        )}
        
        <div 
          ref={gameAreaRef}
          className="relative bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl mx-auto overflow-hidden shadow-2xl"
          style={{
            width: '100%',
            aspectRatio: `${GAME_WIDTH}/${GAME_HEIGHT}`,
            maxWidth: '320px'
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
        >
          {/* Game elements */}
          <Paddle x={gameState.paddle.x} y={gameState.paddle.y} />
          <Ball x={gameState.ball.x} y={gameState.ball.y} />
          
          {/* Bricks */}
          <AnimatePresence>
            {gameState.bricks.map(brick => (
              <Brick key={brick.id} brick={brick} />
            ))}
          </AnimatePresence>

          {/* Start screen */}
          {!gameState.gameStarted && !gameState.gameOver && !gameState.gameWon && (
            <StartScreen onStart={startGame} />
          )}

          {/* Pause screen */}
          {gameState.paused && (
            <PauseScreen onResume={togglePause} />
          )}

          {/* Game over screen */}
          {(gameState.gameOver || gameState.gameWon) && (
            <GameOverScreen
              gameWon={gameState.gameWon}
              score={gameState.score}
              level={gameState.level}
              onRestart={restartGame}
              onNextLevel={nextLevel}
            />
          )}
        </div>
        
        {/* Game Controls */}
        <div className="flex justify-center gap-4 mt-4">
          <button
            onClick={togglePause}
            className="bg-white bg-opacity-90 backdrop-blur-sm hover:bg-opacity-100 text-gray-700 px-4 py-2 rounded-full font-medium shadow-md transition-all transform hover:scale-105 active:scale-95"
            disabled={!gameState.gameStarted || gameState.gameOver || gameState.gameWon}
          >
            {gameState.paused ? '▶️' : '⏸️'}
          </button>
          <button
            onClick={restartGame}
            className="bg-white bg-opacity-90 backdrop-blur-sm hover:bg-opacity-100 text-gray-700 px-4 py-2 rounded-full font-medium shadow-md transition-all transform hover:scale-105 active:scale-95"
          >
            🔄
          </button>
        </div>
        
        <div className="text-center text-gray-500 mt-4 text-sm bg-white bg-opacity-70 backdrop-blur-sm rounded-lg p-2">
          {!gameState.gameStarted ? 'Tap screen to start' : 'Drag to move paddle'}
        </div>
      </div>
    </div>
  );
};

export default BrickBreakerGame;
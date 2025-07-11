import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Howl } from 'howler';

// Game constants
const GAME_WIDTH = 320;
const GAME_HEIGHT = 480;
const PADDLE_WIDTH = 70;
const PADDLE_HEIGHT = 10;
const BALL_SIZE = 12;
const BRICK_WIDTH = 28;
const BRICK_HEIGHT = 18;
const BRICK_ROWS = 7;
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

interface Particle {
  id: string;
  x: number;
  y: number;
  color: string;
  size: number;
  vx: number;
  vy: number;
  life: number;
}

interface GameState {
  paddle: Position;
  ball: Position;
  ballVelocity: Velocity;
  bricks: Brick[];
  particles: Particle[];
  score: number;
  lives: number;
  gameOver: boolean;
  gameWon: boolean;
  level: number;
  paused: boolean;
  gameStarted: boolean;
}

// Soft color gradients for bricks
const BRICK_CONFIGS = [
  { color: 'bg-gradient-to-r from-rose-200 to-rose-300', points: 50 },
  { color: 'bg-gradient-to-r from-amber-200 to-amber-300', points: 40 },
  { color: 'bg-gradient-to-r from-emerald-200 to-emerald-300', points: 30 },
  { color: 'bg-gradient-to-r from-sky-200 to-sky-300', points: 25 },
  { color: 'bg-gradient-to-r from-violet-200 to-violet-300', points: 20 },
  { color: 'bg-gradient-to-r from-pink-200 to-pink-300', points: 15 },
  { color: 'bg-gradient-to-r from-teal-200 to-teal-300', points: 10 }
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
        y: 50 + row * (BRICK_HEIGHT + BRICK_PADDING),
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
  paddle: { x: GAME_WIDTH / 2 - PADDLE_WIDTH / 2, y: GAME_HEIGHT - 40 },
  ball: { x: GAME_WIDTH / 2, y: GAME_HEIGHT - 60 },
  ballVelocity: { x: 0, y: 0 },
  bricks: initializeBricks(),
  particles: [],
  score: 0,
  lives: 3,
  gameOver: false,
  gameWon: false,
  level,
  paused: false,
  gameStarted: false
});

// Sound effects
const createSound = (src: string) => new Howl({ src: [src], volume: 0.3 });
const sounds = {
  paddleHit: createSound('https://assets.mixkit.co/sfx/preview/mixkit-game-ball-tap-2073.mp3'),
  brickHit: createSound('https://assets.mixkit.co/sfx/preview/mixkit-arcade-game-jump-coin-216.mp3'),
  gameOver: createSound('https://assets.mixkit.co/sfx/preview/mixkit-falling-game-over-1942.mp3'),
  levelComplete: createSound('https://assets.mixkit.co/sfx/preview/mixkit-winning-chimes-2015.mp3'),
  lifeLost: createSound('https://assets.mixkit.co/sfx/preview/mixkit-retro-arcade-lose-2027.mp3'),
  start: createSound('https://assets.mixkit.co/sfx/preview/mixkit-game-show-suspense-waiting-667.mp3')
};

// Individual components
const Paddle: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <motion.div
    className="absolute bg-gradient-to-r from-blue-400 to-blue-500 shadow-lg"
    style={{
      left: x,
      top: y,
      width: PADDLE_WIDTH,
      height: PADDLE_HEIGHT,
      borderRadius: '6px',
    }}
    whileHover={{ scale: 1.05 }}
    transition={{ type: "spring", stiffness: 300 }}
  />
);

const Ball: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <motion.div
    className="absolute bg-gradient-to-r from-yellow-300 to-yellow-400 shadow-lg"
    style={{
      left: x - BALL_SIZE / 2,
      top: y - BALL_SIZE / 2,
      width: BALL_SIZE,
      height: BALL_SIZE,
      borderRadius: '50%',
    }}
    animate={{
      scale: [1, 1.1, 1],
      rotate: [0, 360]
    }}
    transition={{
      scale: { duration: 0.5, repeat: Infinity },
      rotate: { duration: 1, repeat: Infinity, ease: "linear" }
    }}
  />
);

const Brick: React.FC<{ brick: Brick }> = ({ brick }) => {
  if (brick.destroyed) return null;

  return (
    <motion.div
      className={`absolute ${brick.color} shadow-md border border-white/20`}
      style={{
        left: brick.x,
        top: brick.y,
        width: BRICK_WIDTH,
        height: BRICK_HEIGHT,
        borderRadius: '4px',
      }}
      initial={{ scale: 1, opacity: 1 }}
      exit={{
        scale: 0,
        opacity: 0,
        rotate: 180
      }}
      transition={{ duration: 0.3 }}
      whileHover={{ scale: 1.05 }}
    />
  );
};

const Particle: React.FC<{ particle: Particle }> = ({ particle }) => {
  return (
    <motion.div
      className="absolute rounded-full"
      style={{
        left: particle.x,
        top: particle.y,
        width: particle.size,
        height: particle.size,
        background: particle.color,
        opacity: particle.life
      }}
      animate={{ 
        x: particle.x + particle.vx * 20,
        y: particle.y + particle.vy * 20,
        opacity: 0
      }}
      transition={{ duration: 0.5 }}
    />
  );
};

const GameStats: React.FC<{
  score: number;
  lives: number;
  level: number;
}> = ({ score, lives, level }) => (
  <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl shadow-lg mb-4 border border-white/30">
    <div className="grid grid-cols-3 gap-4 text-center">
      <div>
        <div className="text-2xl font-bold text-gray-800">{score.toLocaleString()}</div>
        <div className="text-xs text-gray-600 font-medium">SCORE</div>
      </div>
      <div>
        <div className="text-2xl font-bold text-purple-600">{level}</div>
        <div className="text-xs text-gray-600 font-medium">LEVEL</div>
      </div>
      <div>
        <div className="text-2xl flex justify-center">
          {Array.from({ length: lives }).map((_, i) => (
            <motion.span 
              key={i} 
              className="text-red-400"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              ❤️
            </motion.span>
          ))}
        </div>
        <div className="text-xs text-gray-600 font-medium">LIVES</div>
      </div>
    </div>
  </div>
);

const StartScreen: React.FC<{ onStart: () => void }> = ({ onStart }) => (
  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20 backdrop-blur-md flex items-center justify-center z-20">
    <motion.div
      className="text-center p-8 bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl max-w-xs mx-4"
      initial={{ scale: 0.8, opacity: 0, y: 20 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        className="text-6xl mb-4"
        animate={{ rotate: [0, 10, -10, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        🎮
      </motion.div>
      <h1 className="text-3xl font-bold mb-2 text-gray-800">Brick Breaker</h1>
      <p className="text-gray-600 mb-6">เล่นสนุกกับการทำลายอิฐ!</p>
      <div className="space-y-2 mb-6 text-sm text-gray-600">
        <div className="flex items-center justify-center gap-2">
          <span>📱</span>
          <span>ลากแป้นหรือใช้ปุ่มซ้ายขวา</span>
        </div>
        <div className="flex items-center justify-center gap-2">
          <span>🎯</span>
          <span>สีต่างกัน = คะแนนต่างกัน</span>
        </div>
        <div className="flex items-center justify-center gap-2">
          <span>💖</span>
          <span>มีชีวิต 3 ครั้ง</span>
        </div>
      </div>
      <motion.button
        onClick={onStart}
        className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white px-8 py-4 rounded-2xl text-lg font-bold shadow-lg transition-all"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        เริ่มเล่น
      </motion.button>
    </motion.div>
  </div>
);

const GameOverScreen: React.FC<{
  gameWon: boolean;
  score: number;
  level: number;
  onRestart: () => void;
  onNextLevel: () => void;
}> = ({ gameWon, score, onRestart, onNextLevel }) => (
  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20 backdrop-blur-md flex items-center justify-center z-20">
    <motion.div
      className="bg-white/90 backdrop-blur-sm p-8 rounded-3xl shadow-2xl text-center mx-4 max-w-xs"
      initial={{ scale: 0.8, opacity: 0, y: 20 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        className="text-6xl mb-4"
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 0.5, repeat: 3 }}
      >
        {gameWon ? '🎉' : '😢'}
      </motion.div>
      <h2 className="text-2xl font-bold mb-4 text-gray-800">
        {gameWon ? 'ผ่านด่าน!' : 'เกมจบ'}
      </h2>
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-4 mb-6 border border-blue-200">
        <div className="text-3xl font-bold text-blue-600 mb-1">{score.toLocaleString()}</div>
        <div className="text-sm text-gray-600">คะแนนสุดท้าย</div>
      </div>
      <div className="flex gap-3 justify-center">
        <motion.button
          onClick={onRestart}
          className="bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white px-6 py-3 rounded-2xl font-medium shadow-lg transition-all"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          เล่นใหม่
        </motion.button>
        {gameWon && (
          <motion.button
            onClick={onNextLevel}
            className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-6 py-3 rounded-2xl font-medium shadow-lg transition-all"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            ด่านต่อไป
          </motion.button>
        )}
      </div>
    </motion.div>
  </div>
);

const PauseScreen: React.FC<{ onResume: () => void }> = ({ onResume }) => (
  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20 backdrop-blur-md flex items-center justify-center z-10">
    <motion.div
      className="bg-white/90 backdrop-blur-sm p-8 rounded-3xl shadow-2xl text-center"
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
    >
      <div className="text-4xl mb-4">⏸️</div>
      <h2 className="text-2xl font-bold mb-4 text-gray-800">หยุดชั่วคราว</h2>
      <motion.button
        onClick={onResume}
        className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white px-6 py-3 rounded-2xl font-medium shadow-lg transition-all"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        เล่นต่อ
      </motion.button>
    </motion.div>
  </div>
);

// Main game component
const BrickBreakerGame: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(createInitialState());
  const [bestScore, setBestScore] = useState<number>(0);
  const [isDragging, setIsDragging] = useState(false);
  const [keys, setKeys] = useState({ left: false, right: false });
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>(0);
  const lastTouchRef = useRef<{ x: number; time: number } | null>(null);
  const soundsRef = useRef(sounds);

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

  // Create particles effect
  const createParticles = useCallback((x: number, y: number, color: string, count: number = 8) => {
    const newParticles: Particle[] = [];
    
    for (let i = 0; i < count; i++) {
      newParticles.push({
        id: `${Date.now()}-${i}`,
        x,
        y,
        color,
        size: Math.random() * 4 + 2,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
        life: 1
      });
    }
    
    return newParticles;
  }, []);

  // Adjust velocity to maintain consistent speed
  const adjustVelocity = useCallback((velocity: Velocity): Velocity => {
    const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
    const minSpeed = 2.0 + gameState.level * 0.3;
    const maxSpeed = 5.0;
    
    if (speed < minSpeed) {
      return {
        x: (velocity.x / speed) * minSpeed,
        y: (velocity.y / speed) * minSpeed
      };
    } else if (speed > maxSpeed) {
      return {
        x: (velocity.x / speed) * maxSpeed,
        y: (velocity.y / speed) * maxSpeed
      };
    }
    return velocity;
  }, [gameState.level]);

  // Game loop
  const gameLoop = useCallback(() => {
    setGameState(prevState => {
      if (prevState.gameOver || prevState.gameWon || prevState.paused || !prevState.gameStarted) {
        return prevState;
      }

      const newState = { ...prevState };
      
      // Move paddle with keyboard
      if (keys.left) {
        newState.paddle.x = Math.max(0, newState.paddle.x - 8);
      }
      if (keys.right) {
        newState.paddle.x = Math.min(GAME_WIDTH - PADDLE_WIDTH, newState.paddle.x + 8);
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
        soundsRef.current.paddleHit.play();
        newState.ballVelocity.y = -Math.abs(newState.ballVelocity.y);

        // Add angle based on paddle hit position
        const hitPos = (newState.ball.x - (newState.paddle.x + PADDLE_WIDTH / 2)) / (PADDLE_WIDTH / 2);
        const maxAngle = Math.PI / 3; // 60 degrees
        const angle = hitPos * maxAngle;
        const baseSpeed = 1.8 + newState.level * 0.3;

        newState.ballVelocity.x = Math.sin(angle) * baseSpeed;
        newState.ballVelocity.y = -Math.cos(angle) * baseSpeed;
        
        // Create particles
        newState.particles = [
          ...newState.particles,
          ...createParticles(
            newState.ball.x, 
            newState.ball.y, 
            'bg-gradient-to-r from-blue-400 to-blue-500',
            6
          )
        ];
      }

      // Ball collision with bricks
      newState.bricks.forEach(brick => {
        if (!brick.destroyed) {
          const brickCollision = checkCollision(
            { x: newState.ball.x - BALL_SIZE / 2, y: newState.ball.y - BALL_SIZE / 2, width: BALL_SIZE, height: BALL_SIZE },
            { x: brick.x, y: brick.y, width: BRICK_WIDTH, height: BRICK_HEIGHT }
          );

          if (brickCollision) {
            soundsRef.current.brickHit.play();
            brick.destroyed = true;
            newState.score += brick.points;

            // Create particles
            newState.particles = [
              ...newState.particles,
              ...createParticles(
                brick.x + BRICK_WIDTH / 2, 
                brick.y + BRICK_HEIGHT / 2, 
                brick.color,
                8
              )
            ];

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

      // Update particles
      newState.particles = newState.particles
        .map(p => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          life: p.life - 0.02
        }))
        .filter(p => p.life > 0);

      // Adjust velocity to maintain consistent speed
      newState.ballVelocity = adjustVelocity(newState.ballVelocity);

      // Check win condition
      const remainingBricks = newState.bricks.filter(brick => !brick.destroyed);
      if (remainingBricks.length === 0 && newState.bricks.length > 0) {
        newState.gameWon = true;
        soundsRef.current.levelComplete.play();
      }

      // Check game over condition
      if (newState.ball.y > GAME_HEIGHT) {
        soundsRef.current.lifeLost.play();
        newState.lives--;
        if (newState.lives <= 0) {
          newState.gameOver = true;
          soundsRef.current.gameOver.play();
        } else {
          // Reset ball position
          newState.ball = { x: GAME_WIDTH / 2, y: GAME_HEIGHT - 60 };
          newState.ballVelocity = { x: 0, y: 0 };
          newState.gameStarted = false;
        }
      }

      return newState;
    });

    animationRef.current = requestAnimationFrame(gameLoop);
  }, [checkCollision, createParticles, adjustVelocity, keys]);

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

  // Keyboard event listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') setKeys(prev => ({ ...prev, left: true }));
      if (e.key === 'ArrowRight') setKeys(prev => ({ ...prev, right: true }));
      if (e.key === 'p' || e.key === ' ') {
        togglePause();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') setKeys(prev => ({ ...prev, left: false }));
      if (e.key === 'ArrowRight') setKeys(prev => ({ ...prev, right: false }));
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Convert screen coordinates to game coordinates
  const getGameCoordinate = (clientX: number): number => {
    const rect = gameAreaRef.current?.getBoundingClientRect();
    if (!rect) return 0;

    const x = clientX - rect.left;
    const scale = GAME_WIDTH / rect.width;
    return x * scale;
  };

  // Touch controls
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];

    if (!gameState.gameStarted && !gameState.gameOver && !gameState.gameWon) {
      startGame();
      return;
    }

    setIsDragging(true);
    const gameX = getGameCoordinate(touch.clientX);
    lastTouchRef.current = { x: gameX, time: Date.now() };

    setGameState(prev => ({
      ...prev,
      paddle: {
        ...prev.paddle,
        x: Math.max(0, Math.min(GAME_WIDTH - PADDLE_WIDTH, gameX - PADDLE_WIDTH / 2))
      }
    }));
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    if (!isDragging) return;

    const touch = e.touches[0];
    const gameX = getGameCoordinate(touch.clientX);

    setGameState(prev => ({
      ...prev,
      paddle: {
        ...prev.paddle,
        x: Math.max(0, Math.min(GAME_WIDTH - PADDLE_WIDTH, gameX - PADDLE_WIDTH / 2))
      }
    }));
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    setIsDragging(false);
    lastTouchRef.current = null;
  };

  // Mouse controls for desktop
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!gameState.gameStarted && !gameState.gameOver && !gameState.gameWon) {
      startGame();
      return;
    }

    setIsDragging(true);
    const gameX = getGameCoordinate(e.clientX);

    setGameState(prev => ({
      ...prev,
      paddle: {
        ...prev.paddle,
        x: Math.max(0, Math.min(GAME_WIDTH - PADDLE_WIDTH, gameX - PADDLE_WIDTH / 2))
      }
    }));
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;

    const gameX = getGameCoordinate(e.clientX);

    setGameState(prev => ({
      ...prev,
      paddle: {
        ...prev.paddle,
        x: Math.max(0, Math.min(GAME_WIDTH - PADDLE_WIDTH, gameX - PADDLE_WIDTH / 2))
      }
    }));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Add global mouse event listeners
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      const gameX = getGameCoordinate(e.clientX);

      setGameState(prev => ({
        ...prev,
        paddle: {
          ...prev.paddle,
          x: Math.max(0, Math.min(GAME_WIDTH - PADDLE_WIDTH, gameX - PADDLE_WIDTH / 2))
        }
      }));
    };

    const handleGlobalMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging]);

  // Game controls
  const startGame = () => {
    soundsRef.current.start.play();
    setGameState(prev => ({
      ...prev,
      gameStarted: true,
      ballVelocity: {
        x: (Math.random() - 0.5) * 1.5,
        y: -(2 + prev.level * 0.3)
      }
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
    setIsDragging(false);
  };

  const nextLevel = () => {
    if (gameState.score > bestScore) {
      setBestScore(gameState.score);
    }
    setGameState(prev => ({
      ...createInitialState(prev.level + 1),
      score: prev.score
    }));
    setIsDragging(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <GameStats
          score={gameState.score}
          lives={gameState.lives}
          level={gameState.level}
        />

        {bestScore > 0 && (
          <motion.div
            className="text-center bg-white/70 backdrop-blur-sm rounded-xl p-3 mb-4 border border-white/30"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="text-sm text-gray-600">🏆 สถิติที่ดีที่สุด</div>
            <div className="text-xl font-bold text-purple-600">{bestScore.toLocaleString()}</div>
          </motion.div>
        )}

        <div
          ref={gameAreaRef}
          className="relative bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl mx-auto overflow-hidden shadow-2xl border-4 border-white/20"
          style={{
            width: '100%',
            aspectRatio: `${GAME_WIDTH}/${GAME_HEIGHT}`,
            maxWidth: '320px',
            touchAction: 'none'
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          {/* Decorative background pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-purple-400" />
          </div>

          {/* Game elements */}
          <Paddle x={gameState.paddle.x} y={gameState.paddle.y} />
          <Ball x={gameState.ball.x} y={gameState.ball.y} />

          {/* Particles */}
          <AnimatePresence>
            {gameState.particles.map(particle => (
              <Particle key={particle.id} particle={particle} />
            ))}
          </AnimatePresence>

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
        <div className="flex justify-center gap-4 mt-6">
          <motion.button
            onClick={togglePause}
            className="bg-white/80 backdrop-blur-sm hover:bg-white/90 text-gray-700 px-6 py-3 rounded-2xl font-medium shadow-lg transition-all border border-white/30"
            disabled={!gameState.gameStarted || gameState.gameOver || gameState.gameWon}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {gameState.paused ? '▶️ เล่นต่อ' : '⏸️ หยุด'}
          </motion.button>
          <motion.button
            onClick={restartGame}
            className="bg-white/80 backdrop-blur-sm hover:bg-white/90 text-gray-700 px-6 py-3 rounded-2xl font-medium shadow-lg transition-all border border-white/30"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            🔄 เริ่มใหม่
          </motion.button>
        </div>

        <motion.div
          className="text-center text-gray-600 mt-4 text-sm bg-white/60 backdrop-blur-sm rounded-xl p-3 border border-white/30"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {!gameState.gameStarted ?
            '👆 แตะหน้าจอเพื่อเริ่มเล่น' :
            '👆 ลากแป้นหรือใช้ปุ่มซ้ายขวาเพื่อเล่น'
          }
        </motion.div>
      </div>
    </div>
  );
};

export default BrickBreakerGame;
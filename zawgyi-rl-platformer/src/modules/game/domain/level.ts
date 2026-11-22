export interface GroundSegment {
  start: number;
  end: number;
}

export const LEVEL = {
  id: 'himavanta-01',
  width: 1550,
  height: 540,
  groundY: 420,
  spawnX: 80,
  goalX: 1470,
  maxSteps: 1200,
  // There are three gaps: 280–345, 650–715, 1050–1125.
  ground: [
    { start: 0, end: 280 },
    { start: 345, end: 650 },
    { start: 715, end: 1050 },
    { start: 1125, end: 1550 },
  ] satisfies GroundSegment[],
} as const;

export const FIXED_DT = 1 / 60; // 60 FPS
export const EVALUATION = { everyEpisodes: 100, patience: 5 } as const;
export const TRAINING = { defaultStepBudget: 1_000_000, maxStepBudget: 50_000_000 } as const;
export const RUN_SPEED = 180;
export const GRAVITY = 900;
export const JUMP_SPEED = 390;

export const TIMING = {
  millisecondsPerSecond: 1000,
  tickMs: 1000 * FIXED_DT,
  maxFrameDelta: 0.1,
  maxStepsPerFrame: 5,
  humanSnapshotMs: 33,
  workerSnapshotMs: 80,
  pausedPollMs: 30,
  maxSpeedYieldSteps: 32,
} as const;

export const REWARDS = {
  step: -0.01,
  progress: 0.05,
  walkingProgress: 0.02,
  jumpTakeoff: -0.5,
  gap: 4,
  success: 100,
  failure: -40,
  safeLandingOffset: 8,
} as const;
export const FALL_MARGIN = 50;
export const OBSERVATION = {
  size: 8,
  gapDistance: 300,
  gapWidth: 100,
  height: 220,
  verticalSpeed: 450,
} as const;
export const Q_BINS = {
  progress: 16,
  gapDistance: 6,
  gapWidth: 3,
  height: 4,
  verticalSpeed: 4,
  nearGapRange: 120,
  nearGapStep: 10,
  farGapStep: 50,
} as const;
export const Q_LEARNING = {
  alpha: 0.1,
  gamma: 0.95,
  epsilon: 1,
  minEpsilon: 0.05,
  epsilonDecay: 0.997,
} as const;
export const OBSERVATION_VERSION = 'v2' as const;
export const REWARD_VERSION = 'v2' as const;
export const VIEW = { width: 960, height: 540, background: '#c4e3d2' } as const;
export const VICTORY = {
  frameWidth: 543,
  frameHeight: 362,
  frameRate: 6,
  lastFrame: 7,
  originX: 0.39,
  originY: 0.93,
} as const;
export const HERO = {
  xEdges: [0, 444, 887, 1331, 1774],
  yEdges: [0, 444, 887],
  height: 82,
  referenceHeight: 444,
  badgeX: -31,
  badgeY: -87,
  badgeRadius: 7,
  badgeStroke: 2,
  badgeStrokeColor: 0xffffff,
  labelY: -91,
  labelFont: 'sans-serif',
  labelSize: '13px',
  labelColor: '#13271b',
  labelBackground: '#ffffffcc',
  labelPadding: { x: 4, y: 2 },
  walkStart: 2,
  walkCount: 4,
  walkMs: 140,
  jumpStart: 6,
  jumpCount: 2,
  jumpMs: 180,
  idleCount: 2,
  idleMs: 500,
  failedAlpha: 0.5,
  colors: [0xb81f32, 0x2563eb, 0x16a34a, 0xb45309, 0x9333ea, 0x0891b2, 0xbe185d, 0x65a30d],
} as const;
export const PLATFORM = {
  cropX: 0.025,
  cropY: 0.2,
  cropHeight: 0.62,
  cropWidth: 0.95,
  surfaceY: 0.5,
} as const;
export const STONE = {
  frameEdges: [0, 249, 497, 743, 989, 1238, 1478, 1715, 1950, 2172],
  frameTop: 210,
  frameHeight: 272,
  frameRate: 8,
  originY: 0.98,
  size: 36,
} as const;

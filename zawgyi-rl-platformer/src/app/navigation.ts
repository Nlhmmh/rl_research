export const Modes = {
  Menu: 'menu',
  Human: 'human',
  Watch: 'watch',
  Train: 'train',
} as const;

export type Mode = (typeof Modes)[keyof typeof Modes];

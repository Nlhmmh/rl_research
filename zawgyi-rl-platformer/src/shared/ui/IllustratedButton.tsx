import type { ComponentPropsWithoutRef } from 'react';
import styles from './IllustratedButton.module.css';

interface IllustratedButtonProps extends ComponentPropsWithoutRef<'button'> {
  variant?: 'primary' | 'secondary';
}

export function IllustratedButton({
  variant = 'primary',
  type = 'button',
  className,
  children,
  ...props
}: IllustratedButtonProps) {
  const classes = [styles.button, styles[variant], className].filter(Boolean).join(' ');

  return (
    <button {...props} type={type} className={classes}>
      <span className={styles.label}>{children}</span>
    </button>
  );
}

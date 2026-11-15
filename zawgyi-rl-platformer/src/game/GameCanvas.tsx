import Phaser from 'phaser';
import { useEffect, useRef } from 'react';
import { VIEW } from './level';
import { LiveScene } from './LiveScene';
import type { AgentSnapshot } from './types';

interface Props {
  snapshots: AgentSnapshot[];
  cameraMode?: 'overview' | 'follow';
  selectedAgentId?: string;
}

export function GameCanvas({ snapshots, cameraMode = 'follow', selectedAgentId }: Props) {
  const elementRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<LiveScene | null>(null);

  useEffect(() => {
    if (!elementRef.current) return;
    const scene = new LiveScene();
    sceneRef.current = scene;

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: elementRef.current,
      width: VIEW.width,
      height: VIEW.height,
      backgroundColor: VIEW.background,
      scale: {
        mode: Phaser.Scale.RESIZE,
      },
      scene: [scene],
    });

    const resizeObserver = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) game.scale.resize(width, height);
    });
    resizeObserver.observe(elementRef.current);

    return () => {
      resizeObserver.disconnect();
      game.destroy(true);
      sceneRef.current = null;
    };
  }, []);

  useEffect(() => {
    sceneRef.current?.setSnapshots(snapshots);
    sceneRef.current?.setCameraMode(cameraMode, selectedAgentId);
  }, [snapshots, cameraMode, selectedAgentId]);

  return <div ref={elementRef} className="game-canvas" />;
}

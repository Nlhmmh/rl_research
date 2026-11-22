import Phaser from 'phaser';
import { useEffect, useRef } from 'react';
import { VIEW } from '../domain/level';
import { LiveScene } from '../infrastructure/phaser/scenes/LiveScene';
import type { AgentSnapshot } from '../domain/types';

interface Props {
  snapshots: AgentSnapshot[];
  cameraMode?: 'overview' | 'follow';
  selectedAgentId?: string;
  victoryAudio?: boolean;
}

export function GameCanvas({ snapshots, cameraMode = 'follow', selectedAgentId, victoryAudio = false }: Props) {
  const elementRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<LiveScene | null>(null);

  useEffect(() => {
    if (!elementRef.current) return;
    const scene = new LiveScene(victoryAudio);
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
  }, [victoryAudio]);

  useEffect(() => {
    sceneRef.current?.setSnapshots(snapshots);
    sceneRef.current?.setCameraMode(cameraMode, selectedAgentId);
  }, [snapshots, cameraMode, selectedAgentId, victoryAudio]);

  return <div ref={elementRef} className="game-canvas" />;
}

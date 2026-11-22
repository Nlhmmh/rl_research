import Phaser from 'phaser';
import { HERO, LEVEL, PLATFORM, STONE, VICTORY } from '../../../domain/level';
import { horizontalDirection, isJumpAction, type AgentSnapshot } from '../../../domain/types';

const assetBase = `${import.meta.env.BASE_URL}assets/`;
const philosophersStoneUrl = `${assetBase}objects/philosopher-stone.png`;
const himavantaForestUrl = `${assetBase}backgrounds/himavanta-forest.png`;
const grassPlatformUrl = `${assetBase}terrain/grass-platform.png`;
const zawgyiUrl = `${assetBase}characters/zawgyi/spritesheet.png`;
const victoryTexture = 'zawgyi-victory';
const victoryUrl = `${assetBase}characters/zawgyi/zawgyi_victory.png`;
const stonePickupSound = 'stone-pickup';

export class LiveScene extends Phaser.Scene {
  private agents = new Map<string, Phaser.GameObjects.Container>();
  private snapshots: AgentSnapshot[] = [];
  private followId: string | null = null;
  private overview = false;
  private goalStone?: Phaser.GameObjects.Sprite;

  private readonly victoryAudio: boolean;

  constructor(victoryAudio = false) {
    super({ key: 'LiveScene' });
    this.victoryAudio = victoryAudio;
  }

  preload(): void {
    if (this.victoryAudio) {
      this.load.audio(stonePickupSound, `${assetBase}audio/effects/zawgyi_stone_pickup.mp3`);
    }
    this.load.image('philosophers-stone', philosophersStoneUrl);
    this.load.image('himavanta-forest', himavantaForestUrl);
    this.load.image('grass-platform', grassPlatformUrl);
    this.load.image('zawgyi-sheet', zawgyiUrl);
    this.load.spritesheet(victoryTexture, victoryUrl, {
      frameWidth: VICTORY.frameWidth,
      frameHeight: VICTORY.frameHeight,
    });
  }

  create(): void {
    // The supplied 1774x887 sheet is a 4x2 grid whose cells alternate between
    // 443 and 444 pixels, so register exact atlas frames to avoid edge bleed.
    const texture = this.textures.get('zawgyi-sheet');
    const xEdges = HERO.xEdges;
    const yEdges = HERO.yEdges;
    for (let row = 0; row < yEdges.length - 1; row++) {
      for (let column = 0; column < xEdges.length - 1; column++) {
        texture.add(
          `pose-${row * (xEdges.length - 1) + column}`,
          0,
          xEdges[column],
          yEdges[row],
          xEdges[column + 1] - xEdges[column],
          yEdges[row + 1] - yEdges[row],
        );
      }
    }

    this.cameras.main.setBounds(0, 0, LEVEL.width, LEVEL.height);

    this.add
      .image(LEVEL.width / 2, LEVEL.height / 2, 'himavanta-forest')
      .setDisplaySize(LEVEL.width, LEVEL.height);

    // Trim transparent outer margins. The grass surface is halfway down the
    // original artwork; foliage above it is decorative, not collision geometry.
    const platformTexture = this.textures.get('grass-platform');
    const source = platformTexture.getSourceImage() as HTMLImageElement;
    const cropX = Math.round(source.width * PLATFORM.cropX);
    const cropY = Math.round(source.height * PLATFORM.cropY);
    const cropHeight = Math.round(source.height * PLATFORM.cropHeight);
    platformTexture.add('platform', 0, cropX, cropY,
      Math.round(source.width * PLATFORM.cropWidth), cropHeight);
    const surfaceOrigin = (source.height * PLATFORM.surfaceY - cropY) / cropHeight;

    // Ground segments.
    for (const segment of LEVEL.ground) {
      this.add.image(segment.start, LEVEL.groundY, 'grass-platform', 'platform')
        .setOrigin(0, surfaceOrigin)
        .setScale((segment.end - segment.start) / Math.round(source.width * PLATFORM.cropWidth));
    }

    this.registerStoneFrames();
    this.anims.create({
      key: 'stone-glow',
      frames: this.anims.generateFrameNumbers('philosophers-stone', {
        start: 0,
        end: STONE.frameEdges.length - 2,
      }),
      frameRate: STONE.frameRate,
      repeat: -1,
    });
    this.goalStone = this.add.sprite(LEVEL.goalX, LEVEL.groundY, 'philosophers-stone', 0)
      .setOrigin(0.5, STONE.originY)
      .setScale(STONE.size / STONE.frameHeight)
      .play('stone-glow');
    this.anims.create({
      key: victoryTexture,
      frames: this.anims.generateFrameNumbers(victoryTexture, { start: 0, end: VICTORY.lastFrame }),
      frameRate: VICTORY.frameRate,
    });
  }

  private registerStoneFrames(): void {
    const texture = this.textures.get('philosophers-stone');
    for (let frame = 0; frame < STONE.frameEdges.length - 1; frame++) {
      const x = STONE.frameEdges[frame];
      texture.add(frame, 0, x, STONE.frameTop, STONE.frameEdges[frame + 1] - x, STONE.frameHeight);
    }
  }

  setSnapshots(snapshots: AgentSnapshot[]): void {
    this.snapshots = snapshots;
  }

  setCameraMode(mode: 'overview' | 'follow', agentId?: string): void {
    this.overview = mode === 'overview';
    this.followId = agentId ?? null;
  }

  update(): void {
    // The victory art contains the stone. Keep the world goal visible for other agents.
    this.goalStone?.setVisible(
      this.snapshots.length !== 1 || this.snapshots[0].status !== 'success',
    );
    const alive = new Set(this.snapshots.map((s) => s.id)); // Track which agents are still alive.
    for (const [id, sprite] of this.agents) {
      if (!alive.has(id)) {
        sprite.destroy();
        this.agents.delete(id);
      }
    }

    this.snapshots.forEach((snapshot, index) => {
      let visual = this.agents.get(snapshot.id);
      if (!visual) {
        const hero = this.add
          .sprite(0, 0, 'zawgyi-sheet', 'pose-0')
          .setName('hero')
          .setOrigin(0.5, 1)
          .setScale(HERO.height / HERO.referenceHeight);
        const badge = this.add
          .circle(HERO.badgeX, HERO.badgeY, HERO.badgeRadius, HERO.colors[index % HERO.colors.length])
          .setStrokeStyle(HERO.badgeStroke, HERO.badgeStrokeColor);
        const label = this.add
          .text(0, HERO.labelY, snapshot.id, {
            fontFamily: HERO.labelFont,
            fontSize: HERO.labelSize,
            color: HERO.labelColor,
            backgroundColor: HERO.labelBackground,
            padding: { ...HERO.labelPadding },
          })
          .setOrigin(0.5);
        visual = this.add.container(snapshot.x, snapshot.y, [hero, badge, label]);
        this.agents.set(snapshot.id, visual);
      }
      const hero = visual.getByName('hero') as Phaser.GameObjects.Sprite;
      visual.setPosition(snapshot.x, snapshot.y);
      visual.setAlpha(snapshot.status === 'failed' ? HERO.failedAlpha : 1);
      if (snapshot.status === 'success') {
        if (hero.texture.key !== victoryTexture) {
          hero.setTexture(victoryTexture, 0)
            .setOrigin(VICTORY.originX, VICTORY.originY)
            .setScale(HERO.height / VICTORY.frameHeight)
            .setFlipX(false)
            .play(victoryTexture);
          if (this.victoryAudio && this.cache.audio.exists(stonePickupSound)) {
            this.sound.play(stonePickupSound);
          }
        }
        return;
      }
      if (hero.texture.key === victoryTexture) {
        hero.anims.stop();
        hero.setTexture('zawgyi-sheet', 'pose-0')
          .setOrigin(0.5, 1)
          .setScale(HERO.height / HERO.referenceHeight);
      }
      const direction = horizontalDirection(snapshot.action);
      const jumping = isJumpAction(snapshot.action);
      const moving = direction !== 0;
      const walkFrame = HERO.walkStart + (Math.floor(this.time.now / HERO.walkMs) % HERO.walkCount);
      const frame = jumping
        ? HERO.jumpStart + (Math.floor(this.time.now / HERO.jumpMs) % HERO.jumpCount)
        : moving
          ? walkFrame
          : Math.floor(this.time.now / HERO.idleMs) % HERO.idleCount;
      if (snapshot.status === 'running') hero.setFrame(`pose-${frame}`);
      hero.setFlipX(direction < 0);
    });

    const camera = this.cameras.main;
    if (this.overview) {
      camera.setZoom(Math.min(camera.width / LEVEL.width, camera.height / LEVEL.height));
      camera.centerOn(LEVEL.width / 2, LEVEL.height / 2);
    } else {
      camera.setZoom(Math.max(camera.height / LEVEL.height, camera.width / LEVEL.width));
      const selected = this.snapshots.find((s) => s.id === this.followId) ?? this.snapshots[0];
      if (selected) camera.centerOn(selected.x, LEVEL.height / 2);
    }
  }

}

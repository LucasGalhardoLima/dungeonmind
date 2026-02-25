import Matter from 'matter-js';
import type { DiceType } from '../types/dice';
import { DEFAULT_PHYSICS, D20_PHYSICS, DICE_FACES } from '../types/dice';

export interface DiceBody {
  body: Matter.Body;
  diceType: DiceType;
  faces: number;
}

export interface DiceEngineConfig {
  screenWidth: number;
  screenHeight: number;
}

export class DiceEngine {
  private engine: Matter.Engine;
  private world: Matter.World;
  private walls: Matter.Body[] = [];
  private dice: DiceBody[] = [];
  private animationFrame: number | null = null;
  private lastTimestamp = 0;

  constructor(private config: DiceEngineConfig) {
    this.engine = Matter.Engine.create({
      gravity: { x: DEFAULT_PHYSICS.gravity.x, y: DEFAULT_PHYSICS.gravity.y, scale: 0.001 },
    });
    this.world = this.engine.world;
    this.createWalls();
  }

  private createWalls(): void {
    const { screenWidth, screenHeight } = this.config;
    const thickness = 50;

    this.walls = [
      // Floor
      Matter.Bodies.rectangle(
        screenWidth / 2,
        screenHeight + thickness / 2,
        screenWidth,
        thickness,
        { isStatic: true }
      ),
      // Left wall
      Matter.Bodies.rectangle(
        -thickness / 2,
        screenHeight / 2,
        thickness,
        screenHeight,
        { isStatic: true }
      ),
      // Right wall
      Matter.Bodies.rectangle(
        screenWidth + thickness / 2,
        screenHeight / 2,
        thickness,
        screenHeight,
        { isStatic: true }
      ),
      // Ceiling
      Matter.Bodies.rectangle(
        screenWidth / 2,
        -thickness / 2,
        screenWidth,
        thickness,
        { isStatic: true }
      ),
    ];

    Matter.Composite.add(this.world, this.walls);
  }

  addDice(type: DiceType): DiceBody {
    const isD20 = type === 'd20';
    const physics = isD20 ? D20_PHYSICS : DEFAULT_PHYSICS;
    const faces = DICE_FACES[type];
    const size = isD20 ? 60 : 46;

    const body = Matter.Bodies.polygon(
      this.config.screenWidth / 2 + (Math.random() - 0.5) * 100,
      50,
      Math.min(faces, 8), // Polygon sides capped at 8 for physics
      size,
      {
        restitution: physics.restitution,
        friction: physics.friction,
        frictionAir: physics.angularDamping * 0.05,
        angle: Math.random() * Math.PI * 2,
      }
    );

    Matter.Composite.add(this.world, body);

    const diceBody: DiceBody = { body, diceType: type, faces };
    this.dice.push(diceBody);
    return diceBody;
  }

  applyThrow(diceBody: DiceBody): void {
    const forceX = (Math.random() - 0.5) * 0.15;
    const forceY = -0.08 - Math.random() * 0.06;
    const torque = (Math.random() - 0.5) * 0.3;

    Matter.Body.applyForce(diceBody.body, diceBody.body.position, {
      x: forceX,
      y: forceY,
    });
    Matter.Body.setAngularVelocity(diceBody.body, torque * 20);
  }

  nudge(diceBody: DiceBody): void {
    const nudgeForce = 0.005;
    Matter.Body.applyForce(diceBody.body, diceBody.body.position, {
      x: (Math.random() - 0.5) * nudgeForce,
      y: -nudgeForce,
    });
    Matter.Body.setAngularVelocity(
      diceBody.body,
      (Math.random() - 0.5) * 2
    );
  }

  start(onFrame: (timestamp: number) => void): void {
    const step = (timestamp: number) => {
      const delta = this.lastTimestamp ? timestamp - this.lastTimestamp : 16.67;
      this.lastTimestamp = timestamp;

      Matter.Engine.update(this.engine, Math.min(delta, 33.33));
      onFrame(timestamp);

      this.animationFrame = requestAnimationFrame(step);
    };

    this.animationFrame = requestAnimationFrame(step);
  }

  stop(): void {
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  getAngularVelocity(diceBody: DiceBody): number {
    return Math.abs(diceBody.body.angularVelocity);
  }

  getPosition(diceBody: DiceBody): { x: number; y: number } {
    return { x: diceBody.body.position.x, y: diceBody.body.position.y };
  }

  getAngle(diceBody: DiceBody): number {
    return diceBody.body.angle;
  }

  clear(): void {
    this.stop();
    Matter.Composite.clear(this.world, false);
    this.dice = [];
    this.createWalls();
  }

  destroy(): void {
    this.stop();
    Matter.Engine.clear(this.engine);
  }
}

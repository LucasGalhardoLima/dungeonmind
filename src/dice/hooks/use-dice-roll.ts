import { useCallback, useEffect, useRef, useState } from 'react';
import { Dimensions } from 'react-native';
import { Accelerometer } from 'expo-sensors';
import * as Haptics from 'expo-haptics';
import type { DiceType } from '../../types/dice';
import { DiceEngine } from '../dice-engine';
import type { DiceBody } from '../dice-engine';
import { SettleDetector } from '../settle-detector';
import { calculateResult, isCriticalHit, isCriticalFail } from '../result-calculator';

interface DiceState {
  x: number;
  y: number;
  angle: number;
  result: number | null;
}

interface UseDiceRollReturn {
  requestRoll: (type: DiceType, context: string) => void;
  triggerRoll: () => void;
  result: number | null;
  isRolling: boolean;
  isWaitingForRoll: boolean;
  isCriticalHitResult: boolean;
  isCriticalFailResult: boolean;
  diceType: DiceType | null;
  context: string | null;
  diceStates: DiceState[];
}

const SHAKE_THRESHOLD_IOS = 1.5;
const SHAKE_THRESHOLD_ANDROID = 1.7;
const SHAKE_WINDOW_MS = 500;
const SHAKE_COUNT_REQUIRED = 2;
const POST_SETTLE_PAUSE_MS = 500;

export function useDiceRoll(): UseDiceRollReturn {
  const [diceType, setDiceType] = useState<DiceType | null>(null);
  const [context, setContext] = useState<string | null>(null);
  const [isWaitingForRoll, setIsWaitingForRoll] = useState(false);
  const [isRolling, setIsRolling] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const [isCritHit, setIsCritHit] = useState(false);
  const [isCritFail, setIsCritFail] = useState(false);
  const [diceStates, setDiceStates] = useState<DiceState[]>([]);

  const engineRef = useRef<DiceEngine | null>(null);
  const diceBodyRef = useRef<DiceBody | null>(null);
  const settleDetectorRef = useRef<SettleDetector | null>(null);
  const shakeTimestamps = useRef<number[]>([]);

  const requestRoll = useCallback((type: DiceType, ctx: string) => {
    setDiceType(type);
    setContext(ctx);
    setIsWaitingForRoll(true);
    setIsRolling(false);
    setResult(null);
    setIsCritHit(false);
    setIsCritFail(false);

    const { width, height } = Dimensions.get('window');
    const engine = new DiceEngine({
      screenWidth: width,
      screenHeight: height * 0.5,
    });
    engineRef.current = engine;

    const diceBody = engine.addDice(type);
    diceBodyRef.current = diceBody;

    const detector = new SettleDetector(engine);
    settleDetectorRef.current = detector;

    setDiceStates([
      {
        x: engine.getPosition(diceBody).x,
        y: engine.getPosition(diceBody).y,
        angle: engine.getAngle(diceBody),
        result: null,
      },
    ]);
  }, []);

  const triggerRoll = useCallback(() => {
    const engine = engineRef.current;
    const diceBody = diceBodyRef.current;
    const detector = settleDetectorRef.current;

    if (!engine || !diceBody || !detector || !diceType) return;

    setIsWaitingForRoll(false);
    setIsRolling(true);
    detector.reset();

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    engine.applyThrow(diceBody);

    engine.start(() => {
      const pos = engine.getPosition(diceBody);
      const angle = engine.getAngle(diceBody);

      setDiceStates([{ x: pos.x, y: pos.y, angle, result: null }]);

      const { settled } = detector.check(diceBody);

      if (settled) {
        engine.stop();
        const diceResult = calculateResult(angle, diceType);
        const critHit = isCriticalHit(diceResult, diceType);
        const critFail = isCriticalFail(diceResult, diceType);

        setDiceStates([{ x: pos.x, y: pos.y, angle, result: diceResult }]);

        if (critHit) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else if (critFail) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } else {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }

        setTimeout(() => {
          setResult(diceResult);
          setIsRolling(false);
          setIsCritHit(critHit);
          setIsCritFail(critFail);
        }, POST_SETTLE_PAUSE_MS);
      }
    });
  }, [diceType]);

  // Accelerometer shake detection
  useEffect(() => {
    if (!isWaitingForRoll) return;

    const subscription = Accelerometer.addListener((data) => {
      const magnitude = Math.sqrt(
        data.x * data.x + data.y * data.y + data.z * data.z
      );

      const threshold = SHAKE_THRESHOLD_IOS; // Simplified — use platform detection for Android

      if (magnitude > threshold) {
        const now = Date.now();
        shakeTimestamps.current = shakeTimestamps.current.filter(
          (t) => now - t < SHAKE_WINDOW_MS
        );
        shakeTimestamps.current.push(now);

        if (shakeTimestamps.current.length >= SHAKE_COUNT_REQUIRED) {
          shakeTimestamps.current = [];
          triggerRoll();
        }
      }
    });

    Accelerometer.setUpdateInterval(16);

    return () => {
      subscription.remove();
    };
  }, [isWaitingForRoll, triggerRoll]);

  // Cleanup
  useEffect(() => {
    return () => {
      engineRef.current?.destroy();
    };
  }, []);

  return {
    requestRoll,
    triggerRoll,
    result,
    isRolling,
    isWaitingForRoll,
    isCriticalHitResult: isCritHit,
    isCriticalFailResult: isCritFail,
    diceType,
    context,
    diceStates,
  };
}

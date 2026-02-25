import { useMemo } from 'react';
import { Canvas, RoundedRect, Text as SkiaText, useFont, Group } from '@shopify/react-native-skia';
import type { DiceType } from '../types/dice';
import { DICE_FACES } from '../types/dice';
import { colors } from '../ui/theme';

interface DiceRendererProps {
  diceType: DiceType;
  x: number;
  y: number;
  angle: number;
  size?: number;
  result: number | null;
}

const DICE_COLORS: Record<DiceType, string> = {
  d4: '#8B4513',
  d6: '#2F4F4F',
  d8: '#4B0082',
  d10: '#006400',
  d12: '#8B0000',
  d20: colors.accent,
};

export function DiceRenderer({
  diceType,
  x,
  y,
  angle,
  size: customSize,
  result,
}: DiceRendererProps) {
  const isD20 = diceType === 'd20';
  const size = customSize ?? (isD20 ? 78 : 60);
  const halfSize = size / 2;
  const color = DICE_COLORS[diceType];
  const displayNumber = result ?? '?';

  const font = useFont(
    require('../../assets/fonts/SpaceMono-Regular.ttf'),
    isD20 ? 24 : 20
  );

  const textX = useMemo(() => {
    if (!font) return x;
    const text = String(displayNumber);
    const width = font.measureText(text).width;
    return x - width / 2;
  }, [font, x, displayNumber]);

  if (!font) return null;

  return (
    <Group
      transform={[
        { translateX: x },
        { translateY: y },
        { rotate: angle },
        { translateX: -x },
        { translateY: -y },
      ]}
    >
      <RoundedRect
        x={x - halfSize}
        y={y - halfSize}
        width={size}
        height={size}
        r={isD20 ? 8 : 6}
        color={color}
      />
      <RoundedRect
        x={x - halfSize + 2}
        y={y - halfSize + 2}
        width={size - 4}
        height={size - 4}
        r={isD20 ? 6 : 4}
        color={`${color}CC`}
      />
      <SkiaText
        x={textX}
        y={y + (isD20 ? 9 : 7)}
        text={String(displayNumber)}
        font={font}
        color="#FFFFFF"
      />
    </Group>
  );
}

interface DiceCanvasProps {
  width: number;
  height: number;
  dice: Array<{
    diceType: DiceType;
    x: number;
    y: number;
    angle: number;
    result: number | null;
  }>;
}

export function DiceCanvas({ width, height, dice }: DiceCanvasProps) {
  return (
    <Canvas style={{ width, height }}>
      {dice.map((d, i) => (
        <DiceRenderer
          key={i}
          diceType={d.diceType}
          x={d.x}
          y={d.y}
          angle={d.angle}
          result={d.result}
        />
      ))}
    </Canvas>
  );
}

import { View, Text, Pressable, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, borderRadius } from './theme';

interface ActionButtonsProps {
  actions: string[];
  onActionPress: (action: string) => void;
  disabled?: boolean;
}

export function ActionButtons({
  actions,
  onActionPress,
  disabled = false,
}: ActionButtonsProps) {
  if (actions.length === 0) {
    return null;
  }

  const handlePress = (action: string) => {
    if (disabled) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onActionPress(action);
  };

  return (
    <View style={styles.container}>
      {actions.slice(0, 4).map((action) => (
        <Pressable
          key={action}
          onPress={() => handlePress(action)}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={action}
          style={({ pressed }) => [
            styles.chip,
            pressed && !disabled && styles.chipPressed,
            disabled && styles.chipDisabled,
          ]}
        >
          <Text
            style={[styles.chipText, disabled && styles.chipTextDisabled]}
          >
            {action}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: borderRadius.chip,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  chipPressed: {
    backgroundColor: 'rgba(201, 168, 76, 0.2)',
  },
  chipDisabled: {
    opacity: 0.4,
  },
  chipText: {
    color: colors.accent,
    fontSize: 14,
  },
  chipTextDisabled: {
    opacity: 1,
  },
});

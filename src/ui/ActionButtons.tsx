import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
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
  const validActions = actions
    .map((a) => a.trim())
    .filter((a) => a.length > 0);

  if (validActions.length === 0) {
    return null;
  }

  const handlePress = (action: string) => {
    if (disabled) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onActionPress(action);
  };

  return (
    <View style={styles.container}>
      {validActions.slice(0, 4).map((action, index) => (
        <TouchableOpacity
          key={index}
          onPress={() => handlePress(action)}
          disabled={disabled}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={action}
          style={[
            styles.actionCard,
            disabled && styles.actionCardDisabled,
          ]}
        >
          <Text
            style={[styles.actionText, disabled && styles.actionTextDisabled]}
            numberOfLines={2}
          >
            {action}
          </Text>
          <Text style={[styles.chevron, disabled && styles.chevronDisabled]}>
            {'\u203A'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(201, 168, 76, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(201, 168, 76, 0.4)',
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
    borderRadius: borderRadius.chip,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  actionCardDisabled: {
    opacity: 0.5,
  },
  actionText: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
  },
  actionTextDisabled: {
    color: colors.muted,
  },
  chevron: {
    color: colors.accent,
    fontSize: 20,
    marginLeft: 8,
  },
  chevronDisabled: {
    color: colors.muted,
  },
});

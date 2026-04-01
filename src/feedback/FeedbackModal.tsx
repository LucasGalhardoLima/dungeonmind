import { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Modal,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useFeedbackStore, type FeedbackCategory } from './feedback-store';
import { useSettingsStore } from '../store/settings-store';
import { getDatabase } from '../persistence/database';
import { colors, spacing, borderRadius, typography } from '../ui/theme';

const CATEGORY_OPTIONS: ReadonlyArray<{
  value: FeedbackCategory;
  label: string;
}> = [
  { value: 'bug', label: 'Bug' },
  { value: 'suggestion', label: 'Suggestion' },
  { value: 'general', label: 'General' },
] as const;

export function FeedbackModal() {
  const db = useMemo(() => getDatabase(), []);
  const isVisible = useFeedbackStore((s) => s.isModalVisible);
  const hideModal = useFeedbackStore((s) => s.hideModal);
  const submitFeedback = useFeedbackStore((s) => s.submitFeedback);
  const playerId = useSettingsStore((s) => s.getPlayerId);

  const [category, setCategory] = useState<FeedbackCategory>('general');
  const [body, setBody] = useState('');

  const handleSubmit = useCallback(() => {
    const pid = playerId();
    if (!pid) return;

    const trimmed = body.trim();
    if (trimmed.length === 0) {
      Alert.alert('The Narrator asks...', 'Please describe your feedback before submitting.');
      return;
    }

    submitFeedback(db, pid, category, trimmed);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    setBody('');
    setCategory('general');
    hideModal();

    Alert.alert(
      'Feedback recorded!',
      'Thank you for helping improve DungeonMind.',
    );
  }, [db, playerId, category, body, submitFeedback, hideModal]);

  const handleClose = useCallback(() => {
    setBody('');
    setCategory('general');
    hideModal();
  }, [hideModal]);

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.container}>
          <Text style={styles.title}>Submit Feedback</Text>
          <Text style={styles.subtitle}>
            Shake your device at any time to open this form
          </Text>

          {/* Category selector */}
          <View style={styles.categoryRow}>
            {CATEGORY_OPTIONS.map((option) => {
              const isSelected = category === option.value;
              return (
                <Pressable
                  key={option.value}
                  style={[
                    styles.categoryChip,
                    isSelected && styles.categoryChipSelected,
                  ]}
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setCategory(option.value);
                  }}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      isSelected && styles.categoryChipTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Feedback body */}
          <TextInput
            style={styles.textInput}
            value={body}
            onChangeText={setBody}
            placeholder="Describe what happened or your suggestion..."
            placeholderTextColor={colors.muted}
            multiline
            numberOfLines={5}
            maxLength={2000}
            textAlignVertical="top"
          />

          <Text style={styles.charCount}>{body.length}/2000</Text>

          {/* Actions */}
          <View style={styles.actions}>
            <Pressable style={styles.cancelButton} onPress={handleClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.submitButton} onPress={handleSubmit}>
              <Text style={styles.submitButtonText}>Submit</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: colors.overlay,
  },
  container: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.screen,
    borderTopRightRadius: borderRadius.screen,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.accent,
    fontFamily: typography.heading,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
    marginBottom: spacing.lg,
    fontStyle: 'italic',
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  categoryChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.chip,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  categoryChipSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.purple,
  },
  categoryChipText: {
    fontSize: 14,
    color: colors.muted,
    fontWeight: '500',
  },
  categoryChipTextSelected: {
    color: colors.accent,
  },
  textInput: {
    backgroundColor: colors.surface,
    color: colors.text,
    borderRadius: borderRadius.button,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 15,
    borderWidth: 1,
    borderColor: colors.purple,
    minHeight: 120,
  },
  charCount: {
    fontSize: 12,
    color: colors.muted,
    textAlign: 'right',
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.button,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.muted,
  },
  cancelButtonText: {
    color: colors.muted,
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    backgroundColor: colors.purple,
    borderRadius: borderRadius.button,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.accent,
  },
  submitButtonText: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

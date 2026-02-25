import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  SafeAreaView,
  StyleSheet,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { useCharacter } from '../../../src/character/hooks/use-character';
import { CharacterPortrait } from '../../../src/ui/CharacterPortrait';
import { colors, typography, spacing } from '../../../src/ui/theme';

type SheetMode = 'narrative' | 'technical';

const SURFACE_COLOR = '#252545';

function formatModifierDisplay(modifier: number): string {
  return modifier >= 0 ? `+${modifier}` : `${modifier}`;
}

export default function CharacterSheet() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { character, narrativeSheet, technicalSheet, loadCharacter } =
    useCharacter();
  const [mode, setMode] = useState<SheetMode>('narrative');

  useEffect(() => {
    if (id) {
      loadCharacter(id);
    }
  }, [id, loadCharacter]);

  const handleToggle = useCallback(
    (newMode: SheetMode) => {
      if (newMode !== mode) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setMode(newMode);
      }
    },
    [mode],
  );

  if (!character) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.loadingText}>Carregando personagem...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Toggle */}
        <View style={styles.toggleContainer}>
          <Pressable
            style={[
              styles.toggleButton,
              styles.toggleButtonLeft,
              mode === 'narrative'
                ? styles.toggleButtonActive
                : styles.toggleButtonInactive,
            ]}
            onPress={() => handleToggle('narrative')}
          >
            <Text
              style={[
                styles.toggleText,
                mode === 'narrative'
                  ? styles.toggleTextActive
                  : styles.toggleTextInactive,
              ]}
            >
              Narrativa
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.toggleButton,
              styles.toggleButtonRight,
              mode === 'technical'
                ? styles.toggleButtonActive
                : styles.toggleButtonInactive,
            ]}
            onPress={() => handleToggle('technical')}
          >
            <Text
              style={[
                styles.toggleText,
                mode === 'technical'
                  ? styles.toggleTextActive
                  : styles.toggleTextInactive,
              ]}
            >
              T\u00e9cnica
            </Text>
          </Pressable>
        </View>

        {/* Portrait */}
        <View style={styles.portraitWrapper}>
          <CharacterPortrait
            portraitPath={character.portrait_path}
            isGenerating={false}
            characterName={character.name}
            size={120}
          />
        </View>

        {/* Content */}
        {mode === 'narrative' ? (
          <NarrativeContent
            narrativeSheet={narrativeSheet}
          />
        ) : (
          <TechnicalContent
            technicalSheet={technicalSheet}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Narrative Mode
// ---------------------------------------------------------------------------

interface NarrativeContentProps {
  narrativeSheet: ReturnType<typeof useCharacter>['narrativeSheet'];
}

function NarrativeContent({ narrativeSheet }: NarrativeContentProps) {
  if (!narrativeSheet) {
    return (
      <View style={styles.centered}>
        <Text style={styles.loadingText}>Carregando ficha narrativa...</Text>
      </View>
    );
  }

  return (
    <View style={styles.contentContainer}>
      {/* Introduction */}
      <View style={styles.section}>
        <Text style={styles.narrativeText}>{narrativeSheet.introduction}</Text>
      </View>

      {/* Attributes */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Atributos</Text>
        <Text style={styles.narrativeText}>{narrativeSheet.attributes}</Text>
      </View>

      {/* Combat */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Combate</Text>
        <Text style={styles.narrativeText}>{narrativeSheet.combat}</Text>
      </View>

      {/* Equipment */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Equipamento</Text>
        <Text style={styles.narrativeText}>{narrativeSheet.equipment}</Text>
      </View>

      {/* Background */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Hist\u00f3ria</Text>
        <Text style={styles.narrativeText}>{narrativeSheet.background}</Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Technical Mode
// ---------------------------------------------------------------------------

interface TechnicalContentProps {
  technicalSheet: ReturnType<typeof useCharacter>['technicalSheet'];
}

function TechnicalContent({ technicalSheet }: TechnicalContentProps) {
  if (!technicalSheet) {
    return (
      <View style={styles.centered}>
        <Text style={styles.loadingText}>Carregando ficha t\u00e9cnica...</Text>
      </View>
    );
  }

  const hpPercentage =
    technicalSheet.hp.max > 0
      ? (technicalSheet.hp.current / technicalSheet.hp.max) * 100
      : 0;

  return (
    <View style={styles.contentContainer}>
      {/* Header */}
      <View style={styles.section}>
        <Text style={styles.characterName}>{technicalSheet.header.name}</Text>
        <Text style={styles.characterSubtitle}>
          {technicalSheet.header.race} {technicalSheet.header.class} — N\u00edvel{' '}
          {technicalSheet.header.level}
        </Text>
      </View>

      {/* Ability Scores */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Atributos</Text>
        <View style={styles.abilityScoresTable}>
          {/* Table Header */}
          <View style={styles.abilityRow}>
            <Text style={[styles.abilityCell, styles.abilityHeaderText, styles.abilityCellName]}>
              Atributo
            </Text>
            <Text style={[styles.abilityCell, styles.abilityHeaderText, styles.abilityCellAbbr]}>
              Abr.
            </Text>
            <Text style={[styles.abilityCell, styles.abilityHeaderText, styles.abilityCellScore]}>
              Valor
            </Text>
            <Text style={[styles.abilityCell, styles.abilityHeaderText, styles.abilityCellMod]}>
              Mod.
            </Text>
          </View>
          {technicalSheet.abilityScores.map((ability) => (
            <View key={ability.abbreviation} style={styles.abilityRow}>
              <Text style={[styles.abilityCell, styles.bodyText, styles.abilityCellName]}>
                {ability.name}
              </Text>
              <Text style={[styles.abilityCell, styles.abilityAbbr, styles.abilityCellAbbr]}>
                {ability.abbreviation}
              </Text>
              <Text style={[styles.abilityCell, styles.bodyText, styles.abilityCellScore]}>
                {ability.score}
              </Text>
              <Text
                style={[
                  styles.abilityCell,
                  styles.modifierText,
                  styles.abilityCellMod,
                  ability.modifier >= 0
                    ? styles.modifierPositive
                    : styles.modifierNegative,
                ]}
              >
                {formatModifierDisplay(ability.modifier)}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* HP Bar */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pontos de Vida</Text>
        <View style={styles.hpBarContainer}>
          <View style={styles.hpBarBackground}>
            <View
              style={[
                styles.hpBarFill,
                { width: `${Math.min(hpPercentage, 100)}%` },
              ]}
            />
          </View>
          <Text style={styles.hpText}>
            {technicalSheet.hp.current} / {technicalSheet.hp.max}
          </Text>
        </View>
      </View>

      {/* Saving Throws */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Testes de Resist\u00eancia</Text>
        {technicalSheet.savingThrows.map((save) => (
          <View key={save.name} style={styles.listRow}>
            <View style={styles.listRowLeft}>
              <View
                style={[
                  styles.proficiencyMarker,
                  save.proficient
                    ? styles.proficiencyActive
                    : styles.proficiencyInactive,
                ]}
              />
              <Text style={styles.bodyText}>{save.name}</Text>
            </View>
            <Text
              style={[
                styles.modifierText,
                save.modifier >= 0
                  ? styles.modifierPositive
                  : styles.modifierNegative,
              ]}
            >
              {formatModifierDisplay(save.modifier)}
            </Text>
          </View>
        ))}
      </View>

      {/* Skills */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Per\u00edcias</Text>
        {technicalSheet.skills.map((skill) => (
          <View key={skill.name} style={styles.listRow}>
            <View style={styles.listRowLeft}>
              <View
                style={[
                  styles.proficiencyMarker,
                  skill.proficient
                    ? styles.proficiencyActive
                    : styles.proficiencyInactive,
                ]}
              />
              <Text style={styles.bodyText}>{skill.name}</Text>
            </View>
            <Text
              style={[
                styles.modifierText,
                skill.modifier >= 0
                  ? styles.modifierPositive
                  : styles.modifierNegative,
              ]}
            >
              {formatModifierDisplay(skill.modifier)}
            </Text>
          </View>
        ))}
      </View>

      {/* Inventory */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Invent\u00e1rio</Text>
        {technicalSheet.inventory.length === 0 ? (
          <Text style={styles.emptyText}>Nenhum item no invent\u00e1rio.</Text>
        ) : (
          technicalSheet.inventory.map((item, index) => (
            <View key={`${item.name}-${index}`} style={styles.inventoryRow}>
              <Text style={styles.bodyText}>{item.name}</Text>
              <Text style={styles.quantityText}>x{item.quantity}</Text>
            </View>
          ))
        )}
      </View>

      {/* XP */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Experi\u00eancia</Text>
        <Text style={styles.xpText}>{technicalSheet.xp} XP</Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  loadingText: {
    color: colors.muted,
    fontSize: 16,
    fontFamily: typography.body,
  },

  // Toggle
  toggleContainer: {
    flexDirection: 'row',
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  toggleButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  toggleButtonLeft: {
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  toggleButtonRight: {
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  toggleButtonActive: {
    backgroundColor: colors.accent,
  },
  toggleButtonInactive: {
    backgroundColor: SURFACE_COLOR,
  },
  toggleText: {
    fontSize: 15,
    fontFamily: typography.heading,
  },
  toggleTextActive: {
    color: colors.background,
  },
  toggleTextInactive: {
    color: colors.text,
  },

  // Portrait
  portraitWrapper: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },

  // Content
  contentContainer: {
    gap: spacing.md,
  },
  section: {
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    color: colors.accent,
    fontSize: 18,
    fontFamily: typography.heading,
    marginBottom: spacing.sm,
  },

  // Narrative
  narrativeText: {
    color: colors.accent,
    fontSize: 15,
    lineHeight: 24,
    fontFamily: typography.body,
  },

  // Technical — Header
  characterName: {
    color: colors.accent,
    fontSize: 22,
    fontFamily: typography.heading,
    textAlign: 'center',
  },
  characterSubtitle: {
    color: colors.text,
    fontSize: 15,
    fontFamily: typography.body,
    textAlign: 'center',
    marginTop: spacing.xs,
  },

  // Ability Scores Table
  abilityScoresTable: {
    backgroundColor: SURFACE_COLOR,
    borderRadius: 8,
    padding: spacing.sm,
  },
  abilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  abilityCell: {
    textAlign: 'center',
  },
  abilityCellName: {
    flex: 3,
    textAlign: 'left',
  },
  abilityCellAbbr: {
    flex: 1,
  },
  abilityCellScore: {
    flex: 1,
  },
  abilityCellMod: {
    flex: 1,
  },
  abilityHeaderText: {
    color: colors.muted,
    fontSize: 12,
    fontFamily: typography.heading,
  },
  abilityAbbr: {
    color: colors.muted,
    fontSize: 14,
    fontFamily: typography.body,
  },
  bodyText: {
    color: colors.text,
    fontSize: 14,
    fontFamily: typography.body,
  },
  modifierText: {
    fontSize: 14,
    fontFamily: typography.heading,
  },
  modifierPositive: {
    color: colors.success,
  },
  modifierNegative: {
    color: colors.danger,
  },

  // HP Bar
  hpBarContainer: {
    gap: spacing.xs,
  },
  hpBarBackground: {
    height: 20,
    backgroundColor: SURFACE_COLOR,
    borderRadius: 10,
    overflow: 'hidden',
  },
  hpBarFill: {
    height: '100%',
    backgroundColor: colors.success,
    borderRadius: 10,
  },
  hpText: {
    color: colors.text,
    fontSize: 14,
    fontFamily: typography.heading,
    textAlign: 'center',
  },

  // List rows (saving throws, skills)
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  listRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  proficiencyMarker: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
  },
  proficiencyActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  proficiencyInactive: {
    backgroundColor: 'transparent',
    borderColor: colors.muted,
  },

  // Inventory
  inventoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  quantityText: {
    color: colors.muted,
    fontSize: 14,
    fontFamily: typography.heading,
  },
  emptyText: {
    color: colors.muted,
    fontSize: 14,
    fontFamily: typography.body,
    fontStyle: 'italic',
  },

  // XP
  xpText: {
    color: colors.accent,
    fontSize: 18,
    fontFamily: typography.heading,
  },
});

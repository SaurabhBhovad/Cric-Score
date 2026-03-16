import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTeamStore, Player } from '../../store/teamStore';
import { useMatchStore, Match } from '../../store/matchStore';
import { COLORS, FONTS, SPACING, RADIUS } from '../../theme/theme';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';

type Props = NativeStackScreenProps<RootStackParamList, 'PlayerSelection'>;

export default function PlayerSelectionScreen({ navigation, route }: Props) {
  const { match, tossWinner, tossChoice } = route.params;
  const { fetchPlayers } = useTeamStore();
  const { startLiveMatch } = useMatchStore();

  const [playersA, setPlayersA] = useState<Player[]>([]);
  const [playersB, setPlayersB] = useState<Player[]>([]);
  const [selectedA, setSelectedA] = useState<Set<string>>(new Set());
  const [selectedB, setSelectedB] = useState<Set<string>>(new Set());
  const [openers, setOpeners] = useState<string[]>([]); // [striker, non-striker]
  const [openBowler, setOpenBowler] = useState<string>('');
  const [step, setStep] = useState<'xi' | 'openers' | 'bowler'>('xi');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // batting team = toss winner chose bat, or the other team if chose bowl
  const battingTeamId = tossChoice === 'bat' ? tossWinner : (tossWinner === match.team_a ? match.team_b : match.team_a);
  const bowlingTeamId = battingTeamId === match.team_a ? match.team_b : match.team_a;

  const battingTeamName = battingTeamId === match.team_a ? match.team_a_name : match.team_b_name;
  const bowlingTeamName = bowlingTeamId === match.team_a ? match.team_a_name : match.team_b_name;

  useEffect(() => {
    (async () => {
      const [pA, pB] = await Promise.all([fetchPlayers(match.team_a), fetchPlayers(match.team_b)]);
      setPlayersA(pA);
      setPlayersB(pB);
      setLoading(false);
    })();
  }, []);

  const togglePlayer = (id: string, team: 'A' | 'B') => {
    const set = team === 'A' ? new Set(selectedA) : new Set(selectedB);
    const setter = team === 'A' ? setSelectedA : setSelectedB;
    if (set.has(id)) set.delete(id);
    else if (set.size < 11) set.add(id);
    else { Alert.alert('XI Full', 'You can only select 11 players.'); return; }
    setter(set);
  };

  const battingPlayers = battingTeamId === match.team_a
    ? playersA.filter((p) => selectedA.has(p.id))
    : playersB.filter((p) => selectedB.has(p.id));

  const bowlingPlayers = bowlingTeamId === match.team_a
    ? playersA.filter((p) => selectedA.has(p.id))
    : playersB.filter((p) => selectedB.has(p.id));

  const handleStart = async () => {
    if (openers.length < 2) { Alert.alert('Select Openers', 'Select strike & non-striker.'); return; }
    if (!openBowler) { Alert.alert('Select Bowler', 'Select opening bowler.'); return; }
    setSaving(true);
    const allPlayers = [...playersA, ...playersB];
    const names: Record<string, string> = {};
    allPlayers.forEach((p) => { names[p.id] = p.player_name; });

    const batters = [openers[0], openers[1], ...battingPlayers.filter((p) => !openers.includes(p.id)).map((p) => p.id)];
    const bowlers = [openBowler, ...bowlingPlayers.filter((p) => p.id !== openBowler).map((p) => p.id)];

    try {
      await startLiveMatch(match, battingTeamId, bowlingTeamId, { batters, bowlers, names });
      navigation.replace('LiveScore', { matchId: match.id });
    } catch (e: any) { Alert.alert('Error', e.message); }
    setSaving(false);
  };

  const renderPlayerRow = (p: Player, selected: boolean, onPress: () => void) => (
    <TouchableOpacity
      key={p.id}
      style={[styles.playerRow, selected && styles.playerRowSelected]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.checkbox, selected && styles.checkboxActive]}>
        {selected && <Text style={styles.checkMark}>✓</Text>}
      </View>
      <Text style={[styles.playerName, selected && styles.playerNameActive]}>{p.player_name}</Text>
      {p.jersey_number !== undefined && (
        <Text style={styles.jersey}>#{p.jersey_number}</Text>
      )}
    </TouchableOpacity>
  );

  if (loading) return (
    <LinearGradient colors={['#050E1F', '#0D1B2E']} style={styles.container}>
      <ActivityIndicator color={COLORS.green} style={{ marginTop: 100 }} />
    </LinearGradient>
  );

  return (
    <LinearGradient colors={['#050E1F', '#0D1B2E']} style={styles.container}>
      <LinearGradient colors={['#142338', '#0D1B2E']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Setup</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select Playing XI</Text>
      </LinearGradient>

      {/* Step tabs */}
      <View style={styles.steps}>
        {(['xi', 'openers', 'bowler'] as const).map((s, i) => (
          <View key={s} style={[styles.stepDot, step === s && styles.stepDotActive]}>
            <Text style={[styles.stepLabel, step === s && styles.stepLabelActive]}>
              {i + 1}. {s === 'xi' ? 'Playing XI' : s === 'openers' ? 'Openers' : 'Bowler'}
            </Text>
          </View>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {step === 'xi' && (
          <>
            <Text style={styles.teamHeader}>🏏 {battingTeamName} (Batting) — {
              (battingTeamId === match.team_a ? selectedA : selectedB).size}/11</Text>
            {(battingTeamId === match.team_a ? playersA : playersB).map((p) =>
              renderPlayerRow(
                p,
                (battingTeamId === match.team_a ? selectedA : selectedB).has(p.id),
                () => togglePlayer(p.id, battingTeamId === match.team_a ? 'A' : 'B'),
              )
            )}

            <Text style={[styles.teamHeader, { marginTop: SPACING.xl }]}>🎾 {bowlingTeamName} (Bowling) — {
              (bowlingTeamId === match.team_a ? selectedA : selectedB).size}/11</Text>
            {(bowlingTeamId === match.team_a ? playersA : playersB).map((p) =>
              renderPlayerRow(
                p,
                (bowlingTeamId === match.team_a ? selectedA : selectedB).has(p.id),
                () => togglePlayer(p.id, bowlingTeamId === match.team_a ? 'A' : 'B'),
              )
            )}

            <TouchableOpacity
              style={[styles.nextBtn, (selectedA.size < 2 || selectedB.size < 2) && styles.nextBtnDisabled]}
              onPress={() => {
                if (selectedA.size < 2 || selectedB.size < 2) { Alert.alert('', 'Select at least 2 players per team to start.'); return; }
                setStep('openers');
              }}
            >
              <LinearGradient colors={['#00D26A', '#00A855']} style={styles.nextBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Text style={styles.nextBtnText}>Next: Select Openers →</Text>
              </LinearGradient>
            </TouchableOpacity>
          </>
        )}

        {step === 'openers' && (
          <>
            <Text style={styles.teamHeader}>Select Openers for {battingTeamName}</Text>
            <Text style={styles.hint}>1st tap = Striker (on strike), 2nd tap = Non-striker</Text>
            {battingPlayers.map((p) => {
              const idx = openers.indexOf(p.id);
              return (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.playerRow, idx >= 0 && styles.playerRowSelected]}
                  onPress={() => {
                    if (idx >= 0) {
                      setOpeners(openers.filter((id) => id !== p.id));
                    } else if (openers.length < 2) {
                      setOpeners([...openers, p.id]);
                    }
                  }}
                  activeOpacity={0.8}
                >
                  <View style={[styles.checkbox, idx >= 0 && styles.checkboxActive]}>
                    {idx >= 0 && <Text style={styles.checkMark}>{idx === 0 ? '⚡' : '2'}</Text>}
                  </View>
                  <Text style={[styles.playerName, idx >= 0 && styles.playerNameActive]}>{p.player_name}</Text>
                  {idx === 0 && <Text style={styles.strikerLabel}>ON STRIKE</Text>}
                  {idx === 1 && <Text style={styles.nonStrikerLabel}>NON-STRIKER</Text>}
                </TouchableOpacity>
              );
            })}

            <View style={styles.navBtns}>
              <TouchableOpacity style={styles.prevBtn} onPress={() => setStep('xi')}>
                <Text style={styles.prevBtnText}>← Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.nextBtn, { flex: 2 }, openers.length < 2 && styles.nextBtnDisabled]}
                onPress={() => openers.length >= 2 && setStep('bowler')}
              >
                <LinearGradient colors={['#00D26A', '#00A855']} style={styles.nextBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  <Text style={styles.nextBtnText}>Next: Select Bowler →</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </>
        )}

        {step === 'bowler' && (
          <>
            <Text style={styles.teamHeader}>Select Opening Bowler for {bowlingTeamName}</Text>
            {bowlingPlayers.map((p) => renderPlayerRow(
              p,
              openBowler === p.id,
              () => setOpenBowler(p.id === openBowler ? '' : p.id),
            ))}

            <View style={styles.navBtns}>
              <TouchableOpacity style={styles.prevBtn} onPress={() => setStep('openers')}>
                <Text style={styles.prevBtnText}>← Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.nextBtn, { flex: 2 }, (!openBowler || saving) && styles.nextBtnDisabled]}
                onPress={handleStart}
                disabled={!openBowler || saving}
              >
                <LinearGradient colors={['#00D26A', '#00A855']} style={styles.nextBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  {saving ? <ActivityIndicator color={COLORS.textOnGreen} /> : <Text style={styles.nextBtnText}>🏏 Start Match!</Text>}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </>
        )}

      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 56, paddingBottom: SPACING.xl, paddingHorizontal: SPACING.xl },
  backBtn: { marginBottom: SPACING.sm },
  backText: { color: COLORS.green, fontSize: FONTS.sizes.md, fontWeight: '600' },
  headerTitle: { fontSize: FONTS.sizes.xxl, fontWeight: '800', color: COLORS.textPrimary },
  steps: { flexDirection: 'row', paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md, gap: SPACING.sm },
  stepDot: { flex: 1, padding: SPACING.sm, borderRadius: RADIUS.sm, backgroundColor: COLORS.bgCard, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  stepDotActive: { borderColor: COLORS.green, backgroundColor: COLORS.green + '22' },
  stepLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600' },
  stepLabelActive: { color: COLORS.green },
  scroll: { padding: SPACING.xl, paddingBottom: 100 },
  teamHeader: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.green, marginBottom: SPACING.md },
  hint: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, marginBottom: SPACING.md },
  playerRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md,
    padding: SPACING.md, marginBottom: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.border,
  },
  playerRowSelected: { borderColor: COLORS.green, backgroundColor: COLORS.green + '12' },
  checkbox: {
    width: 24, height: 24, borderRadius: 6,
    borderWidth: 2, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxActive: { borderColor: COLORS.green, backgroundColor: COLORS.green },
  checkMark: { color: '#000', fontWeight: '900', fontSize: 13 },
  playerName: { flex: 1, fontSize: FONTS.sizes.md, color: COLORS.textSecondary, fontWeight: '600' },
  playerNameActive: { color: COLORS.textPrimary },
  jersey: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted },
  strikerLabel: { fontSize: 10, color: COLORS.green, fontWeight: '800', backgroundColor: COLORS.green + '22', paddingHorizontal: 6, borderRadius: 4 },
  nonStrikerLabel: { fontSize: 10, color: COLORS.gold, fontWeight: '800', backgroundColor: COLORS.gold + '22', paddingHorizontal: 6, borderRadius: 4 },
  navBtns: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.xl },
  prevBtn: {
    flex: 1, backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md,
    paddingVertical: 16, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  prevBtnText: { color: COLORS.textSecondary, fontWeight: '700' },
  nextBtn: { borderRadius: RADIUS.md, overflow: 'hidden', marginTop: SPACING.xl },
  nextBtnDisabled: { opacity: 0.5 },
  nextBtnGrad: { paddingVertical: 16, alignItems: 'center' },
  nextBtnText: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.textOnGreen },
});

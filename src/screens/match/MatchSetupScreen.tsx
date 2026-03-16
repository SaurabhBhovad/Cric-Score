import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTeamStore } from '../../store/teamStore';
import { useMatchStore } from '../../store/matchStore';
import { COLORS, FONTS, SPACING, RADIUS } from '../../theme/theme';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';

type Props = NativeStackScreenProps<RootStackParamList, 'MatchSetup'>;

const OVERS_OPTIONS = [5, 6, 10, 15, 20, 25, 30, 40, 50];

export default function MatchSetupScreen({ navigation, route }: Props) {
  const { tournamentId, teamAId, teamBId, overs: initialOvers } = route.params ?? {};
  const preTeamA = teamAId ?? null;
  const preTeamB = teamBId ?? null;
  const preOvers = initialOvers ?? null;

  const { teams, fetchTeams } = useTeamStore();
  const { createMatch } = useMatchStore();

  const [step, setStep] = useState(1); // 1=teams, 2=toss, 3=overs
  const [teamA, setTeamA] = useState<string>(preTeamA ?? '');
  const [teamB, setTeamB] = useState<string>(preTeamB ?? '');
  const [overs, setOvers] = useState<number>(preOvers ?? 20);
  const [tossWinner, setTossWinner] = useState<string>('');
  const [tossChoice, setTossChoice] = useState<'bat' | 'bowl'>('bat');
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchTeams(); }, []);

  const teamAObj = teams.find((t) => t.id === teamA);
  const teamBObj = teams.find((t) => t.id === teamB);

  const handleStart = async () => {
    if (!teamA || !teamB) { Alert.alert('Error', 'Select both teams.'); return; }
    if (teamA === teamB) { Alert.alert('Error', 'Teams must be different.'); return; }
    if (!tossWinner) { Alert.alert('Error', 'Select toss winner.'); return; }
    setSaving(true);
    try {
      const match = await createMatch({ teamAId: teamA, teamBId: teamB, overs, tossWinner, tossChoice, tournamentId });
      navigation.navigate('PlayerSelection', { match, tossWinner, tossChoice });
    } catch (e: any) { Alert.alert('Error', e.message); }
    setSaving(false);
  };

  const teamRows = teams.map((t) => (
    <View key={t.id} style={styles.teamRow}>
      <TouchableOpacity
        style={[styles.teamBtn, teamA === t.id && styles.teamBtnSelected]}
        onPress={() => {
          if (teamA === t.id) setTeamA('');
          else if (teamB !== t.id) setTeamA(t.id);
          else Alert.alert('', 'Already selected as Team B');
        }}
      >
        <View style={[styles.selectorDot, { backgroundColor: t.team_color }]} />
        <Text style={[styles.teamBtnText, teamA === t.id && styles.teamBtnTextSel]}>{t.team_name}</Text>
        {teamA === t.id && <Text style={styles.badge}>A</Text>}
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.teamBtn, teamB === t.id && styles.teamBtnSelected]}
        onPress={() => {
          if (teamB === t.id) setTeamB('');
          else if (teamA !== t.id) setTeamB(t.id);
          else Alert.alert('', 'Already selected as Team A');
        }}
      >
        {teamB === t.id && <Text style={styles.badge}>B</Text>}
        <Text style={[styles.teamBtnText, teamB === t.id && styles.teamBtnTextSel]}>{t.team_name}</Text>
        <View style={[styles.selectorDot, { backgroundColor: t.team_color }]} />
      </TouchableOpacity>
    </View>
  ));

  return (
    <LinearGradient colors={['#050E1F', '#0D1B2E']} style={styles.container}>
      <LinearGradient colors={['#142338', '#0D1B2E']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Match Setup</Text>
        <Text style={styles.headerSub}>Configure your match</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Team Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Teams</Text>
          <View style={styles.vsHeader}>
            <View style={styles.teamSlot}>
              <Text style={styles.vsLabel}>Team A</Text>
              <Text style={styles.vsTeam}>{teamAObj?.team_name ?? '—'}</Text>
            </View>
            <View style={styles.vsCircle}><Text style={styles.vsText}>VS</Text></View>
            <View style={styles.teamSlot}>
              <Text style={styles.vsLabel}>Team B</Text>
              <Text style={styles.vsTeam}>{teamBObj?.team_name ?? '—'}</Text>
            </View>
          </View>

          <Text style={styles.hint}>Tap left column = Team A   |   Tap right column = Team B</Text>
          <View style={styles.teamsTableHeader}>
            <Text style={styles.colHeader}>TEAM A</Text>
            <Text style={styles.spacer} />
            <Text style={styles.colHeader}>TEAM B</Text>
          </View>
          {teams.length === 0 ? (
            <View style={styles.emptyTeams}>
              <Text style={styles.emptyTeamsText}>No teams found. Create teams first.</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Teams')} style={styles.goTeamsBtn}>
                <Text style={styles.goTeamsBtnText}>Go to Teams →</Text>
              </TouchableOpacity>
            </View>
          ) : teamRows}
        </View>

        {/* Overs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overs</Text>
          <View style={styles.oversRow}>
            {OVERS_OPTIONS.map((o) => (
              <TouchableOpacity
                key={o}
                style={[styles.oversChip, overs === o && styles.oversChipActive]}
                onPress={() => setOvers(o)}
              >
                <Text style={[styles.oversChipText, overs === o && styles.oversChipTextActive]}>{o}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.customOversRow}>
            <Text style={styles.hint}>Or enter custom: </Text>
            <TextInput
              style={styles.customOversInput}
              value={String(overs)}
              onChangeText={(v) => { const n = parseInt(v); if (!isNaN(n) && n > 0) setOvers(n); }}
              keyboardType="number-pad"
            />
            <Text style={styles.hint}> overs</Text>
          </View>
        </View>

        {/* Toss */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Toss</Text>
          {(!teamA || !teamB) ? (
            <Text style={styles.hint}>Select both teams first</Text>
          ) : (
            <>
              <Text style={styles.fieldLabel}>Toss Winner</Text>
              <View style={styles.tossRow}>
                {[teamAObj, teamBObj].filter(Boolean).map((t) => (
                  <TouchableOpacity
                    key={t!.id}
                    style={[styles.tossBtn, tossWinner === t!.id && styles.tossBtnActive]}
                    onPress={() => setTossWinner(t!.id)}
                  >
                    <View style={[styles.tossDot, { backgroundColor: t!.team_color }]} />
                    <Text style={[styles.tossBtnText, tossWinner === t!.id && styles.tossBtnTextActive]}>{t!.team_name}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.fieldLabel, { marginTop: SPACING.md }]}>Elected to</Text>
              <View style={styles.tossRow}>
                {(['bat', 'bowl'] as const).map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.tossBtn, tossChoice === c && styles.tossBtnActive]}
                    onPress={() => setTossChoice(c)}
                  >
                    <Text style={[styles.tossBtnText, tossChoice === c && styles.tossBtnTextActive]}>
                      {c === 'bat' ? '🏏 Bat' : '🎾 Bowl'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </View>

        <TouchableOpacity
          style={[styles.startBtn, saving && styles.startBtnDisabled]}
          onPress={handleStart}
          disabled={saving || !teamA || !teamB || !tossWinner}
          activeOpacity={0.85}
        >
          <LinearGradient colors={['#00D26A', '#00A855']} style={styles.startBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            {saving ? <ActivityIndicator color={COLORS.textOnGreen} /> : <Text style={styles.startBtnText}>Next: Select Playing XI →</Text>}
          </LinearGradient>
        </TouchableOpacity>

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
  headerSub: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: 2 },
  scroll: { padding: SPACING.xl, paddingBottom: 100 },
  section: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg,
    padding: SPACING.xl, marginBottom: SPACING.lg,
    borderWidth: 1, borderColor: COLORS.border,
  },
  sectionTitle: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.textPrimary, marginBottom: SPACING.lg },
  vsHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md },
  teamSlot: { flex: 1, alignItems: 'center' },
  vsLabel: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 },
  vsTeam: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center' },
  vsCircle: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.bgElevated,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  vsText: { color: COLORS.textMuted, fontWeight: '800', fontSize: FONTS.sizes.xs },
  hint: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, marginBottom: SPACING.sm },
  teamsTableHeader: { flexDirection: 'row', marginBottom: SPACING.sm },
  colHeader: { flex: 1, fontSize: FONTS.sizes.xs, color: COLORS.textMuted, fontWeight: '700', textAlign: 'center' },
  spacer: { width: 8 },
  teamRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm },
  teamBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.bgElevated, borderRadius: RADIUS.md,
    padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border, gap: SPACING.sm,
  },
  teamBtnSelected: { borderColor: COLORS.green, backgroundColor: COLORS.green + '15' },
  selectorDot: { width: 10, height: 10, borderRadius: 5 },
  teamBtnText: { flex: 1, fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, fontWeight: '600' },
  teamBtnTextSel: { color: COLORS.green },
  badge: {
    backgroundColor: COLORS.green, color: COLORS.textOnGreen,
    fontSize: 10, fontWeight: '800',
    paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4,
  },
  emptyTeams: { alignItems: 'center', paddingVertical: SPACING.xl },
  emptyTeamsText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, marginBottom: SPACING.md },
  goTeamsBtn: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.green },
  goTeamsBtnText: { color: COLORS.green, fontWeight: '700' },
  oversRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.sm },
  oversChip: {
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.bgElevated,
  },
  oversChipActive: { borderColor: COLORS.green, backgroundColor: COLORS.green + '22' },
  oversChipText: { color: COLORS.textMuted, fontWeight: '700' },
  oversChipTextActive: { color: COLORS.green },
  customOversRow: { flexDirection: 'row', alignItems: 'center' },
  customOversInput: {
    backgroundColor: COLORS.bgElevated, borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md, paddingVertical: 6,
    color: COLORS.textPrimary, fontSize: FONTS.sizes.md,
    borderWidth: 1, borderColor: COLORS.border, minWidth: 60, textAlign: 'center',
  },
  fieldLabel: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, fontWeight: '600', marginBottom: SPACING.sm },
  tossRow: { flexDirection: 'row', gap: SPACING.sm },
  tossBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: SPACING.sm, padding: SPACING.md, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.bgElevated,
  },
  tossBtnActive: { borderColor: COLORS.green, backgroundColor: COLORS.green + '22' },
  tossDot: { width: 10, height: 10, borderRadius: 5 },
  tossBtnText: { color: COLORS.textSecondary, fontWeight: '700', fontSize: FONTS.sizes.sm },
  tossBtnTextActive: { color: COLORS.green },
  startBtn: { borderRadius: RADIUS.lg, overflow: 'hidden', marginTop: SPACING.md },
  startBtnDisabled: { opacity: 0.5 },
  startBtnGrad: { paddingVertical: 18, alignItems: 'center' },
  startBtnText: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.textOnGreen },
});

import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../services/supabaseClient';
import { useMatchStore } from '../../store/matchStore';
import { COLORS, FONTS, SPACING, RADIUS } from '../../theme/theme';
import { formatOvers, getStrikeRate, getEconomy } from '../../utils/scoringEngine';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Scorecard'>;

interface BatRow { name: string; runs: number; balls: number; fours: number; sixes: number; isOut: boolean; dismissal: string; }
interface BowlRow { name: string; overs: number; runs: number; wickets: number; wides: number; noBalls: number; }
interface InningsData { battingTeam: string; runs: number; wickets: number; overs: string; extras: number; batting: BatRow[]; bowling: BowlRow[]; }

export default function ScorecardScreen({ navigation, route }: Props) {
  const { matchId } = route.params;
  const { getMatchById } = useMatchStore();
  const [match, setMatch] = useState<any>(null);
  const [innings1, setInnings1] = useState<InningsData | null>(null);
  const [innings2, setInnings2] = useState<InningsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<1 | 2>(1);

  useEffect(() => {
    loadScorecard();
  }, [matchId]);

  const loadScorecard = async () => {
    setLoading(true);
    const m = await getMatchById(matchId);
    setMatch(m);

    // Load innings
    const { data: inningsData } = await supabase
      .from('innings')
      .select('*, batting_team_info:batting_team(team_name), bowling_team_info:bowling_team(team_name)')
      .eq('match_id', matchId)
      .order('innings_number', { ascending: true });

    if (inningsData) {
      for (const inn of inningsData) {
        const innings = await buildInningsData(inn);
        if (inn.innings_number === 1) setInnings1(innings);
        else setInnings2(innings);
      }
    }
    setLoading(false);
  };

  const buildInningsData = async (inn: any): Promise<InningsData> => {
    const { data: balls } = await supabase
      .from('balls')
      .select('*, batsman:batsman_id(player_name), bowler:bowler_id(player_name), dismissed_batsman:dismissed_batsman_id(player_name)')
      .eq('innings_id', inn.id)
      .order('created_at', { ascending: true });

    // Build batting stats
    const batMap: Record<string, BatRow> = {};
    const bowlMap: Record<string, BowlRow> = {};

    (balls ?? []).forEach((b: any) => {
      const batsmanName = b.batsman?.player_name ?? 'Unknown';
      const bowlerName = b.bowler?.player_name ?? 'Unknown';
      const bId = b.batsman_id;
      const bowId = b.bowler_id;

      if (bId && !batMap[bId]) batMap[bId] = { name: batsmanName, runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false, dismissal: '' };
      if (bowId && !bowlMap[bowId]) bowlMap[bowId] = { name: bowlerName, overs: 0, runs: 0, wickets: 0, wides: 0, noBalls: 0 };

      if (bId) {
        const bat = batMap[bId];
        if (!b.extra_type || b.extra_type === 'no_ball') {
          bat.runs += b.runs_off_bat;
          if (b.extra_type !== 'wide') bat.balls += 1;
          if (b.runs_off_bat === 4) bat.fours += 1;
          if (b.runs_off_bat === 6) bat.sixes += 1;
        } else if (b.extra_type === 'bye' || b.extra_type === 'leg_bye') {
          bat.balls += 1;
        }
        if (b.is_wicket && b.dismissed_batsman_id === bId) {
          bat.isOut = true; bat.dismissal = b.wicket_type ?? 'out';
        }
      }

      if (bowId) {
        const bowl = bowlMap[bowId];
        if (b.extra_type === 'wide') { bowl.runs += b.extra_runs; bowl.wides += 1; }
        else if (b.extra_type === 'no_ball') { bowl.runs += b.extra_runs + b.runs_off_bat; bowl.noBalls += 1; bowl.overs += 1 / 6; }
        else { bowl.runs += b.runs_off_bat + b.extra_runs; bowl.overs += 1 / 6; }
        if (b.is_wicket && b.wicket_type !== 'run_out') bowl.wickets += 1;
      }
    });

    return {
      battingTeam: inn.batting_team_info?.team_name ?? 'Team',
      runs: inn.runs, wickets: inn.wickets,
      overs: formatOvers(Math.round(inn.overs_bowled * 6)),
      extras: inn.extras,
      batting: Object.values(batMap),
      bowling: Object.values(bowlMap),
    };
  };

  if (loading) return (
    <LinearGradient colors={['#050E1F', '#0D1B2E']} style={styles.container}>
      <ActivityIndicator color={COLORS.green} style={{ marginTop: 100 }} />
    </LinearGradient>
  );

  const activeInnings = activeTab === 1 ? innings1 : innings2;

  return (
    <LinearGradient colors={['#050E1F', '#0D1B2E']} style={styles.container}>
      <LinearGradient colors={['#142338', '#0D1B2E']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scorecard</Text>
        {match?.result_text && (
          <View style={styles.resultBadge}>
            <Text style={styles.resultText}>{match.result_text}</Text>
          </View>
        )}
        <View style={styles.matchInfo}>
          <Text style={styles.matchTeams}>{match?.team_a_name} vs {match?.team_b_name}</Text>
          <Text style={styles.matchOvers}>{match?.overs} Overs</Text>
        </View>
      </LinearGradient>

      {/* Innings Tabs */}
      {innings2 && (
        <View style={styles.tabs}>
          {[1, 2].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab as 1 | 2)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab === 1 ? innings1?.battingTeam : innings2?.battingTeam} Innings
              </Text>
              <Text style={[styles.tabScore, activeTab === tab && styles.tabScoreActive]}>
                {tab === 1
                  ? `${innings1?.runs}/${innings1?.wickets} (${innings1?.overs})`
                  : `${innings2?.runs}/${innings2?.wickets} (${innings2?.overs})`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scroll}>
        {activeInnings ? (
          <>
            {/* Summary */}
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTeam}>{activeInnings.battingTeam}</Text>
              <Text style={styles.summaryScore}>{activeInnings.runs}/{activeInnings.wickets}</Text>
              <Text style={styles.summaryMeta}>Overs: {activeInnings.overs} • Extras: {activeInnings.extras}</Text>
            </View>

            {/* Batting */}
            <View style={styles.tableCard}>
              <Text style={styles.tableTitle}>Batting</Text>
              <View style={styles.tableHeader}>
                <Text style={[styles.thCell, { flex: 3 }]}>Batsman</Text>
                <Text style={styles.thCell}>R</Text>
                <Text style={styles.thCell}>B</Text>
                <Text style={styles.thCell}>4s</Text>
                <Text style={styles.thCell}>6s</Text>
                <Text style={styles.thCell}>SR</Text>
              </View>
              {activeInnings.batting.map((b, i) => (
                <View key={i} style={[styles.tableRow, i % 2 === 0 && styles.tableRowAlt]}>
                  <View style={{ flex: 3 }}>
                    <Text style={styles.playerCell}>{b.name}</Text>
                    {b.isOut && <Text style={styles.dismissalText}>{b.dismissal}</Text>}
                  </View>
                  <Text style={styles.tdCell}>{b.runs}</Text>
                  <Text style={styles.tdCell}>{b.balls}</Text>
                  <Text style={styles.tdCell}>{b.fours}</Text>
                  <Text style={styles.tdCell}>{b.sixes}</Text>
                  <Text style={styles.tdCell}>{getStrikeRate(b.runs, b.balls)}</Text>
                </View>
              ))}
              {activeInnings.batting.length === 0 && (
                <Text style={styles.noData}>No batting data</Text>
              )}
            </View>

            {/* Bowling */}
            <View style={styles.tableCard}>
              <Text style={styles.tableTitle}>Bowling</Text>
              <View style={styles.tableHeader}>
                <Text style={[styles.thCell, { flex: 3 }]}>Bowler</Text>
                <Text style={styles.thCell}>O</Text>
                <Text style={styles.thCell}>R</Text>
                <Text style={styles.thCell}>W</Text>
                <Text style={styles.thCell}>Econ</Text>
              </View>
              {activeInnings.bowling.map((b, i) => (
                <View key={i} style={[styles.tableRow, i % 2 === 0 && styles.tableRowAlt]}>
                  <Text style={[styles.playerCell, { flex: 3 }]}>{b.name}</Text>
                  <Text style={styles.tdCell}>{b.overs.toFixed(1)}</Text>
                  <Text style={styles.tdCell}>{b.runs}</Text>
                  <Text style={[styles.tdCell, b.wickets > 0 && { color: COLORS.green, fontWeight: '700' }]}>{b.wickets}</Text>
                  <Text style={styles.tdCell}>{getEconomy(b.runs, Math.round(b.overs * 6))}</Text>
                </View>
              ))}
              {activeInnings.bowling.length === 0 && (
                <Text style={styles.noData}>No bowling data</Text>
              )}
            </View>
          </>
        ) : (
          <View style={styles.noInnings}>
            <Text style={styles.noInningsText}>No innings data yet</Text>
          </View>
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
  headerTitle: { fontSize: FONTS.sizes.xxl, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 4 },
  resultBadge: {
    backgroundColor: COLORS.gold + '22', borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md, paddingVertical: 4, alignSelf: 'flex-start',
    borderWidth: 1, borderColor: COLORS.gold + '55', marginBottom: 4,
  },
  resultText: { color: COLORS.gold, fontWeight: '700', fontSize: FONTS.sizes.sm },
  matchInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  matchTeams: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, fontWeight: '600' },
  matchOvers: { fontSize: FONTS.sizes.sm, color: COLORS.textMuted },
  tabs: { flexDirection: 'row', paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md, gap: SPACING.sm },
  tab: {
    flex: 1, backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md,
    padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border,
  },
  tabActive: { borderColor: COLORS.green, backgroundColor: COLORS.green + '15' },
  tabText: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, fontWeight: '700', marginBottom: 2 },
  tabTextActive: { color: COLORS.green },
  tabScore: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, fontWeight: '700' },
  tabScoreActive: { color: COLORS.textPrimary },
  scroll: { padding: SPACING.xl, paddingBottom: 100 },
  summaryCard: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg,
    padding: SPACING.xl, marginBottom: SPACING.lg,
    borderWidth: 1, borderColor: COLORS.border, alignItems: 'center',
  },
  summaryTeam: { fontSize: FONTS.sizes.md, color: COLORS.textSecondary, fontWeight: '600', marginBottom: 4 },
  summaryScore: { fontSize: FONTS.sizes.score, fontWeight: '900', color: COLORS.textPrimary },
  summaryMeta: { fontSize: FONTS.sizes.sm, color: COLORS.textMuted, marginTop: 4 },
  tableCard: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg,
    marginBottom: SPACING.lg, overflow: 'hidden',
    borderWidth: 1, borderColor: COLORS.border,
  },
  tableTitle: {
    fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.textPrimary,
    padding: SPACING.lg, borderBottomWidth: 1, borderColor: COLORS.border,
  },
  tableHeader: {
    flexDirection: 'row', backgroundColor: COLORS.bgElevated,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    borderBottomWidth: 1, borderColor: COLORS.border,
  },
  thCell: { flex: 1, fontSize: 11, color: COLORS.textMuted, fontWeight: '700', textAlign: 'center', textTransform: 'uppercase' },
  tableRow: { flexDirection: 'row', paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
  tableRowAlt: { backgroundColor: COLORS.bgElevated + '44' },
  playerCell: { fontSize: FONTS.sizes.sm, color: COLORS.textPrimary, fontWeight: '600' },
  dismissalText: { fontSize: 10, color: COLORS.textMuted, marginTop: 1 },
  tdCell: { flex: 1, fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, textAlign: 'center' },
  noData: { padding: SPACING.xl, textAlign: 'center', color: COLORS.textMuted },
  noInnings: { alignItems: 'center', paddingTop: SPACING.xxxl },
  noInningsText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.lg },
});

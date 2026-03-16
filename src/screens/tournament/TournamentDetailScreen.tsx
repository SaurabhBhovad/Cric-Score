import React, { useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTournamentStore } from '../../store/tournamentStore';
import { COLORS, FONTS, SPACING, RADIUS } from '../../theme/theme';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';
import { supabase } from '../../services/supabaseClient';

type Props = NativeStackScreenProps<RootStackParamList, 'TournamentDetail'>;

interface AwardStats {
  playerId: string;
  name: string;
  runs: number;
  wickets: number;
  points: number;
}

export default function TournamentDetailScreen({ navigation, route }: Props) {
  const { tournamentId } = route.params;
  const { currentTournament, tournamentTeams, tournamentMatches, loading, fetchTournamentDetails, generateFixtures } = useTournamentStore();

  const [awards, setAwards] = React.useState<{ batsman?: AwardStats; bowler?: AwardStats; mvp?: AwardStats }>({});
  const [calculatingAwards, setCalculatingAwards] = React.useState(false);

  useEffect(() => {
    fetchTournamentDetails(tournamentId);
  }, [tournamentId]);

  useEffect(() => {
    if (tournamentMatches.length > 0) {
      calculateAwards();
    }
  }, [tournamentMatches]);

  const calculateAwards = async () => {
    const completedIds = tournamentMatches.filter(m => m.status === 'completed').map(m => m.id);
    if (completedIds.length === 0) return;

    setCalculatingAwards(true);
    const { data: balls } = await supabase
      .from('balls')
      .select('runs_off_bat, is_wicket, wicket_type, batsman_id, bowler_id, players!batsman_id(player_name)')
      .in('match_id', completedIds);

    if (balls) {
      const stats: Record<string, AwardStats> = {};
      balls.forEach((b: any) => {
          const bId = b.batsman_id;
          const bowId = b.bowler_id;
          const bName = b.players?.player_name ?? 'Unknown';

          if (bId) {
              if (!stats[bId]) stats[bId] = { playerId: bId, name: bName, runs: 0, wickets: 0, points: 0 };
              stats[bId].runs += b.runs_off_bat;
          }
          if (bowId) {
              // We need the bowler's name here too... let's assume we can get it or just use the ID for now
              // For accuracy, we should join bowler name too.
              if (!stats[bowId]) stats[bowId] = { playerId: bowId, name: 'Player', runs: 0, wickets: 0, points: 0 };
              if (b.is_wicket && b.wicket_type !== 'run_out') {
                  stats[bowId].wickets += 1;
              }
          }
      });

      // Compute points
      Object.values(stats).forEach(s => {
          s.points = s.runs + (s.wickets * 20);
      });

      const sortedByRuns = Object.values(stats).sort((a, b) => b.runs - a.runs);
      const sortedByWickets = Object.values(stats).sort((a, b) => b.wickets - a.wickets);
      const sortedByPoints = Object.values(stats).sort((a, b) => b.points - a.points);

      setAwards({
          batsman: sortedByRuns[0],
          bowler: sortedByWickets[0],
          mvp: sortedByPoints[0]
      });
    }
    setCalculatingAwards(false);
  };

  if (loading || !currentTournament) {
    return (
      <LinearGradient colors={['#050E1F', '#0D1B2E']} style={styles.container}>
        <ActivityIndicator color={COLORS.gold} style={{ marginTop: 100 }} />
      </LinearGradient>
    );
  }

  // Points table computation
  const points: Record<string, { name: string; p: number; w: number; l: number; pts: number; nrr: number }> = {};
  tournamentTeams.forEach((t) => {
    points[t.id] = { name: t.team_name, p: 0, w: 0, l: 0, pts: 0, nrr: 0 };
  });
  tournamentMatches.forEach((m) => {
    if (m.status === 'completed' && m.winner) {
      const loserId = m.team_a === m.winner ? m.team_b : m.team_a;
      if (points[m.winner]) { points[m.winner].w += 1; points[m.winner].pts += 2; points[m.winner].p += 1; }
      if (points[loserId]) { points[loserId].l += 1; points[loserId].p += 1; }
    }
  });
  const pointsTable = Object.values(points).sort((a, b) => b.pts - a.pts || b.w - a.w);

  const handleGenerateFixtures = async () => {
    const teamIds = tournamentTeams.map((t) => t.id);
    try {
      await generateFixtures(tournamentId, teamIds, currentTournament.overs);
      await fetchTournamentDetails(tournamentId);
    } catch (e: any) { console.error(e); }
  };

  return (
    <LinearGradient colors={['#050E1F', '#0D1B2E']} style={styles.container}>
      <LinearGradient colors={['#142338', '#0D1B2E']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Tournaments</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{currentTournament.name}</Text>
        <Text style={styles.headerSub}>{currentTournament.overs} Overs • {currentTournament.format}</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Teams */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👥 Teams ({tournamentTeams.length})</Text>
          <View style={styles.teamsWrap}>
            {tournamentTeams.map((t) => (
              <View key={t.id} style={styles.teamChip}>
                <View style={[styles.teamDot, { backgroundColor: t.team_color }]} />
                <Text style={styles.teamChipText}>{t.team_name}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Points Table */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Points Table</Text>
          <View style={styles.tableHeader}>
            <Text style={[styles.thCell, { flex: 3, textAlign: 'left' }]}>Team</Text>
            <Text style={styles.thCell}>P</Text>
            <Text style={styles.thCell}>W</Text>
            <Text style={styles.thCell}>L</Text>
            <Text style={styles.thCell}>PTS</Text>
          </View>
          {pointsTable.map((row, i) => (
            <View key={row.name} style={[styles.tableRow, i === 0 && styles.tableRowTop]}>
              <View style={{ flex: 3, flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
                {i === 0 && <Text style={styles.rankIcon}>🥇</Text>}
                {i === 1 && <Text style={styles.rankIcon}>🥈</Text>}
                {i === 2 && <Text style={styles.rankIcon}>🥉</Text>}
                {i > 2 && <Text style={styles.rankNum}>{i + 1}</Text>}
                <Text style={[styles.ptTeam, i === 0 && { color: COLORS.gold }]}>{row.name}</Text>
              </View>
              <Text style={styles.ptCell}>{row.p}</Text>
              <Text style={[styles.ptCell, { color: COLORS.green }]}>{row.w}</Text>
              <Text style={[styles.ptCell, { color: COLORS.red }]}>{row.l}</Text>
              <Text style={[styles.ptCell, styles.ptsCell, i === 0 && { color: COLORS.gold }]}>{row.pts}</Text>
            </View>
          ))}
          {pointsTable.length === 0 && (
            <Text style={styles.noData}>No teams in this tournament</Text>
          )}
        </View>

        {/* Awards */}
        {(awards.batsman || awards.bowler || awards.mvp) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>✨ Tournament Awards</Text>
            <View style={styles.awardsGrid}>
              {awards.mvp && (
                <View style={[styles.awardCard, styles.awardCardMVP]}>
                  <Text style={styles.awardEmoji}>👑</Text>
                  <Text style={styles.awardLabel}>Player of Tournament</Text>
                  <Text style={styles.awardName}>{awards.mvp.name}</Text>
                  <Text style={styles.awardValue}>{awards.mvp.points} Points</Text>
                </View>
              )}
              <View style={styles.awardRow}>
                {awards.batsman && (
                  <View style={styles.awardCard}>
                    <Text style={styles.awardEmoji}>🏏</Text>
                    <Text style={styles.awardLabel}>Best Batsman</Text>
                    <Text style={styles.awardName}>{awards.batsman.name}</Text>
                    <Text style={styles.awardValue}>{awards.batsman.runs} Runs</Text>
                  </View>
                )}
                {awards.bowler && (
                  <View style={styles.awardCard}>
                    <Text style={styles.awardEmoji}>🎾</Text>
                    <Text style={styles.awardLabel}>Best Bowler</Text>
                    <Text style={styles.awardName}>{awards.bowler.name}</Text>
                    <Text style={styles.awardValue}>{awards.bowler.wickets} Wkts</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Fixtures */}
        <View style={styles.section}>
          <View style={styles.fixturesHeader}>
            <Text style={styles.sectionTitle}>🏏 Fixtures</Text>
            {tournamentMatches.length === 0 && tournamentTeams.length >= 2 && (
              <TouchableOpacity style={styles.genBtn} onPress={handleGenerateFixtures}>
                <LinearGradient colors={['#FFD700', '#D4AF37']} style={styles.genBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  <Text style={styles.genBtnText}>Generate Fixtures</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>

          {tournamentMatches.map((m) => (
            <TouchableOpacity
              key={m.id}
              style={styles.matchCard}
              onPress={() => {
                if (m.status === 'scheduled') {
                  navigation.navigate('PlayerSelection', {
                    match: m,
                    tossWinner: m.team_a,
                    tossChoice: 'bat',
                  });
                } else if (m.status === 'live') {
                  navigation.navigate('LiveScore', { matchId: m.id });
                } else {
                  navigation.navigate('Scorecard', { matchId: m.id });
                }
              }}
              activeOpacity={0.85}
            >
              <View style={styles.matchCardContent}>
                <View style={styles.matchTeamCol}>
                  <Text style={styles.matchTeam}>{m.team_a_name}</Text>
                </View>
                <View style={styles.matchVsCol}>
                  <Text style={styles.matchVs}>vs</Text>
                  <View style={[styles.matchStatus, { backgroundColor: statusColor(m.status) + '22' }]}>
                    <Text style={[styles.matchStatusText, { color: statusColor(m.status) }]}>{m.status}</Text>
                  </View>
                </View>
                <View style={styles.matchTeamCol}>
                  <Text style={[styles.matchTeam, { textAlign: 'right' }]}>{m.team_b_name}</Text>
                </View>
              </View>
              {m.result_text && <Text style={styles.resultText}>{m.result_text}</Text>}
            </TouchableOpacity>
          ))}

          {tournamentMatches.length === 0 && (
            <Text style={styles.noData}>
              {tournamentTeams.length < 2 ? 'Add at least 2 teams first' : 'No fixtures yet. Generate fixtures!'}
            </Text>
          )}
        </View>

      </ScrollView>
    </LinearGradient>
  );
}

function statusColor(status: string) {
  if (status === 'live') return COLORS.green;
  if (status === 'completed') return COLORS.gold;
  return COLORS.textMuted;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 56, paddingBottom: SPACING.xl, paddingHorizontal: SPACING.xl },
  backBtn: { marginBottom: SPACING.sm },
  backText: { color: COLORS.gold, fontSize: FONTS.sizes.md, fontWeight: '600' },
  headerTitle: { fontSize: FONTS.sizes.xxl, fontWeight: '800', color: COLORS.textPrimary },
  headerSub: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: 2 },
  scroll: { padding: SPACING.xl, paddingBottom: 100 },
  section: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, padding: SPACING.xl, marginBottom: SPACING.lg, borderWidth: 1, borderColor: COLORS.border },
  sectionTitle: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.textPrimary, marginBottom: SPACING.md },
  teamsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  teamChip: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: COLORS.bgElevated, borderRadius: RADIUS.full, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderWidth: 1, borderColor: COLORS.border },
  teamDot: { width: 8, height: 8, borderRadius: 4 },
  teamChipText: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, fontWeight: '600' },
  tableHeader: { flexDirection: 'row', backgroundColor: COLORS.bgElevated, borderRadius: RADIUS.sm, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, marginBottom: SPACING.sm },
  thCell: { flex: 1, fontSize: 11, color: COLORS.textMuted, fontWeight: '700', textTransform: 'uppercase', textAlign: 'center' },
  tableRow: { flexDirection: 'row', paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: RADIUS.sm },
  tableRowTop: { backgroundColor: COLORS.gold + '10' },
  rankIcon: { fontSize: 14 },
  rankNum: { width: 16, textAlign: 'center', color: COLORS.textMuted, fontSize: FONTS.sizes.sm, fontWeight: '700' },
  ptTeam: { flex: 1, fontSize: FONTS.sizes.sm, color: COLORS.textPrimary, fontWeight: '700' },
  ptCell: { flex: 1, fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, textAlign: 'center', fontWeight: '600' },
  ptsCell: { fontWeight: '800', color: COLORS.textPrimary },
  fixturesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  genBtn: { borderRadius: RADIUS.sm, overflow: 'hidden' },
  genBtnGrad: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
  genBtnText: { color: '#000', fontWeight: '700', fontSize: FONTS.sizes.xs },
  matchCard: { backgroundColor: COLORS.bgElevated, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.border },
  matchCardContent: { flexDirection: 'row', alignItems: 'center' },
  matchTeamCol: { flex: 2 },
  matchVsCol: { flex: 1, alignItems: 'center', gap: 4 },
  matchTeam: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.textPrimary },
  matchVs: { fontSize: 10, color: COLORS.textMuted, fontWeight: '700' },
  matchStatus: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: RADIUS.full },
  matchStatusText: { fontSize: 9, fontWeight: '800' },
  resultText: { fontSize: FONTS.sizes.xs, color: COLORS.gold, textAlign: 'center', marginTop: 4 },
  noData: { color: COLORS.textMuted, fontSize: FONTS.sizes.sm, textAlign: 'center', paddingVertical: SPACING.lg },
  awardsGrid: { gap: SPACING.sm },
  awardCard: { flex: 1, backgroundColor: COLORS.bgElevated, borderRadius: RADIUS.md, padding: SPACING.lg, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  awardCardMVP: { backgroundColor: COLORS.gold + '15', borderColor: COLORS.gold + '40', marginBottom: SPACING.sm },
  awardEmoji: { fontSize: 24, marginBottom: 4 },
  awardLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 },
  awardName: { fontSize: FONTS.sizes.md, fontWeight: '800', color: COLORS.textPrimary, textAlign: 'center' },
  awardValue: { fontSize: FONTS.sizes.sm, color: COLORS.green, fontWeight: '700', marginTop: 2 },
  awardRow: { flexDirection: 'row', gap: SPACING.sm },
});

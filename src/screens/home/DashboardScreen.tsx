import React, { useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../store/authStore';
import { useTeamStore } from '../../store/teamStore';
import { useMatchStore } from '../../store/matchStore';
import { useTournamentStore } from '../../store/tournamentStore';
import { COLORS, FONTS, SPACING, RADIUS } from '../../theme/theme';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Dashboard'>;

const StatCard = ({ icon, label, value, color }: { icon: string; label: string; value: string | number; color: string }) => (
  <View style={[styles.statCard, { borderColor: color + '40' }]}>
    <Text style={styles.statIcon}>{icon}</Text>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const QuickAction = ({ icon, label, onPress, gradient }: any) => (
  <TouchableOpacity style={styles.qaBtn} onPress={onPress} activeOpacity={0.8}>
    <LinearGradient colors={gradient} style={styles.qaGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
      <Text style={styles.qaIcon}>{icon}</Text>
      <Text style={styles.qaLabel}>{label}</Text>
    </LinearGradient>
  </TouchableOpacity>
);

export default function DashboardScreen({ navigation }: Props) {
  const { user, logout } = useAuthStore();
  const { teams, fetchTeams } = useTeamStore();
  const { matches, fetchMatches } = useMatchStore();
  const { tournaments, fetchTournaments } = useTournamentStore();
  const [refreshing, setRefreshing] = React.useState(false);

  const loadAll = async () => {
    await Promise.all([fetchTeams(), fetchMatches(), fetchTournaments()]);
  };

  useEffect(() => { loadAll(); }, []);

  const onRefresh = async () => { setRefreshing(true); await loadAll(); setRefreshing(false); };

  const name = user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? 'Scorer';
  const liveMatches = matches.filter((m) => m.status === 'live');
  const completedMatches = matches.filter((m) => m.status === 'completed');

  return (
    <LinearGradient colors={['#050E1F', '#0D1B2E']} style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.green} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <LinearGradient colors={['#142338', '#0D1B2E']} style={styles.headerGrad}>
            <View style={styles.headerTop}>
              <View>
                <Text style={styles.greeting}>Hello, {name} 👋</Text>
                <Text style={styles.subGreeting}>Ready to score today?</Text>
              </View>
              <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
                <Text style={styles.logoutText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>

        {/* Live Match Banner */}
        {liveMatches.length > 0 && (
          <TouchableOpacity
            style={styles.liveBanner}
            onPress={() => navigation.navigate('LiveScore', { matchId: liveMatches[0].id })}
            activeOpacity={0.9}
          >
            <LinearGradient colors={['#00D26A20', '#00A85510']} style={styles.liveBannerGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <View style={styles.liveDot} />
              <Text style={styles.liveBannerText}>LIVE: {liveMatches[0].team_a_name} vs {liveMatches[0].team_b_name}</Text>
              <Text style={styles.liveBannerArrow}>→</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Stats */}
        <View style={styles.statsRow}>
          <StatCard icon="🏟️" label="Matches" value={matches.length} color={COLORS.blue} />
          <StatCard icon="👥" label="Teams" value={teams.length} color={COLORS.green} />
          <StatCard icon="🏆" label="Tournaments" value={tournaments.length} color={COLORS.gold} />
          <StatCard icon="✅" label="Completed" value={completedMatches.length} color={COLORS.orange} />
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.qaGrid}>
          <QuickAction icon="🏏" label="New Match" gradient={['#00D26A', '#00A855']}
            onPress={() => navigation.navigate('MatchSetup', {})} />
          <QuickAction icon="🏆" label="Tournament" gradient={['#FFD700', '#D4AF37']}
            onPress={() => navigation.navigate('Tournaments')} />
          <QuickAction icon="👥" label="Teams" gradient={['#2979FF', '#1565C0']}
            onPress={() => navigation.navigate('Teams')} />
          <QuickAction icon="📋" label="History" gradient={['#FF9800', '#E65100']}
            onPress={() => navigation.navigate('MatchHistory')} />
        </View>

        {/* Recent Matches */}
        <Text style={styles.sectionTitle}>Recent Matches</Text>
        {matches.slice(0, 5).map((match) => (
          <TouchableOpacity
            key={match.id}
            style={styles.matchCard}
            onPress={() => {
              if (match.status === 'live') navigation.navigate('LiveScore', { matchId: match.id });
              else if (match.status === 'completed') navigation.navigate('Scorecard', { matchId: match.id });
            }}
            activeOpacity={0.85}
          >
            <View style={styles.matchCardInner}>
              <View style={styles.matchTeams}>
                <Text style={styles.teamName}>{match.team_a_name ?? 'Team A'}</Text>
                <View style={styles.vsChip}><Text style={styles.vsText}>vs</Text></View>
                <Text style={styles.teamName}>{match.team_b_name ?? 'Team B'}</Text>
              </View>
              <View style={styles.matchMeta}>
                <View style={[styles.statusChip, { backgroundColor: statusColor(match.status) + '22', borderColor: statusColor(match.status) + '55' }]}>
                  <Text style={[styles.statusText, { color: statusColor(match.status) }]}>{match.status.toUpperCase()}</Text>
                </View>
                <Text style={styles.matchOvers}>{match.overs} Ov</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}

        {matches.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🏏</Text>
            <Text style={styles.emptyText}>No matches yet</Text>
            <Text style={styles.emptySubText}>Tap "New Match" to get started</Text>
          </View>
        )}

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
  scroll: { paddingBottom: 100 },
  header: { marginBottom: SPACING.lg },
  headerGrad: { paddingTop: 56, paddingBottom: SPACING.xl, paddingHorizontal: SPACING.xl },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greeting: { fontSize: FONTS.sizes.xxl, fontWeight: '800', color: COLORS.textPrimary },
  subGreeting: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: 2 },
  logoutBtn: {
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.border,
  },
  logoutText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.sm },
  liveBanner: {
    marginHorizontal: SPACING.xl, marginBottom: SPACING.lg,
    borderRadius: RADIUS.md, overflow: 'hidden',
    borderWidth: 1, borderColor: COLORS.green + '40',
  },
  liveBannerGrad: { flexDirection: 'row', alignItems: 'center', padding: SPACING.md },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.green, marginRight: SPACING.sm },
  liveBannerText: { flex: 1, color: COLORS.textPrimary, fontSize: FONTS.sizes.sm, fontWeight: '600' },
  liveBannerArrow: { color: COLORS.green, fontWeight: '700' },
  statsRow: { flexDirection: 'row', paddingHorizontal: SPACING.xl, marginBottom: SPACING.xl, gap: SPACING.sm },
  statCard: {
    flex: 1, backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md,
    padding: SPACING.md, alignItems: 'center',
    borderWidth: 1,
  },
  statIcon: { fontSize: 18, marginBottom: 4 },
  statValue: { fontSize: FONTS.sizes.xl, fontWeight: '800' },
  statLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600', textTransform: 'uppercase' },
  sectionTitle: {
    fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.textPrimary,
    paddingHorizontal: SPACING.xl, marginBottom: SPACING.md,
  },
  qaGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: SPACING.xl, gap: SPACING.sm, marginBottom: SPACING.xxl,
  },
  qaBtn: { width: '47.5%', borderRadius: RADIUS.lg, overflow: 'hidden' },
  qaGrad: { padding: SPACING.xl, alignItems: 'center', justifyContent: 'center', minHeight: 90 },
  qaIcon: { fontSize: 28, marginBottom: SPACING.sm },
  qaLabel: { fontSize: FONTS.sizes.md, fontWeight: '700', color: '#FFFFFF' },
  matchCard: {
    marginHorizontal: SPACING.xl, marginBottom: SPACING.sm,
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border,
  },
  matchCardInner: { padding: SPACING.lg },
  matchTeams: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm },
  teamName: { flex: 1, fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center' },
  vsChip: { paddingHorizontal: SPACING.sm },
  vsText: { color: COLORS.textMuted, fontSize: FONTS.sizes.sm, fontWeight: '600' },
  matchMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusChip: { paddingHorizontal: SPACING.sm, paddingVertical: 3, borderRadius: RADIUS.full, borderWidth: 1 },
  statusText: { fontSize: 11, fontWeight: '700' },
  matchOvers: { fontSize: FONTS.sizes.sm, color: COLORS.textMuted },
  emptyState: { alignItems: 'center', paddingVertical: SPACING.xxxl },
  emptyIcon: { fontSize: 48, marginBottom: SPACING.md },
  emptyText: { fontSize: FONTS.sizes.lg, color: COLORS.textSecondary, fontWeight: '600' },
  emptySubText: { fontSize: FONTS.sizes.sm, color: COLORS.textMuted, marginTop: 4 },
});

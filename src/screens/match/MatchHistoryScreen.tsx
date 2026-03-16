import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useMatchStore, Match } from '../../store/matchStore';
import { COLORS, FONTS, SPACING, RADIUS } from '../../theme/theme';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';

type Props = NativeStackScreenProps<RootStackParamList, 'MatchHistory'>;

export default function MatchHistoryScreen({ navigation }: Props) {
  const { matches, fetchMatches, deleteMatch, loading } = useMatchStore();
  const [filter, setFilter] = useState<'all' | 'live' | 'completed' | 'scheduled'>('all');

  useEffect(() => { fetchMatches(); }, []);

  const filtered = matches.filter((m) => filter === 'all' || m.status === filter);

  const renderMatch = ({ item }: { item: Match }) => (
    <TouchableOpacity
      style={styles.matchCard}
      onPress={() => {
        if (item.status === 'live') navigation.navigate('LiveScore', { matchId: item.id });
        else if (item.status === 'completed') navigation.navigate('Scorecard', { matchId: item.id });
      }}
      activeOpacity={0.85}
    >
      <View style={styles.matchCardHeader}>
        <Text style={[styles.statusBadge, { color: statusColor(item.status) }]}>{item.status.toUpperCase()}</Text>
        <Text style={styles.matchOvers}>{item.overs} Overs</Text>
      </View>
      <View style={styles.matchTeamsRow}>
        <Text style={styles.teamName}>{item.team_a_name ?? 'Team A'}</Text>
        <View style={styles.vsCircle}><Text style={styles.vsText}>vs</Text></View>
        <Text style={styles.teamName}>{item.team_b_name ?? 'Team B'}</Text>
      </View>
      {item.result_text && (
        <Text style={styles.resultText}>{item.result_text}</Text>
      )}
      {item.status === 'live' && (
        <View style={styles.liveChip}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE — Tap to score</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <LinearGradient colors={['#050E1F', '#0D1B2E']} style={styles.container}>
      <LinearGradient colors={['#142338', '#0D1B2E']} style={styles.header}>
        <Text style={styles.headerTitle}>Match History</Text>
        <Text style={styles.headerSub}>{matches.length} total matches</Text>
      </LinearGradient>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {(['all', 'live', 'completed', 'scheduled'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={COLORS.green} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(m) => m.id}
          renderItem={renderMatch}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyText}>No matches found</Text>
            </View>
          }
        />
      )}

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('MatchSetup', {})}>
        <LinearGradient colors={['#00D26A', '#00A855']} style={styles.fabGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <Text style={styles.fabText}>+</Text>
        </LinearGradient>
      </TouchableOpacity>
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
  headerTitle: { fontSize: FONTS.sizes.xxl, fontWeight: '800', color: COLORS.textPrimary },
  headerSub: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: 2 },
  filterRow: { flexDirection: 'row', paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md, gap: SPACING.sm },
  filterChip: {
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.bgCard,
  },
  filterChipActive: { borderColor: COLORS.green, backgroundColor: COLORS.green + '22' },
  filterText: { color: COLORS.textMuted, fontSize: FONTS.sizes.sm, fontWeight: '600' },
  filterTextActive: { color: COLORS.green },
  list: { padding: SPACING.xl, paddingBottom: 100 },
  matchCard: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg,
    padding: SPACING.lg, marginBottom: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border,
  },
  matchCardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.sm },
  statusBadge: { fontSize: 11, fontWeight: '800' },
  matchOvers: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted },
  matchTeamsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm },
  teamName: { flex: 1, fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center' },
  vsCircle: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.bgElevated, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  vsText: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, fontWeight: '700' },
  resultText: { fontSize: FONTS.sizes.sm, color: COLORS.gold, textAlign: 'center', marginTop: 4 },
  liveChip: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: SPACING.sm, gap: SPACING.xs },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.green },
  liveText: { color: COLORS.green, fontSize: FONTS.sizes.xs, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: SPACING.xxxl * 2 },
  emptyIcon: { fontSize: 48, marginBottom: SPACING.md },
  emptyText: { fontSize: FONTS.sizes.lg, color: COLORS.textSecondary, fontWeight: '700' },
  fab: {
    position: 'absolute', bottom: 24, right: 24,
    width: 56, height: 56, borderRadius: 28, overflow: 'hidden',
    shadowColor: COLORS.green, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  fabGrad: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  fabText: { fontSize: 28, fontWeight: '700', color: COLORS.textOnGreen, lineHeight: 32 },
});

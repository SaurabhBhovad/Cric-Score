import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTeamStore, Player, Team } from '../../store/teamStore';
import { COLORS, FONTS, SPACING, RADIUS } from '../../theme/theme';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';

type Props = NativeStackScreenProps<RootStackParamList, 'TeamDetail'>;

const BATTING_STYLES = ['Right Hand', 'Left Hand'];
const BOWLING_STYLES = ['Right Arm Fast', 'Right Arm Medium', 'Right Arm Off Break', 'Left Arm Fast', 'Left Arm Medium', 'Left Arm Spin'];

export default function TeamDetailScreen({ navigation, route }: Props) {
  const { team } = route.params;
  const { players, fetchPlayers, addPlayer, deletePlayer, loading } = useTeamStore();
  const [modalVisible, setModalVisible] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [jerseyNum, setJerseyNum] = useState('');
  const [battingStyle, setBattingStyle] = useState(BATTING_STYLES[0]);
  const [bowlingStyle, setBowlingStyle] = useState(BOWLING_STYLES[1]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    navigation.setOptions({ title: team.team_name });
    fetchPlayers(team.id);
  }, []);

  const resetForm = () => { setPlayerName(''); setJerseyNum(''); setBattingStyle(BATTING_STYLES[0]); setBowlingStyle(BOWLING_STYLES[1]); };

  const handleAdd = async () => {
    if (!playerName.trim()) { Alert.alert('Error', 'Player name is required.'); return; }
    setSaving(true);
    try {
      await addPlayer({
        team_id: team.id,
        player_name: playerName.trim(),
        jersey_number: jerseyNum ? parseInt(jerseyNum) : undefined,
        batting_style: battingStyle,
        bowling_style: bowlingStyle,
      });
      resetForm(); setModalVisible(false);
    } catch (e: any) { Alert.alert('Error', e.message); }
    setSaving(false);
  };

  const handleDelete = (p: Player) => {
    Alert.alert('Remove Player', `Remove "${p.player_name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        try { await deletePlayer(p.id); } catch (e: any) { Alert.alert('Error', e.message); }
      }},
    ]);
  };

  const renderPlayer = ({ item, index }: { item: Player; index: number }) => (
    <View style={styles.playerCard}>
      <View style={[styles.jerseyBadge, { backgroundColor: team.team_color }]}>
        <Text style={styles.jerseyText}>{item.jersey_number ?? index + 1}</Text>
      </View>
      <View style={styles.playerInfo}>
        <Text style={styles.playerName}>{item.player_name}</Text>
        <Text style={styles.playerMeta}>{item.batting_style} • {item.bowling_style}</Text>
      </View>
      <TouchableOpacity onPress={() => handleDelete(item)} style={styles.deleteBtn}>
        <Text style={styles.deleteText}>✕</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <LinearGradient colors={['#050E1F', '#0D1B2E']} style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#142338', '#0D1B2E']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Teams</Text>
        </TouchableOpacity>
        <View style={styles.headerMain}>
          <View style={[styles.teamColorDot, { backgroundColor: team.team_color }]} />
          <Text style={styles.headerTitle}>{team.team_name}</Text>
        </View>
        <Text style={styles.headerSub}>{players.length} player{players.length !== 1 ? 's' : ''}</Text>
      </LinearGradient>

      {loading ? (
        <ActivityIndicator color={COLORS.green} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={players}
          keyExtractor={(p) => p.id}
          renderItem={renderPlayer}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🏃</Text>
              <Text style={styles.emptyText}>No players yet</Text>
              <Text style={styles.emptySub}>Add players to this team</Text>
            </View>
          }
          ListFooterComponent={
            <TouchableOpacity style={styles.addPlayerBtn} onPress={() => setModalVisible(true)}>
              <LinearGradient colors={['#00D26A22', '#00A85511']} style={styles.addPlayerGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Text style={styles.addPlayerText}>+ Add Player</Text>
              </LinearGradient>
            </TouchableOpacity>
          }
        />
      )}

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Player</Text>

            <Text style={styles.fieldLabel}>Player Name *</Text>
            <TextInput
              style={styles.input}
              value={playerName}
              onChangeText={setPlayerName}
              placeholder="e.g. Virat Kohli"
              placeholderTextColor={COLORS.textMuted}
              autoFocus
            />

            <Text style={styles.fieldLabel}>Jersey Number</Text>
            <TextInput
              style={styles.input}
              value={jerseyNum}
              onChangeText={setJerseyNum}
              placeholder="Optional"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="number-pad"
            />

            <Text style={styles.fieldLabel}>Batting Style</Text>
            <View style={styles.chipRow}>
              {BATTING_STYLES.map((s) => (
                <TouchableOpacity key={s} style={[styles.chip, battingStyle === s && styles.chipActive]} onPress={() => setBattingStyle(s)}>
                  <Text style={[styles.chipText, battingStyle === s && styles.chipTextActive]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Bowling Style</Text>
            <View style={styles.chipRow}>
              {BOWLING_STYLES.map((s) => (
                <TouchableOpacity key={s} style={[styles.chip, bowlingStyle === s && styles.chipActive]} onPress={() => setBowlingStyle(s)}>
                  <Text style={[styles.chipText, bowlingStyle === s && styles.chipTextActive]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { resetForm(); setModalVisible(false); }}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleAdd} disabled={saving}>
                <LinearGradient colors={['#00D26A', '#00A855']} style={styles.saveBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  <Text style={styles.saveBtnText}>{saving ? 'Adding...' : 'Add Player'}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 56, paddingBottom: SPACING.xl, paddingHorizontal: SPACING.xl },
  backBtn: { marginBottom: SPACING.md },
  backText: { color: COLORS.green, fontSize: FONTS.sizes.md, fontWeight: '600' },
  headerMain: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: 4 },
  teamColorDot: { width: 16, height: 16, borderRadius: 8 },
  headerTitle: { fontSize: FONTS.sizes.xxl, fontWeight: '800', color: COLORS.textPrimary },
  headerSub: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  list: { padding: SPACING.xl, paddingBottom: 100 },
  playerCard: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md,
    flexDirection: 'row', alignItems: 'center',
    marginBottom: SPACING.sm, padding: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border,
  },
  jerseyBadge: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    marginRight: SPACING.md,
  },
  jerseyText: { color: '#FFF', fontWeight: '800', fontSize: FONTS.sizes.sm },
  playerInfo: { flex: 1 },
  playerName: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.textPrimary },
  playerMeta: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, marginTop: 2 },
  deleteBtn: { padding: SPACING.sm },
  deleteText: { color: COLORS.textMuted, fontSize: FONTS.sizes.md },
  empty: { alignItems: 'center', paddingTop: SPACING.xxxl },
  emptyIcon: { fontSize: 48, marginBottom: SPACING.md },
  emptyText: { fontSize: FONTS.sizes.lg, color: COLORS.textSecondary, fontWeight: '700' },
  emptySub: { fontSize: FONTS.sizes.sm, color: COLORS.textMuted, marginTop: 4, marginBottom: SPACING.xl },
  addPlayerBtn: { borderRadius: RADIUS.md, overflow: 'hidden', marginTop: SPACING.lg, borderWidth: 1, borderColor: COLORS.green + '40', borderStyle: 'dashed' },
  addPlayerGrad: { paddingVertical: SPACING.lg, alignItems: 'center' },
  addPlayerText: { color: COLORS.green, fontWeight: '700', fontSize: FONTS.sizes.md },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: COLORS.bgCard, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl,
    padding: SPACING.xxl, borderTopWidth: 1, borderColor: COLORS.border, maxHeight: '90%',
  },
  modalTitle: { fontSize: FONTS.sizes.xxl, fontWeight: '800', color: COLORS.textPrimary, marginBottom: SPACING.xl },
  fieldLabel: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, fontWeight: '600', marginBottom: 6 },
  input: {
    backgroundColor: COLORS.bgElevated, borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    fontSize: FONTS.sizes.md, color: COLORS.textPrimary,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.lg,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.lg },
  chip: {
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.bgElevated,
  },
  chipActive: { borderColor: COLORS.green, backgroundColor: COLORS.green + '22' },
  chipText: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs, fontWeight: '600' },
  chipTextActive: { color: COLORS.green },
  modalActions: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md },
  cancelBtn: {
    flex: 1, backgroundColor: COLORS.bgElevated,
    borderRadius: RADIUS.md, paddingVertical: 14, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  cancelText: { color: COLORS.textSecondary, fontWeight: '700' },
  saveBtn: { flex: 2, borderRadius: RADIUS.md, overflow: 'hidden' },
  saveBtnGrad: { paddingVertical: 14, alignItems: 'center' },
  saveBtnText: { color: COLORS.textOnGreen, fontWeight: '700', fontSize: FONTS.sizes.md },
});

import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput, Alert, ActivityIndicator, FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTournamentStore, Tournament } from '../../store/tournamentStore';
import { useTeamStore } from '../../store/teamStore';
import { COLORS, FONTS, SPACING, RADIUS } from '../../theme/theme';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Tournaments'>;

export default function TournamentsScreen({ navigation }: Props) {
  const { tournaments, fetchTournaments, createTournament, deleteTournament, loading } = useTournamentStore();
  const { teams, fetchTeams } = useTeamStore();
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [overs, setOvers] = useState('20');
  const [selectedTeams, setSelectedTeams] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchTournaments(); fetchTeams(); }, []);

  const toggleTeam = (id: string) => {
    const s = new Set(selectedTeams);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelectedTeams(s);
  };

  const handleCreate = async () => {
    if (!name.trim()) { Alert.alert('Error', 'Tournament name is required.'); return; }
    if (selectedTeams.size < 2) { Alert.alert('Error', 'Select at least 2 teams.'); return; }
    const ov = parseInt(overs);
    if (isNaN(ov) || ov <= 0) { Alert.alert('Error', 'Invalid overs.'); return; }
    setSaving(true);
    try {
      const t = await createTournament(name.trim(), ov, Array.from(selectedTeams));
      setName(''); setOvers('20'); setSelectedTeams(new Set()); setModalVisible(false);
      navigation.navigate('TournamentDetail', { tournamentId: t.id });
    } catch (e: any) { Alert.alert('Error', e.message); }
    setSaving(false);
  };

  const handleDelete = (t: Tournament) => {
    Alert.alert('Delete Tournament', `Delete "${t.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await deleteTournament(t.id); } catch (e: any) { Alert.alert('Error', e.message); }
      }},
    ]);
  };

  const renderTournament = ({ item }: { item: Tournament }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('TournamentDetail', { tournamentId: item.id })}
      activeOpacity={0.85}
    >
      <LinearGradient colors={['#FFD70015', '#D4AF3708']} style={styles.cardGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <View style={styles.cardTop}>
          <Text style={styles.trophyIcon}>🏆</Text>
          <View style={styles.cardInfo}>
            <Text style={styles.cardName}>{item.name}</Text>
            <Text style={styles.cardMeta}>{item.overs} Overs • {item.format}</Text>
          </View>
          <TouchableOpacity onPress={() => handleDelete(item)} style={styles.deleteBtn}>
            <Text style={styles.deleteText}>🗑️</Text>
          </TouchableOpacity>
        </View>
        <View style={[styles.statusChip, { backgroundColor: item.status === 'active' ? COLORS.green + '22' : COLORS.textMuted + '22' }]}>
          <Text style={[styles.statusText, { color: item.status === 'active' ? COLORS.green : COLORS.textMuted }]}>
            {item.status.toUpperCase()}
          </Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  return (
    <LinearGradient colors={['#050E1F', '#0D1B2E']} style={styles.container}>
      <LinearGradient colors={['#142338', '#0D1B2E']} style={styles.header}>
        <Text style={styles.headerTitle}>Tournaments</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
          <LinearGradient colors={['#FFD700', '#D4AF37']} style={styles.addBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Text style={styles.addBtnText}>+ New</Text>
          </LinearGradient>
        </TouchableOpacity>
      </LinearGradient>

      {loading ? (
        <ActivityIndicator color={COLORS.gold} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={tournaments}
          keyExtractor={(t) => t.id}
          renderItem={renderTournament}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🏆</Text>
              <Text style={styles.emptyText}>No tournaments yet</Text>
              <Text style={styles.emptySub}>Create your first tournament</Text>
            </View>
          }
        />
      )}

      {/* Create Tournament Modal */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>New Tournament</Text>

              <Text style={styles.fieldLabel}>Tournament Name *</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="e.g. Village Premier League"
                placeholderTextColor={COLORS.textMuted}
                autoFocus
              />

              <Text style={styles.fieldLabel}>Overs Per Match</Text>
              <TextInput
                style={styles.input}
                value={overs}
                onChangeText={setOvers}
                keyboardType="number-pad"
                placeholder="20"
                placeholderTextColor={COLORS.textMuted}
              />

              <Text style={styles.fieldLabel}>Select Teams ({selectedTeams.size} selected)</Text>
              {teams.length === 0 ? (
                <Text style={styles.noTeamsText}>No teams found. Create teams first.</Text>
              ) : (
                teams.map((t) => (
                  <TouchableOpacity
                    key={t.id}
                    style={[styles.teamOption, selectedTeams.has(t.id) && styles.teamOptionActive]}
                    onPress={() => toggleTeam(t.id)}
                  >
                    <View style={[styles.teamDot, { backgroundColor: t.team_color }]} />
                    <Text style={[styles.teamOptionText, selectedTeams.has(t.id) && styles.teamOptionTextActive]}>
                      {t.team_name}
                    </Text>
                    {selectedTeams.has(t.id) && <Text style={styles.checkIcon}>✓</Text>}
                  </TouchableOpacity>
                ))
              )}

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleCreate} disabled={saving}>
                  <LinearGradient colors={['#FFD700', '#D4AF37']} style={styles.saveBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                    {saving ? <ActivityIndicator color="#000" /> : <Text style={styles.saveBtnText}>Create Tournament</Text>}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 56, paddingBottom: SPACING.xl, paddingHorizontal: SPACING.xl, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { fontSize: FONTS.sizes.xxl, fontWeight: '800', color: COLORS.textPrimary },
  addBtn: { borderRadius: RADIUS.md, overflow: 'hidden' },
  addBtnGrad: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm },
  addBtnText: { color: '#000', fontWeight: '700', fontSize: FONTS.sizes.sm },
  list: { padding: SPACING.xl, paddingBottom: 100 },
  card: { borderRadius: RADIUS.xl, overflow: 'hidden', marginBottom: SPACING.md, borderWidth: 1, borderColor: COLORS.gold + '30' },
  cardGrad: { padding: SPACING.xl },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm, gap: SPACING.md },
  trophyIcon: { fontSize: 32 },
  cardInfo: { flex: 1 },
  cardName: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.textPrimary },
  cardMeta: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: 2 },
  deleteBtn: { padding: SPACING.sm },
  deleteText: { fontSize: 18 },
  statusChip: { alignSelf: 'flex-start', paddingHorizontal: SPACING.md, paddingVertical: 3, borderRadius: RADIUS.full },
  statusText: { fontSize: 11, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: SPACING.xxxl * 2 },
  emptyIcon: { fontSize: 52, marginBottom: SPACING.md },
  emptyText: { fontSize: FONTS.sizes.xl, color: COLORS.textSecondary, fontWeight: '700' },
  emptySub: { fontSize: FONTS.sizes.sm, color: COLORS.textMuted, marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: COLORS.bgCard, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: SPACING.xxl, borderTopWidth: 1, borderColor: COLORS.border, maxHeight: '90%' },
  modalTitle: { fontSize: FONTS.sizes.xxl, fontWeight: '800', color: COLORS.textPrimary, marginBottom: SPACING.xl },
  fieldLabel: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, fontWeight: '600', marginBottom: 6 },
  input: { backgroundColor: COLORS.bgElevated, borderRadius: RADIUS.md, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, fontSize: FONTS.sizes.md, color: COLORS.textPrimary, borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.lg },
  noTeamsText: { color: COLORS.textMuted, fontSize: FONTS.sizes.sm, marginBottom: SPACING.lg },
  teamOption: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, backgroundColor: COLORS.bgElevated, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.border },
  teamOptionActive: { borderColor: COLORS.gold, backgroundColor: COLORS.gold + '15' },
  teamDot: { width: 10, height: 10, borderRadius: 5 },
  teamOptionText: { flex: 1, fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, fontWeight: '600' },
  teamOptionTextActive: { color: COLORS.textPrimary },
  checkIcon: { color: COLORS.gold, fontWeight: '900' },
  modalActions: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.lg },
  cancelBtn: { flex: 1, backgroundColor: COLORS.bgElevated, borderRadius: RADIUS.md, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  cancelText: { color: COLORS.textSecondary, fontWeight: '700' },
  saveBtn: { flex: 2, borderRadius: RADIUS.md, overflow: 'hidden' },
  saveBtnGrad: { paddingVertical: 14, alignItems: 'center' },
  saveBtnText: { color: '#000', fontWeight: '700', fontSize: FONTS.sizes.md },
});

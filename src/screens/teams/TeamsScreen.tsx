import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTeamStore, Team } from '../../store/teamStore';
import { COLORS, FONTS, SPACING, RADIUS } from '../../theme/theme';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Teams'>;

const TEAM_COLORS = ['#00D26A','#2979FF','#FFD700','#FF4B4B','#FF9800','#E040FB','#00BCD4','#FF7043'];

export default function TeamsScreen({ navigation }: Props) {
  const { teams, fetchTeams, addTeam, deleteTeam, loading } = useTeamStore();
  const [modalVisible, setModalVisible] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [selectedColor, setSelectedColor] = useState(TEAM_COLORS[0]);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchTeams(); }, []);

  const handleAdd = async () => {
    if (!teamName.trim()) { Alert.alert('Error', 'Team name is required.'); return; }
    setSaving(true);
    try {
      await addTeam(teamName.trim(), selectedColor);
      setTeamName(''); setSelectedColor(TEAM_COLORS[0]); setModalVisible(false);
    } catch (e: any) { Alert.alert('Error', e.message); }
    setSaving(false);
  };

  const handleDelete = (team: Team) => {
    Alert.alert('Delete Team', `Delete "${team.team_name}"? This will also remove all its players.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await deleteTeam(team.id); } catch (e: any) { Alert.alert('Error', e.message); }
      }},
    ]);
  };

  const renderTeam = ({ item }: { item: Team }) => (
    <TouchableOpacity
      style={styles.teamCard}
      onPress={() => navigation.navigate('TeamDetail', { team: item })}
      activeOpacity={0.85}
    >
      <View style={[styles.colorBar, { backgroundColor: item.team_color }]} />
      <View style={styles.teamInfo}>
        <Text style={styles.teamName}>{item.team_name}</Text>
        <Text style={styles.teamSub}>Tap to manage players</Text>
      </View>
      <TouchableOpacity onPress={() => handleDelete(item)} style={styles.deleteBtn}>
        <Text style={styles.deleteText}>🗑️</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <LinearGradient colors={['#050E1F', '#0D1B2E']} style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#142338', '#0D1B2E']} style={styles.header}>
        <Text style={styles.headerTitle}>Teams</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
          <LinearGradient colors={['#00D26A', '#00A855']} style={styles.addBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Text style={styles.addBtnText}>+ Add Team</Text>
          </LinearGradient>
        </TouchableOpacity>
      </LinearGradient>

      {loading ? (
        <ActivityIndicator color={COLORS.green} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={teams}
          keyExtractor={(t) => t.id}
          renderItem={renderTeam}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>👥</Text>
              <Text style={styles.emptyText}>No teams yet</Text>
              <Text style={styles.emptySub}>Add your first team to get started</Text>
            </View>
          }
        />
      )}

      {/* Add Team Modal */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>New Team</Text>

            <Text style={styles.fieldLabel}>Team Name</Text>
            <TextInput
              style={styles.input}
              value={teamName}
              onChangeText={setTeamName}
              placeholder="e.g. Mumbai Warriors"
              placeholderTextColor={COLORS.textMuted}
              autoFocus
            />

            <Text style={styles.fieldLabel}>Team Color</Text>
            <View style={styles.colorRow}>
              {TEAM_COLORS.map((c) => (
                <TouchableOpacity key={c} onPress={() => setSelectedColor(c)}
                  style={[styles.colorDot, { backgroundColor: c }, selectedColor === c && styles.colorDotSelected]}
                />
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleAdd} disabled={saving}>
                <LinearGradient colors={['#00D26A', '#00A855']} style={styles.saveBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Create Team'}</Text>
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
  header: { paddingTop: 56, paddingBottom: SPACING.xl, paddingHorizontal: SPACING.xl, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { fontSize: FONTS.sizes.xxl, fontWeight: '800', color: COLORS.textPrimary },
  addBtn: { borderRadius: RADIUS.md, overflow: 'hidden' },
  addBtnGrad: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm },
  addBtnText: { color: COLORS.textOnGreen, fontWeight: '700', fontSize: FONTS.sizes.sm },
  list: { padding: SPACING.xl, paddingBottom: 100 },
  teamCard: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg,
    flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md,
    overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border,
  },
  colorBar: { width: 6, alignSelf: 'stretch' },
  teamInfo: { flex: 1, padding: SPACING.lg },
  teamName: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.textPrimary },
  teamSub: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, marginTop: 2 },
  deleteBtn: { padding: SPACING.lg },
  deleteText: { fontSize: 18 },
  empty: { alignItems: 'center', paddingTop: SPACING.xxxl * 2 },
  emptyIcon: { fontSize: 52, marginBottom: SPACING.md },
  emptyText: { fontSize: FONTS.sizes.xl, color: COLORS.textSecondary, fontWeight: '700' },
  emptySub: { fontSize: FONTS.sizes.sm, color: COLORS.textMuted, marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: COLORS.bgCard, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl,
    padding: SPACING.xxl, borderTopWidth: 1, borderColor: COLORS.border,
  },
  modalTitle: { fontSize: FONTS.sizes.xxl, fontWeight: '800', color: COLORS.textPrimary, marginBottom: SPACING.xl },
  fieldLabel: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, fontWeight: '600', marginBottom: 6 },
  input: {
    backgroundColor: COLORS.bgElevated, borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    fontSize: FONTS.sizes.md, color: COLORS.textPrimary,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.lg,
  },
  colorRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.xl },
  colorDot: { width: 32, height: 32, borderRadius: 16 },
  colorDotSelected: { borderWidth: 3, borderColor: COLORS.textPrimary },
  modalActions: { flexDirection: 'row', gap: SPACING.sm },
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

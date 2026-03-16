import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Modal, Alert, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useMatchStore, BatStats, BowlStats } from '../../store/matchStore';
import { useTeamStore } from '../../store/teamStore';
import { COLORS, FONTS, SPACING, RADIUS } from '../../theme/theme';
import { formatOvers, getRunRate, getRequiredRunRate } from '../../utils/scoringEngine';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';

type Props = NativeStackScreenProps<RootStackParamList, 'LiveScore'>;

const { width } = Dimensions.get('window');

// ─────────────── Sub-components ───────────────

type Inn2Props = { visible: boolean; onClose: () => void; match: any };
const Inn2SetupModal = ({ visible, onClose, match }: Inn2Props) => {
  const { setupSecondInnings } = useMatchStore();
  const { fetchPlayers } = useTeamStore();
  const [players, setPlayers] = useState<any[]>([]);
  const [step, setStep] = useState(1);
  const [battingTeamId] = useState(match.toss_choice === 'bat' ? match.team_b : match.team_a);
  const [bowlingTeamId] = useState(match.toss_choice === 'bat' ? match.team_a : match.team_b);
  const [selectedBatters, setSelectedBatters] = useState<string[]>([]);
  const [openingBowler, setOpeningBowler] = useState('');

  React.useEffect(() => {
    if (visible) {
      loadPlayers();
    }
  }, [visible]);

  const loadPlayers = async () => {
    const batPlayers = await fetchPlayers(battingTeamId);
    const bowlPlayers = await fetchPlayers(bowlingTeamId);
    setPlayers([...batPlayers, ...bowlPlayers]);
  };

  const handleStart = () => {
    if (selectedBatters.length < 2 || !openingBowler) {
      Alert.alert('Error', 'Select 2 openers and 1 bowler.');
      return;
    }
    const names: Record<string, string> = {};
    players.forEach(p => names[p.id] = p.player_name);
    
    setupSecondInnings({
      batters: selectedBatters,
      bowlers: [openingBowler],
      names,
    });
    onClose();
  };

  const battingPlayers = players.filter(p => p.team_id === battingTeamId);
  const bowlingPlayers = players.filter(p => p.team_id === bowlingTeamId);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Setup 2nd Innings</Text>
          {step === 1 ? (
            <>
              <Text style={styles.fieldLabel}>Select Opening Batsmen (2)</Text>
              {battingPlayers.map(p => (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.playerOption, selectedBatters.includes(p.id) && styles.playerOptionActive]}
                  onPress={() => {
                    if (selectedBatters.includes(p.id)) {
                      setSelectedBatters(selectedBatters.filter(id => id !== p.id));
                    } else if (selectedBatters.length < 2) {
                      setSelectedBatters([...selectedBatters, p.id]);
                    }
                  }}
                >
                  <Text style={styles.playerOptionText}>{p.player_name}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.saveBtn} onPress={() => setStep(2)}>
                 <LinearGradient colors={['#00D26A', '#00A855']} style={styles.saveBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                    <Text style={styles.saveBtnText}>Next</Text>
                 </LinearGradient>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.fieldLabel}>Select Opening Bowler</Text>
              {bowlingPlayers.map(p => (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.playerOption, openingBowler === p.id && styles.playerOptionActive]}
                  onPress={() => setOpeningBowler(p.id)}
                >
                  <Text style={styles.playerOptionText}>{p.player_name}</Text>
                </TouchableOpacity>
              ))}
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setStep(1)}>
                  <Text style={styles.cancelText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleStart}>
                  <LinearGradient colors={['#00D26A', '#00A855']} style={styles.saveBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                    <Text style={styles.saveBtnText}>Start Innings 2</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const BallChip = ({ label }: { label: string }) => {
  const isWicket = label === 'W';
  const isBoundary = label === '4' || label === '6';
  const isExtra = label.startsWith('Wd') || label.startsWith('Nb') || label.startsWith('B') || label.startsWith('Lb');
  const bg = isWicket ? COLORS.red : isBoundary ? COLORS.green : isExtra ? COLORS.orange : COLORS.bgElevated;
  const textColor = isWicket || isBoundary ? '#000' : COLORS.textPrimary;
  return (
    <View style={[styles.ballChip, { backgroundColor: bg }]}>
      <Text style={[styles.ballChipText, { color: textColor }]}>{label}</Text>
    </View>
  );
};

// ─────────────── Main Screen ───────────────

export default function LiveScoreScreen({ navigation, route }: Props) {
  const { liveMatch, recordBall, undoLastBall, selectNewBatsman, switchBowler } = useMatchStore();
  const [extraType, setExtraType] = useState<'wide' | 'no_ball' | 'bye' | 'leg_bye' | null>(null);
  const [extraRuns, setExtraRuns] = useState(1);
  const [showExtraPanel, setShowExtraPanel] = useState(false);
  const [showWicketPanel, setShowWicketPanel] = useState(false);
  const [showBatsmanModal, setShowBatsmanModal] = useState(false);
  const [showBowlerModal, setShowBowlerModal] = useState(false);
  const [pendingWicket, setPendingWicket] = useState(false);

  if (!liveMatch) {
    return (
      <LinearGradient colors={['#050E1F', '#0D1B2E']} style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.noMatchText}>No active match</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.goBackBtn}>
            <Text style={styles.goBackText}>← Go Back</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  const { innings, batStats, bowlStats, maxOvers, inningsNumber, inning1Score, battingTeamId, bowlingTeamId, match, recentBalls } = liveMatch;
  const striker = Object.values(batStats).find((b) => b.isStriker);
  const nonStriker = Object.values(batStats).find((b) => !b.isStriker && !b.isOut);
  const bowler = Object.values(bowlStats).find((b) => b.isBowling);
  const remainingBalls = maxOvers * 6 - innings.legalBalls;
  const rr = getRunRate(innings.runs, innings.legalBalls);
  const rrr = innings.target ? getRequiredRunRate(innings.target, innings.runs, remainingBalls) : null;
  const battingTeamName = battingTeamId === match.team_a ? match.team_a_name : match.team_b_name;

  const handleRunBall = useCallback(async (runs: number) => {
    if (!striker || !bowler) { Alert.alert('Missing Info', 'Select batsmen and bowler first.'); return; }
    if (innings.isComplete) return;

    await recordBall({
      runsOffBat: runs,
      extraType: null, extraRuns: 0,
      isWicket: false,
      batsmanId: striker.playerId,
      bowlerId: bowler.playerId,
    });
  }, [striker, bowler, innings.isComplete, recordBall]);

  const handleExtra = useCallback(async (type: 'wide' | 'no_ball' | 'bye' | 'leg_bye', runs: number) => {
    if (!striker || !bowler) return;
    await recordBall({
      runsOffBat: type === 'bye' || type === 'leg_bye' ? 0 : 0,
      extraType: type,
      extraRuns: runs,
      isWicket: false,
      batsmanId: striker.playerId,
      bowlerId: bowler.playerId,
    });
    setShowExtraPanel(false); setExtraType(null); setExtraRuns(1);
  }, [striker, bowler, recordBall]);

  const handleWicket = useCallback(async (wicketType: string) => {
    if (!striker || !bowler) return;
    await recordBall({
      runsOffBat: 0,
      extraType: null, extraRuns: 0,
      isWicket: true,
      wicketType: wicketType as any,
      batsmanId: striker.playerId,
      bowlerId: bowler.playerId,
      dismissedBatsmanId: striker.playerId,
    });
    setShowWicketPanel(false);
    if (!innings.isComplete) setShowBatsmanModal(true);
  }, [striker, bowler, innings.isComplete, recordBall]);

  const availableBatsmen = Object.values(batStats).filter((b) => !b.isStriker && !b.isOut && b.playerId !== nonStriker?.playerId);
  const inactiveBowlers = Object.values(bowlStats).filter((b) => !b.isBowling);

  const [showInn2Modal, setShowInn2Modal] = useState(false);

  // Innings complete / match complete
  if (innings.isComplete && inningsNumber === 2) {
    return (
      <LinearGradient colors={['#050E1F', '#0D1B2E']} style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.matchCompleteEmoji}>🏆</Text>
          <Text style={styles.matchCompleteTitle}>Match Complete!</Text>
          <Text style={styles.matchCompleteResult}>{match.result_text ?? 'Match finished'}</Text>
          <TouchableOpacity
            style={styles.scorecardBtn}
            onPress={() => navigation.replace('Scorecard', { matchId: match.id })}
          >
            <LinearGradient colors={['#00D26A', '#00A855']} style={styles.scorecardBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Text style={styles.scorecardBtnText}>View Scorecard</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  // Innings 1 complete, waiting to start innings 2
  if (innings.isComplete && inningsNumber === 1) {
    return (
      <LinearGradient colors={['#050E1F', '#0D1B2E']} style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.matchCompleteEmoji}>🌓</Text>
          <Text style={styles.matchCompleteTitle}>Innings Break</Text>
          <Text style={styles.matchCompleteResult}>
            {match.team_a_name} scored {innings.runs}/{innings.wickets} in {formatOvers(innings.legalBalls)} overs.{"\n"}
            Target: {innings.runs + 1}
          </Text>
          <TouchableOpacity
            style={styles.scorecardBtn}
            onPress={() => setShowInn2Modal(true)}
          >
            <LinearGradient colors={['#00D26A', '#00A855']} style={styles.scorecardBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Text style={styles.scorecardBtnText}>Setup 2nd Innings</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
        <Inn2SetupModal visible={showInn2Modal} onClose={() => setShowInn2Modal(false)} match={match} />
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#050E1F', '#0D1B2E']} style={styles.container}>

      {/* ─── Scoreboard Header ─── */}
      <LinearGradient colors={['#0A1628', '#142338']} style={styles.scoreboard}>
        {/* Innings info */}
        <View style={styles.inningsInfo}>
          <Text style={styles.inningsLabel}>{inningsNumber === 2 ? '2nd Innings' : '1st Innings'} • {battingTeamName}</Text>
          {inning1Score && (
            <Text style={styles.targetInfo}>
              Target: {(inning1Score.runs + 1)} | {match.team_a_name} scored {inning1Score.runs}/{inning1Score.wickets} in {inning1Score.overs} ov
            </Text>
          )}
        </View>

        {/* Main score */}
        <View style={styles.scoreRow}>
          <Text style={styles.scoreMain}>{innings.runs}/{innings.wickets}</Text>
          <View style={styles.scoreRight}>
            <Text style={styles.oversText}>{formatOvers(innings.legalBalls)} / {maxOvers}</Text>
            <Text style={styles.rrText}>RR {rr}</Text>
            {rrr && <Text style={styles.rrrText}>RRR {rrr}</Text>}
          </View>
        </View>

        {/* Recent balls */}
        <View style={styles.recentRow}>
          <Text style={styles.recentLabel}>This over: </Text>
          {recentBalls.map((b, i) => <BallChip key={i} label={b} />)}
          {recentBalls.length === 0 && <Text style={styles.noBalls}>— — — — — —</Text>}
        </View>

        {/* Batsmen */}
        <View style={styles.batsmenRow}>
          <View style={styles.batsmanBox}>
            <Text style={styles.batsmanName}>
              {striker?.playerName ?? '?'} ⚡
            </Text>
            <Text style={styles.batsmanStats}>
              {striker?.runs ?? 0} ({striker?.balls ?? 0}b) {striker?.fours ?? 0}×4 {striker?.sixes ?? 0}×6
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.batsmanBox}>
            <Text style={styles.batsmanName}>{nonStriker?.playerName ?? '?'}</Text>
            <Text style={styles.batsmanStats}>
              {nonStriker?.runs ?? 0} ({nonStriker?.balls ?? 0}b)
            </Text>
          </View>
        </View>

        {/* Bowler */}
        <TouchableOpacity style={styles.bowlerRow} onPress={() => setShowBowlerModal(true)}>
          <Text style={styles.bowlerLabel}>Bowling: </Text>
          <Text style={styles.bowlerName}>{bowler?.playerName ?? '?'}</Text>
          <Text style={styles.bowlerStats}>
            {bowler ? `${formatOvers(bowler.legalBalls)}-0-${bowler.runs}-${bowler.wickets}` : '—'}
          </Text>
          <Text style={styles.changeBowlerBtn}>⇄</Text>
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView style={styles.buttonsScroll} contentContainerStyle={styles.buttonsContainer} showsVerticalScrollIndicator={false}>

        {/* ─── Run Buttons ─── */}
        <View style={styles.runRow}>
          {[0, 1, 2, 3].map((r) => (
            <TouchableOpacity key={r} style={styles.runBtn} onPress={() => handleRunBall(r)} activeOpacity={0.75}>
              <Text style={styles.runBtnText}>{r}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.runRowSpecial}>
          <TouchableOpacity style={[styles.runBtn, styles.fourBtn]} onPress={() => handleRunBall(4)} activeOpacity={0.75}>
            <Text style={styles.fourBtnText}>4</Text>
            <Text style={styles.boundaryLabel}>FOUR</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.runBtn, styles.sixBtn]} onPress={() => handleRunBall(6)} activeOpacity={0.75}>
            <Text style={styles.sixBtnText}>6</Text>
            <Text style={styles.boundaryLabel}>SIX</Text>
          </TouchableOpacity>
        </View>

        {/* ─── Special Buttons ─── */}
        <View style={styles.specialRow}>
          <TouchableOpacity
            style={[styles.specialBtn, styles.wicketBtn]}
            onPress={() => setShowWicketPanel(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.specialBtnText}>🔴 WICKET</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.specialBtn, styles.extraBtn]}
            onPress={() => setShowExtraPanel(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.specialBtnText}>➕ EXTRA</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.undoBtn}
          onPress={async () => {
            Alert.alert('Undo Last Ball', 'Remove the last delivery?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Undo', style: 'destructive', onPress: () => undoLastBall() },
            ]);
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.undoBtnText}>↩ UNDO LAST BALL</Text>
        </TouchableOpacity>

        {/* Scorecard link */}
        <TouchableOpacity
          style={styles.viewScorecard}
          onPress={() => navigation.navigate('Scorecard', { matchId: match.id })}
        >
          <Text style={styles.viewScorecardText}>📊 View Full Scorecard</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* ─── Extra Panel Modal ─── */}
      <Modal visible={showExtraPanel} transparent animationType="slide" onRequestClose={() => setShowExtraPanel(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Record Extra</Text>
            <View style={styles.extraTypeRow}>
              {(['wide', 'no_ball', 'bye', 'leg_bye'] as const).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.extraTypeBtn, extraType === t && styles.extraTypeBtnActive]}
                  onPress={() => setExtraType(t)}
                >
                  <Text style={[styles.extraTypeBtnText, extraType === t && styles.extraTypeBtnTextActive]}>
                    {t === 'wide' ? 'Wide' : t === 'no_ball' ? 'No Ball' : t === 'bye' ? 'Bye' : 'Leg Bye'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.fieldLabel}>Runs</Text>
            <View style={styles.runsRow}>
              {[1, 2, 3, 4, 5].map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[styles.runChip, extraRuns === r && styles.runChipActive]}
                  onPress={() => setExtraRuns(r)}
                >
                  <Text style={[styles.runChipText, extraRuns === r && styles.runChipTextActive]}>{r}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowExtraPanel(false); setExtraType(null); }}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, !extraType && { opacity: 0.5 }]}
                onPress={() => extraType && handleExtra(extraType, extraRuns)}
                disabled={!extraType}
              >
                <LinearGradient colors={['#00D26A', '#00A855']} style={styles.saveBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  <Text style={styles.saveBtnText}>Record Extra</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── Wicket Panel Modal ─── */}
      <Modal visible={showWicketPanel} transparent animationType="slide" onRequestClose={() => setShowWicketPanel(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>How Out?</Text>
            <View style={styles.wicketGrid}>
              {(['bowled', 'caught', 'lbw', 'run_out', 'stumped', 'hit_wicket'] as const).map((wt) => (
                <TouchableOpacity
                  key={wt}
                  style={styles.wicketOption}
                  onPress={() => handleWicket(wt)}
                >
                  <LinearGradient colors={['#FF4B4B22', '#CC000011']} style={styles.wicketOptionGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                    <Text style={styles.wicketOptionText}>{wt.replace('_', ' ').toUpperCase()}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowWicketPanel(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─── New Batsman Modal ─── */}
      <Modal visible={showBatsmanModal} transparent animationType="slide" onRequestClose={() => {}}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Select New Batsman</Text>
            {availableBatsmen.length === 0 ? (
              <Text style={styles.allOutText}>All batsmen are out!</Text>
            ) : (
              availableBatsmen.map((b) => (
                <TouchableOpacity
                  key={b.playerId}
                  style={styles.playerOption}
                  onPress={() => { selectNewBatsman(b.playerId, b.playerName); setShowBatsmanModal(false); }}
                >
                  <Text style={styles.playerOptionText}>{b.playerName}</Text>
                </TouchableOpacity>
              ))
            )}
            {availableBatsmen.length === 0 && (
              <TouchableOpacity style={styles.saveBtn} onPress={() => setShowBatsmanModal(false)}>
                <LinearGradient colors={['#FF4B4B', '#CC0000']} style={styles.saveBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  <Text style={styles.saveBtnText}>Innings Over</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      {/* ─── Change Bowler Modal ─── */}
      <Modal visible={showBowlerModal} transparent animationType="slide" onRequestClose={() => setShowBowlerModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Select Bowler</Text>
            {Object.values(bowlStats).map((b) => (
              <TouchableOpacity
                key={b.playerId}
                style={[styles.playerOption, b.isBowling && styles.playerOptionActive]}
                onPress={() => { switchBowler(b.playerId); setShowBowlerModal(false); }}
              >
                <Text style={[styles.playerOptionText, b.isBowling && { color: COLORS.green }]}>
                  {b.playerName} {b.isBowling ? '✓' : ''}
                </Text>
                <Text style={styles.bowlerOptStats}>{formatOvers(b.legalBalls)}-{b.runs}-{b.wickets}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowBowlerModal(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </LinearGradient>
  );
}

const btnSize = (width - SPACING.xl * 2 - SPACING.sm * 3) / 4;

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl },
  noMatchText: { fontSize: FONTS.sizes.xl, color: COLORS.textSecondary, marginBottom: SPACING.xl },
  goBackBtn: { padding: SPACING.md },
  goBackText: { color: COLORS.green, fontWeight: '700', fontSize: FONTS.sizes.md },
  matchCompleteEmoji: { fontSize: 64, marginBottom: SPACING.lg },
  matchCompleteTitle: { fontSize: FONTS.sizes.xxxl, fontWeight: '900', color: COLORS.gold, marginBottom: SPACING.md },
  matchCompleteResult: { fontSize: FONTS.sizes.lg, color: COLORS.textSecondary, marginBottom: SPACING.xxl, textAlign: 'center' },
  scorecardBtn: { borderRadius: RADIUS.lg, overflow: 'hidden' },
  scorecardBtnGrad: { paddingVertical: 16, paddingHorizontal: SPACING.xxxl, alignItems: 'center' },
  scorecardBtnText: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.textOnGreen },

  // Scoreboard
  scoreboard: { paddingTop: 52, paddingBottom: SPACING.md, paddingHorizontal: SPACING.xl },
  inningsInfo: { marginBottom: SPACING.xs },
  inningsLabel: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, fontWeight: '700', textTransform: 'uppercase' },
  targetInfo: { fontSize: FONTS.sizes.xs, color: COLORS.gold, marginTop: 2 },
  scoreRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: SPACING.sm },
  scoreMain: { fontSize: 56, fontWeight: '900', color: COLORS.textPrimary, lineHeight: 64 },
  scoreRight: { alignItems: 'flex-end' },
  oversText: { fontSize: FONTS.sizes.lg, color: COLORS.textSecondary, fontWeight: '600' },
  rrText: { fontSize: FONTS.sizes.md, color: COLORS.green, fontWeight: '700' },
  rrrText: { fontSize: FONTS.sizes.sm, color: COLORS.orange, fontWeight: '700' },
  recentRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm, gap: SPACING.xs },
  recentLabel: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, fontWeight: '600' },
  noBalls: { fontSize: FONTS.sizes.sm, color: COLORS.textMuted, letterSpacing: 4 },
  ballChip: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  ballChipText: { fontSize: 11, fontWeight: '800' },
  batsmenRow: { flexDirection: 'row', marginBottom: SPACING.sm },
  batsmanBox: { flex: 1 },
  divider: { width: 1, backgroundColor: COLORS.border, marginHorizontal: SPACING.md },
  batsmanName: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.textPrimary },
  batsmanStats: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary },
  bowlerRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.bgModal, borderRadius: RADIUS.sm,
    padding: SPACING.sm, gap: SPACING.sm,
  },
  bowlerLabel: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted },
  bowlerName: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.textPrimary, flex: 1 },
  bowlerStats: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary },
  changeBowlerBtn: { fontSize: FONTS.sizes.lg, color: COLORS.textMuted },

  // Buttons area
  buttonsScroll: { flex: 1 },
  buttonsContainer: { padding: SPACING.xl, paddingBottom: 100, gap: SPACING.sm },
  runRow: { flexDirection: 'row', gap: SPACING.sm },
  runBtn: {
    width: btnSize, height: btnSize,
    backgroundColor: COLORS.btnNormal,
    borderRadius: RADIUS.md,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  runBtnText: { fontSize: FONTS.sizes.xxxl, fontWeight: '900', color: COLORS.textPrimary },
  runRowSpecial: { flexDirection: 'row', gap: SPACING.sm },
  fourBtn: {
    flex: 1, height: 70, backgroundColor: COLORS.btnBoundary,
    borderColor: COLORS.green + '40', width: undefined,
  },
  sixBtn: {
    flex: 1, height: 70, backgroundColor: COLORS.btnSix,
    borderColor: COLORS.green + '60', width: undefined,
  },
  fourBtnText: { fontSize: FONTS.sizes.xxxl, fontWeight: '900', color: COLORS.green },
  sixBtnText: { fontSize: FONTS.sizes.xxxl, fontWeight: '900', color: COLORS.green },
  boundaryLabel: { fontSize: 10, color: COLORS.green + 'AA', fontWeight: '700', letterSpacing: 1 },
  specialRow: { flexDirection: 'row', gap: SPACING.sm },
  specialBtn: {
    flex: 1, paddingVertical: 18, borderRadius: RADIUS.md,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  wicketBtn: { backgroundColor: COLORS.btnWicket, borderColor: COLORS.red + '40' },
  extraBtn: { backgroundColor: COLORS.btnExtra, borderColor: COLORS.orange + '40' },
  specialBtnText: { fontSize: FONTS.sizes.md, fontWeight: '800', color: COLORS.textPrimary },
  undoBtn: {
    paddingVertical: 14, borderRadius: RADIUS.md,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.btnUndo, borderWidth: 1, borderColor: COLORS.border,
  },
  undoBtnText: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.textSecondary },
  viewScorecard: { alignItems: 'center', paddingVertical: SPACING.md },
  viewScorecardText: { color: COLORS.textMuted, fontSize: FONTS.sizes.sm },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: COLORS.bgCard, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl,
    padding: SPACING.xxl, borderTopWidth: 1, borderColor: COLORS.border,
  },
  modalTitle: { fontSize: FONTS.sizes.xxl, fontWeight: '800', color: COLORS.textPrimary, marginBottom: SPACING.xl },
  extraTypeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.lg },
  extraTypeBtn: {
    flex: 1, paddingVertical: SPACING.md, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.bgElevated,
    alignItems: 'center',
  },
  extraTypeBtnActive: { borderColor: COLORS.orange, backgroundColor: COLORS.orange + '22' },
  extraTypeBtnText: { color: COLORS.textSecondary, fontWeight: '700', fontSize: FONTS.sizes.sm },
  extraTypeBtnTextActive: { color: COLORS.orange },
  fieldLabel: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, fontWeight: '600', marginBottom: 6 },
  runsRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.xl },
  runChip: {
    flex: 1, paddingVertical: SPACING.md, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.bgElevated, alignItems: 'center',
  },
  runChipActive: { borderColor: COLORS.green, backgroundColor: COLORS.green + '22' },
  runChipText: { color: COLORS.textSecondary, fontWeight: '800', fontSize: FONTS.sizes.md },
  runChipTextActive: { color: COLORS.green },
  modalActions: { flexDirection: 'row', gap: SPACING.sm },
  cancelBtn: {
    flex: 1, backgroundColor: COLORS.bgElevated, borderRadius: RADIUS.md,
    paddingVertical: 14, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  cancelText: { color: COLORS.textSecondary, fontWeight: '700' },
  saveBtn: { flex: 2, borderRadius: RADIUS.md, overflow: 'hidden' },
  saveBtnGrad: { paddingVertical: 14, alignItems: 'center' },
  saveBtnText: { color: COLORS.textOnGreen, fontWeight: '700', fontSize: FONTS.sizes.md },
  wicketGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.lg },
  wicketOption: { width: '47%', borderRadius: RADIUS.md, overflow: 'hidden' },
  wicketOptionGrad: { paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: COLORS.red + '30' },
  wicketOptionText: { color: COLORS.red, fontWeight: '800', fontSize: FONTS.sizes.sm },
  allOutText: { color: COLORS.red, textAlign: 'center', fontSize: FONTS.sizes.lg, marginBottom: SPACING.xl },
  playerOption: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.bgElevated, borderRadius: RADIUS.md,
    padding: SPACING.lg, marginBottom: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.border,
  },
  playerOptionActive: { borderColor: COLORS.green, backgroundColor: COLORS.green + '15' },
  playerOptionText: { fontSize: FONTS.sizes.md, fontWeight: '600', color: COLORS.textPrimary },
  bowlerOptStats: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted },
});

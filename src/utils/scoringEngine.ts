// =====================================================
// SCORING ENGINE
// Core cricket scoring logic
// =====================================================

export type ExtraType = 'wide' | 'no_ball' | 'bye' | 'leg_bye' | null;
export type WicketType = 'bowled' | 'caught' | 'lbw' | 'run_out' | 'stumped' | 'hit_wicket' | 'obstructing_field';

export interface BallInput {
  runsOffBat: number;
  extraType: ExtraType;
  extraRuns: number;
  isWicket: boolean;
  wicketType?: WicketType;
  batsmanId: string;
  bowlerId: string;
  fielderId?: string;
  dismissedBatsmanId?: string;
}

export interface InningsState {
  runs: number;
  wickets: number;
  legalBalls: number;       // counts towards overs (no wide/no-ball)
  totalDeliveries: number;  // every delivery
  overNumber: number;       // 0-indexed
  ballInOver: number;       // legal balls in current over (0-5)
  displayBall: number;      // all deliveries in current over
  extras: { wides: number; noBalls: number; byes: number; legByes: number; total: number };
  strikerId: string;
  nonStrikerId: string;
  bowlerId: string;
  isComplete: boolean;
  target?: number;
}

export interface ProcessedBall {
  updatedInnings: InningsState;
  runsScored: number;       // total runs added this delivery
  isLegalDelivery: boolean;
  overComplete: boolean;
  inningsComplete: boolean;
  strikeChanged: boolean;
  ballRecord: {
    over_number: number;
    ball_number: number;
    display_ball: number;
    runs_off_bat: number;
    extra_runs: number;
    extra_type: ExtraType;
    is_wicket: boolean;
    wicket_type?: WicketType;
    total_runs: number;
  };
}

/**
 * Determines if this delivery is a legal delivery (counts towards over)
 */
export function isLegalDelivery(extraType: ExtraType): boolean {
  return extraType !== 'wide' && extraType !== 'no_ball';
}

/**
 * Determines if runs count as batsman runs (affect SR)
 */
export function countsAsBatRun(extraType: ExtraType): boolean {
  return extraType === null || extraType === 'no_ball';
}

/**
 * Core function: process one delivery and return updated innings state
 */
export function processDelivery(innings: InningsState, ball: BallInput): ProcessedBall {
  const legal = isLegalDelivery(ball.extraType);
  const totalRunsThisBall = ball.runsOffBat + ball.extraRuns;

  // Update extra counters
  const extras = { ...innings.extras };
  if (ball.extraType === 'wide') extras.wides += totalRunsThisBall;
  else if (ball.extraType === 'no_ball') extras.noBalls += ball.extraRuns;
  else if (ball.extraType === 'bye') extras.byes += ball.extraRuns;
  else if (ball.extraType === 'leg_bye') extras.legByes += ball.extraRuns;
  extras.total = extras.wides + extras.noBalls + extras.byes + extras.legByes;

  // Ball numbering
  const newDisplayBall = innings.displayBall + 1;
  const newLegalBalls = innings.legalBalls + (legal ? 1 : 0);
  const newBallInOver = innings.ballInOver + (legal ? 1 : 0);
  const overComplete = legal && newBallInOver >= 6;

  // Runs
  const newRuns = innings.runs + totalRunsThisBall;
  const newWickets = innings.wickets + (ball.isWicket ? 1 : 0);

  // Strike rotation for batsman runs (odd runs on legal delivery)
  let strikeChanged = false;
  let strikerId = innings.strikerId;
  let nonStrikerId = innings.nonStrikerId;

  if (ball.extraType !== 'wide') {
    // Batsman faced the ball — check odd runs for strike rotation
    const runsForStrike = ball.runsOffBat;
    if (runsForStrike % 2 !== 0) {
      [strikerId, nonStrikerId] = [nonStrikerId, strikerId];
      strikeChanged = true;
    }
  }

  // Wicket: striker is dismissed (default), handle run-out separately
  if (ball.isWicket && ball.wicketType !== 'run_out') {
    // New batsman will be set by UI — mark striker as dismissed
    // Keep striker position empty until new batsman is selected
  }

  // Over complete: rotate strike at end of over (cancel previous ball-level rotation)
  if (overComplete) {
    [strikerId, nonStrikerId] = [nonStrikerId, strikerId];
    strikeChanged = !strikeChanged;
  }

  // Innings complete conditions
  const maxOvers = innings.target !== undefined ? Infinity : 0; // handled by caller
  const allOut = newWickets >= 10;
  const maxLegalBalls = innings.target !== undefined ? Infinity : 0; // caller handles overs
  const targetChased = innings.target !== undefined && newRuns >= innings.target;
  const inningsComplete = allOut || targetChased;

  const updatedInnings: InningsState = {
    ...innings,
    runs: newRuns,
    wickets: newWickets,
    legalBalls: newLegalBalls,
    totalDeliveries: innings.totalDeliveries + 1,
    overNumber: overComplete ? innings.overNumber + 1 : innings.overNumber,
    ballInOver: overComplete ? 0 : newBallInOver,
    displayBall: overComplete ? 0 : newDisplayBall,
    extras,
    strikerId,
    nonStrikerId,
    isComplete: inningsComplete,
  };

  return {
    updatedInnings,
    runsScored: totalRunsThisBall,
    isLegalDelivery: legal,
    overComplete,
    inningsComplete,
    strikeChanged,
    ballRecord: {
      over_number: innings.overNumber,
      ball_number: legal ? newBallInOver : innings.ballInOver,
      display_ball: newDisplayBall,
      runs_off_bat: ball.runsOffBat,
      extra_runs: ball.extraRuns,
      extra_type: ball.extraType,
      is_wicket: ball.isWicket,
      wicket_type: ball.wicketType,
      total_runs: totalRunsThisBall,
    },
  };
}

/**
 * Format overs display: e.g. 10.3 means 10 overs 3 balls
 */
export function formatOvers(legalBalls: number): string {
  const overs = Math.floor(legalBalls / 6);
  const balls = legalBalls % 6;
  return `${overs}.${balls}`;
}

/**
 * Calculate run rate
 */
export function getRunRate(runs: number, legalBalls: number): string {
  if (legalBalls === 0) return '0.00';
  return ((runs / legalBalls) * 6).toFixed(2);
}

/**
 * Calculate required run rate
 */
export function getRequiredRunRate(target: number, currentRuns: number, remainingBalls: number): string {
  if (remainingBalls <= 0) return '---';
  const needed = target - currentRuns;
  if (needed <= 0) return '0.00';
  return ((needed / remainingBalls) * 6).toFixed(2);
}

/**
 * Calculate batting strike rate
 */
export function getStrikeRate(runs: number, balls: number): string {
  if (balls === 0) return '0.00';
  return ((runs / balls) * 100).toFixed(1);
}

/**
 * Calculate bowling economy
 */
export function getEconomy(runs: number, legalBalls: number): string {
  if (legalBalls === 0) return '0.00';
  return ((runs / legalBalls) * 6).toFixed(2);
}

/**
 * Get over summary string e.g. "1 . W 4 . ."
 */
export function getOverSummary(balls: Array<{ runs_off_bat: number; extra_type: ExtraType; is_wicket: boolean; extra_runs: number }>): string {
  return balls.map((b) => {
    if (b.is_wicket) return 'W';
    if (b.extra_type === 'wide') return `Wd${b.extra_runs > 1 ? '+' + (b.extra_runs - 1) : ''}`;
    if (b.extra_type === 'no_ball') return `Nb`;
    if (b.extra_type === 'bye') return `B${b.extra_runs}`;
    if (b.extra_type === 'leg_bye') return `Lb${b.extra_runs}`;
    return `${b.runs_off_bat}`;
  }).join(' ');
}

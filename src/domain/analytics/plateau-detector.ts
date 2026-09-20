import type { EntityId, ISODateTimeString } from '../common/types.js';
import type { WorkoutSnapshot } from '../entities/workout-snapshot.js';
import { isWorkingSet } from '../enums/set-type.js';
import { calculateEpley1RM } from '../math/progress-math.js';
import type { PlateauReport } from './types.js';

export const DISCLAIMER_TEXT =
  'Heurística puramente descritiva baseada no histórico de treino, sem finalidade médica ou diagnóstica.';

export interface ExerciseSessionRecord {
  readonly snapshotId: EntityId;
  readonly date: ISODateTimeString;
  readonly timeMs: number;
  readonly maxE1RM: number;
  readonly maxWeightKg: number;
  readonly totalVolumeKg: number;
}

export class PlateauDetector {
  /**
   * Deterministically evaluates training snapshots to identify possible performance plateaus,
   * acute volume anomalies, and extended exercise absences.
   */
  static detectPlateausAndAnomalies(
    snapshots: readonly WorkoutSnapshot[],
    referenceDateInput?: Date | string,
    minExposures = 4,
  ): readonly PlateauReport[] {
    if (snapshots.length === 0) return [];

    const refDate = referenceDateInput ? new Date(referenceDateInput) : new Date();
    const refMs = isNaN(refDate.getTime()) ? Date.now() : refDate.getTime();

    // Group sessions by exerciseId chronologically
    const exerciseHistoryMap = new Map<
      EntityId,
      { name: string; sessions: ExerciseSessionRecord[] }
    >();

    const sortedAsc = [...snapshots].sort((a, b) => {
      const tA = Date.parse(a.completedAt) || 0;
      const tB = Date.parse(b.completedAt) || 0;
      if (tA !== tB) return tA - tB;
      return a.id.localeCompare(b.id);
    });

    for (const snap of sortedAsc) {
      const snapTime = Date.parse(snap.completedAt);
      if (isNaN(snapTime) || snapTime > refMs) continue;

      for (const ex of snap.exercises) {
        let maxE1RM = 0;
        let maxWeight = 0;
        let exerciseVolume = 0;

        for (const set of ex.sets) {
          if (!set.completed || !isWorkingSet(set.type)) continue;
          const w = set.weight ?? 0;
          const r = set.reps ?? 0;
          const e1rm = calculateEpley1RM(w, r);
          if (e1rm > maxE1RM) maxE1RM = e1rm;
          if (w > maxWeight) maxWeight = w;
          exerciseVolume += w * r;
        }

        if (maxWeight === 0 && exerciseVolume === 0) continue;

        let entry = exerciseHistoryMap.get(ex.exerciseId);
        if (!entry) {
          entry = { name: ex.exerciseName, sessions: [] };
          exerciseHistoryMap.set(ex.exerciseId, entry);
        }

        entry.sessions.push({
          snapshotId: snap.id,
          date: snap.completedAt,
          timeMs: snapTime,
          maxE1RM,
          maxWeightKg: maxWeight,
          totalVolumeKg: Math.round(exerciseVolume * 10) / 10,
        });
      }
    }

    const reports: PlateauReport[] = [];

    for (const [exerciseId, { name, sessions }] of exerciseHistoryMap.entries()) {
      if (sessions.length === 0) continue;

      // 1. STAGNANT_LOAD: Last N exposures without improvement
      if (sessions.length >= minExposures) {
        const recentSessions = sessions.slice(-minExposures);
        const baseline = recentSessions[0];
        const latest = recentSessions[recentSessions.length - 1];

        // Benchmark e1RM vs latest e1RM
        const benchmarkVal = baseline.maxE1RM || baseline.maxWeightKg;
        const currentVal = latest.maxE1RM || latest.maxWeightKg;

        if (benchmarkVal > 0) {
          const changePercent =
            Math.round(((currentVal - benchmarkVal) / benchmarkVal) * 1000) / 10;

          // If improvement is <= 0.5% after minExposures exposures
          if (changePercent <= 0.5) {
            reports.push({
              exerciseId,
              exerciseName: name,
              type: 'STAGNANT_LOAD',
              typeLabel: 'Estagnação de Carga',
              exposuresCount: minExposures,
              firstExposureDate: baseline.date,
              lastExposureDate: latest.date,
              benchmarkValue: Math.round(benchmarkVal * 10) / 10,
              currentValue: Math.round(currentVal * 10) / 10,
              changePercent,
              reason: `Sem aumento significativo (+0,5%) de e1RM ou carga nas últimas ${minExposures} sessões consecutivas.`,
              recommendation:
                'Considere variar a faixa de repetições (ex: alternar entre 6-8 e 10-12), alternar exercícios acessórios ou programar um deload.',
              disclaimer: DISCLAIMER_TEXT,
            });
          }
        }
      }

      // 2. EXTENDED_ABSENCE: Had >= 3 sessions in past, but none in last 28 days
      const daysSinceLastSession = (refMs - sessions[sessions.length - 1].timeMs) / 86400000;
      if (sessions.length >= 3 && daysSinceLastSession >= 28) {
        const latest = sessions[sessions.length - 1];
        reports.push({
          exerciseId,
          exerciseName: name,
          type: 'EXTENDED_ABSENCE',
          typeLabel: 'Ausência Prolongada',
          exposuresCount: sessions.length,
          lastExposureDate: latest.date,
          benchmarkValue: Math.round(latest.maxE1RM * 10) / 10,
          currentValue: 0,
          changePercent: -100,
          reason: `Exercício regular não executado nos últimos ${Math.floor(daysSinceLastSession)} dias (última sessão em ${new Date(latest.date).toLocaleDateString('pt-BR')}).`,
          recommendation:
            'Ao reintroduzir este movimento, inicie com 70-80% da carga anterior para permitir readaptação articular e neuromuscular.',
          disclaimer: DISCLAIMER_TEXT,
        });
      }

      // 3. VOLUME_ANOMALY: Latest session volume deviates drastically (>60%) from rolling average of prior 4 sessions
      if (sessions.length >= 4) {
        const priorSessions = sessions.slice(-5, -1);
        const latestSession = sessions[sessions.length - 1];

        const avgPriorVolume =
          priorSessions.reduce((sum, s) => sum + s.totalVolumeKg, 0) / priorSessions.length;

        if (avgPriorVolume > 0 && latestSession.totalVolumeKg > 0) {
          const ratio = latestSession.totalVolumeKg / avgPriorVolume;
          if (ratio < 0.4 || ratio > 1.6) {
            const devPercent = Math.round(
              ((latestSession.totalVolumeKg - avgPriorVolume) / avgPriorVolume) * 100,
            );
            reports.push({
              exerciseId,
              exerciseName: name,
              type: 'VOLUME_ANOMALY',
              typeLabel: devPercent > 0 ? 'Pico Incomum de Volume' : 'Queda Expressiva de Volume',
              exposuresCount: sessions.length,
              lastExposureDate: latestSession.date,
              benchmarkValue: Math.round(avgPriorVolume),
              currentValue: Math.round(latestSession.totalVolumeKg),
              changePercent: devPercent,
              reason: `Volume na última sessão (${latestSession.totalVolumeKg} kg) divergiu ${devPercent > 0 ? '+' : ''}${devPercent}% da média recente (${Math.round(avgPriorVolume)} kg).`,
              recommendation:
                devPercent > 0
                  ? 'Verifique a fadiga acumulada e certifique-se de manter a recuperação e nutrição adequadas.'
                  : 'Queda acentuada de volume; verifique se foi planejada (ex: semana de deload) ou causada por interrupção.',
              disclaimer: DISCLAIMER_TEXT,
            });
          }
        }
      }
    }

    return reports;
  }
}

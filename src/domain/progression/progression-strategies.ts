import { generateId } from '../common/id.js';
import { SetType } from '../enums/set-type.js';
import { ProgressionStrategyType } from '../enums/progression-strategy-type.js';
import type {
  ProgressionContext,
  ProgressionStrategy,
  ProgressionSuggestion,
  ProgressionSetSuggestion,
  LinearProgressionConfig,
  DoubleProgressionConfig,
  DynamicDoubleProgressionConfig,
  RepGoalProgressionConfig,
  PercentageProgressionConfig,
  RpeRirProgressionConfig,
  TopSetBackoffProgressionConfig,
  CustomProgressionConfig,
} from './types.js';
import type { ExerciseSet } from '../entities/exercise-set.js';

function roundToHalf(val: number): number {
  return Math.round(val * 2) / 2;
}

function getWorkingSets(sets: readonly ExerciseSet[]): readonly ExerciseSet[] {
  return sets.filter((s) => s.completed && s.type !== SetType.WARMUP && (s.weight ?? 0) >= 0);
}

// 1. Manual Strategy
export class ManualProgressionStrategy implements ProgressionStrategy {
  readonly type = ProgressionStrategyType.MANUAL;

  evaluate(_context: ProgressionContext): ProgressionSuggestion | null {
    // Manual progression requires no automated suggestion
    return null;
  }
}

// 2. Linear Progression Strategy
export class LinearProgressionStrategy implements ProgressionStrategy {
  readonly type = ProgressionStrategyType.LINEAR_PROGRESSION;

  evaluate(
    context: ProgressionContext,
    userConfig?: Partial<LinearProgressionConfig>,
  ): ProgressionSuggestion | null {
    const workingSets = getWorkingSets(context.previousSets);
    if (workingSets.length === 0) return null;

    const config: LinearProgressionConfig = {
      targetReps: userConfig?.targetReps ?? 5,
      incrementKg: userConfig?.incrementKg ?? 2.5,
    };

    const lastWeight = workingSets[0]?.weight ?? 0;
    const allMet = workingSets.every((s) => (s.reps ?? 0) >= config.targetReps);
    const setsCount =
      context.plannedSets.length > 0 ? context.plannedSets.length : workingSets.length;

    if (allMet) {
      const nextWeight = roundToHalf(lastWeight + config.incrementKg);
      const suggestedSets: ProgressionSetSuggestion[] = Array.from(
        { length: setsCount },
        (_, i) => ({
          setNumber: i + 1,
          weight: nextWeight,
          reps: config.targetReps,
          type: SetType.NORMAL,
        }),
      );

      return {
        id: generateId('prog'),
        exerciseId: context.exerciseId,
        strategyType: this.type,
        title: 'Progressão Linear',
        summary: `Aumentar +${config.incrementKg}kg para ${nextWeight}kg mantendo ${config.targetReps} reps`,
        evidence: `Todas as ${workingSets.length} séries anteriores atingiram a meta de ${config.targetReps} reps com ${lastWeight}kg.`,
        suggestedSets,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      };
    } else {
      // Keep weight
      const suggestedSets: ProgressionSetSuggestion[] = Array.from(
        { length: setsCount },
        (_, i) => ({
          setNumber: i + 1,
          weight: lastWeight,
          reps: config.targetReps,
          type: SetType.NORMAL,
        }),
      );

      return {
        id: generateId('prog'),
        exerciseId: context.exerciseId,
        strategyType: this.type,
        title: 'Progressão Linear (Manter)',
        summary: `Manter ${lastWeight}kg e buscar atingir ${config.targetReps} reps em todas as séries`,
        evidence: `Na sessão anterior nem todas as séries completaram ${config.targetReps} reps com ${lastWeight}kg.`,
        suggestedSets,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      };
    }
  }
}

// 3. Double Progression Strategy
export class DoubleProgressionStrategy implements ProgressionStrategy {
  readonly type = ProgressionStrategyType.DOUBLE_PROGRESSION;

  evaluate(
    context: ProgressionContext,
    userConfig?: Partial<DoubleProgressionConfig>,
  ): ProgressionSuggestion | null {
    const workingSets = getWorkingSets(context.previousSets);
    if (workingSets.length === 0) return null;

    const config: DoubleProgressionConfig = {
      minReps: userConfig?.minReps ?? 8,
      maxReps: userConfig?.maxReps ?? 12,
      incrementKg: userConfig?.incrementKg ?? 2.5,
    };

    const lastWeight = workingSets[0]?.weight ?? 0;
    const allHitMax = workingSets.every((s) => (s.reps ?? 0) >= config.maxReps);
    const setsCount =
      context.plannedSets.length > 0 ? context.plannedSets.length : workingSets.length;

    if (allHitMax) {
      const nextWeight = roundToHalf(lastWeight + config.incrementKg);
      const suggestedSets: ProgressionSetSuggestion[] = Array.from(
        { length: setsCount },
        (_, i) => ({
          setNumber: i + 1,
          weight: nextWeight,
          reps: config.minReps,
          type: SetType.NORMAL,
        }),
      );

      return {
        id: generateId('prog'),
        exerciseId: context.exerciseId,
        strategyType: this.type,
        title: 'Double Progression (Subir Carga)',
        summary: `Aumentar para ${nextWeight}kg e reiniciar na base da faixa (${config.minReps} reps)`,
        evidence: `Todas as séries anteriores atingiram o teto da faixa (${config.maxReps} reps) com ${lastWeight}kg.`,
        suggestedSets,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      };
    } else {
      const minPrevReps = Math.min(...workingSets.map((s) => s.reps ?? 0));
      const maxPrevReps = Math.max(...workingSets.map((s) => s.reps ?? 0));
      const targetReps = Math.min(config.maxReps, maxPrevReps + 1);

      const suggestedSets: ProgressionSetSuggestion[] = Array.from(
        { length: setsCount },
        (_, i) => ({
          setNumber: i + 1,
          weight: lastWeight,
          reps: targetReps,
          type: SetType.NORMAL,
        }),
      );

      return {
        id: generateId('prog'),
        exerciseId: context.exerciseId,
        strategyType: this.type,
        title: 'Double Progression (Adicionar Reps)',
        summary: `Manter ${lastWeight}kg e buscar ${targetReps} reps rumo ao teto de ${config.maxReps}`,
        evidence: `Sessão anterior: repetições entre ${minPrevReps} e ${maxPrevReps} reps com ${lastWeight}kg.`,
        suggestedSets,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      };
    }
  }
}

// 4. Dynamic Double Progression Strategy (independent per set)
export class DynamicDoubleProgressionStrategy implements ProgressionStrategy {
  readonly type = ProgressionStrategyType.DYNAMIC_DOUBLE_PROGRESSION;

  evaluate(
    context: ProgressionContext,
    userConfig?: Partial<DynamicDoubleProgressionConfig>,
  ): ProgressionSuggestion | null {
    const workingSets = getWorkingSets(context.previousSets);
    if (workingSets.length === 0) return null;

    const config: DynamicDoubleProgressionConfig = {
      minReps: userConfig?.minReps ?? 8,
      maxReps: userConfig?.maxReps ?? 12,
      incrementKg: userConfig?.incrementKg ?? 2.5,
    };

    const setsCount =
      context.plannedSets.length > 0 ? context.plannedSets.length : workingSets.length;
    const suggestedSets: ProgressionSetSuggestion[] = [];
    let promotedCount = 0;

    for (let i = 0; i < setsCount; i++) {
      const prev = workingSets[i] ?? workingSets[workingSets.length - 1];
      const prevWeight = prev?.weight ?? 0;
      const prevReps = prev?.reps ?? 0;

      if (prevReps >= config.maxReps) {
        promotedCount++;
        suggestedSets.push({
          setNumber: i + 1,
          weight: roundToHalf(prevWeight + config.incrementKg),
          reps: config.minReps,
          type: SetType.NORMAL,
        });
      } else {
        suggestedSets.push({
          setNumber: i + 1,
          weight: prevWeight,
          reps: Math.min(config.maxReps, prevReps + 1),
          type: SetType.NORMAL,
        });
      }
    }

    return {
      id: generateId('prog'),
      exerciseId: context.exerciseId,
      strategyType: this.type,
      title: 'Dynamic Double Progression',
      summary:
        promotedCount > 0
          ? `${promotedCount} série(s) subiram carga (+${config.incrementKg}kg); demais buscam reps`
          : `Manter cargas e buscar +1 rep em cada série até ${config.maxReps}`,
      evidence: `Progressão independente por série: séries que bateram ${config.maxReps} reps sobem de carga individualmente.`,
      suggestedSets,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };
  }
}

// 5. Rep Goal Strategy
export class RepGoalProgressionStrategy implements ProgressionStrategy {
  readonly type = ProgressionStrategyType.REP_GOAL;

  evaluate(
    context: ProgressionContext,
    userConfig?: Partial<RepGoalProgressionConfig>,
  ): ProgressionSuggestion | null {
    const workingSets = getWorkingSets(context.previousSets);
    if (workingSets.length === 0) return null;

    const config: RepGoalProgressionConfig = {
      totalRepGoal: userConfig?.totalRepGoal ?? 25,
      incrementKg: userConfig?.incrementKg ?? 2.5,
    };

    const totalRepsAchieved = workingSets.reduce((acc, s) => acc + (s.reps ?? 0), 0);
    const lastWeight = workingSets[0]?.weight ?? 0;
    const setsCount =
      context.plannedSets.length > 0 ? context.plannedSets.length : workingSets.length;
    const repsPerSet = Math.ceil(config.totalRepGoal / setsCount);

    if (totalRepsAchieved >= config.totalRepGoal) {
      const nextWeight = roundToHalf(lastWeight + config.incrementKg);
      const suggestedSets: ProgressionSetSuggestion[] = Array.from(
        { length: setsCount },
        (_, i) => ({
          setNumber: i + 1,
          weight: nextWeight,
          reps: repsPerSet,
          type: SetType.NORMAL,
        }),
      );

      return {
        id: generateId('prog'),
        exerciseId: context.exerciseId,
        strategyType: this.type,
        title: 'Rep Goal (Meta Superada)',
        summary: `Aumentar +${config.incrementKg}kg para ${nextWeight}kg (meta total de ${config.totalRepGoal} reps batida)`,
        evidence: `Total acumulado na sessão anterior: ${totalRepsAchieved} reps (meta era ${config.totalRepGoal} reps).`,
        suggestedSets,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      };
    } else {
      const suggestedSets: ProgressionSetSuggestion[] = Array.from(
        { length: setsCount },
        (_, i) => ({
          setNumber: i + 1,
          weight: lastWeight,
          reps: repsPerSet,
          type: SetType.NORMAL,
        }),
      );

      return {
        id: generateId('prog'),
        exerciseId: context.exerciseId,
        strategyType: this.type,
        title: 'Rep Goal (Buscar Meta)',
        summary: `Manter ${lastWeight}kg e acumular mais repetições rumo a ${config.totalRepGoal} totais`,
        evidence: `Total acumulado na sessão anterior: ${totalRepsAchieved}/${config.totalRepGoal} reps com ${lastWeight}kg.`,
        suggestedSets,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      };
    }
  }
}

// 6. Percentage Based Strategy
export class PercentageBasedProgressionStrategy implements ProgressionStrategy {
  readonly type = ProgressionStrategyType.PERCENTAGE_BASED;

  evaluate(
    context: ProgressionContext,
    userConfig?: Partial<PercentageProgressionConfig>,
  ): ProgressionSuggestion | null {
    const config: PercentageProgressionConfig = {
      targetPercentage: userConfig?.targetPercentage ?? 0.8,
      targetReps: userConfig?.targetReps ?? 5,
      manualE1rm: userConfig?.manualE1rm,
    };

    let base1Rm = config.manualE1rm ?? context.estimated1Rm;
    if (!base1Rm) {
      const workingSets = getWorkingSets(context.previousSets);
      if (workingSets.length > 0) {
        // Epley formula: w * (1 + r / 30)
        let maxE1rm = 0;
        for (const s of workingSets) {
          const w = s.weight ?? 0;
          const r = s.reps ?? 0;
          if (w > 0 && r > 0) {
            const e1rm = r === 1 ? w : w * (1 + r / 30);
            if (e1rm > maxE1rm) maxE1rm = e1rm;
          }
        }
        if (maxE1rm > 0) base1Rm = maxE1rm;
      }
    }

    if (!base1Rm || base1Rm <= 0) return null;

    const suggestedWeight = roundToHalf(base1Rm * config.targetPercentage);
    const setsCount = context.plannedSets.length > 0 ? context.plannedSets.length : 3;

    const suggestedSets: ProgressionSetSuggestion[] = Array.from({ length: setsCount }, (_, i) => ({
      setNumber: i + 1,
      weight: suggestedWeight,
      reps: config.targetReps,
      type: SetType.NORMAL,
    }));

    const pctDisplay = Math.round(config.targetPercentage * 100);

    return {
      id: generateId('prog'),
      exerciseId: context.exerciseId,
      strategyType: this.type,
      title: `Percentual de 1RM (${pctDisplay}%)`,
      summary: `Prescrição de ${suggestedWeight}kg (${pctDisplay}% do 1RM de ${roundToHalf(base1Rm)}kg) para ${config.targetReps} reps`,
      evidence: `Baseado em 1RM de ${roundToHalf(base1Rm)}kg.`,
      suggestedSets,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };
  }
}

// 7. RPE / RIR Based Strategy
export class RpeRirProgressionStrategy implements ProgressionStrategy {
  readonly type = ProgressionStrategyType.RPE_RIR_BASED;

  evaluate(
    context: ProgressionContext,
    userConfig?: Partial<RpeRirProgressionConfig>,
  ): ProgressionSuggestion | null {
    const workingSets = getWorkingSets(context.previousSets);
    if (workingSets.length === 0) return null;

    const config: RpeRirProgressionConfig = {
      targetRpe: userConfig?.targetRpe ?? 8.0,
      targetRir: userConfig?.targetRir,
      incrementKg: userConfig?.incrementKg ?? 2.5,
    };

    const setsWithRpe = workingSets.filter((s) => s.rpe !== undefined || s.rir !== undefined);
    const lastWeight = workingSets[0]?.weight ?? 0;
    const lastReps = workingSets[0]?.reps ?? 8;
    const setsCount =
      context.plannedSets.length > 0 ? context.plannedSets.length : workingSets.length;

    if (setsWithRpe.length === 0) {
      // No RPE recorded previously, suggest baseline target RPE
      const suggestedSets: ProgressionSetSuggestion[] = Array.from(
        { length: setsCount },
        (_, i) => ({
          setNumber: i + 1,
          weight: lastWeight,
          reps: lastReps,
          targetRpe: config.targetRpe,
          targetRir: config.targetRir,
          type: SetType.NORMAL,
        }),
      );

      return {
        id: generateId('prog'),
        exerciseId: context.exerciseId,
        strategyType: this.type,
        title: 'Autorregulação por RPE/RIR',
        summary: `Mirar em RPE ${config.targetRpe} com ${lastWeight}kg`,
        evidence: `Sem RPE registrado anteriormente. Mirar na faixa de esforço prescrita.`,
        suggestedSets,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      };
    }

    const avgRpe =
      setsWithRpe.reduce((acc, s) => {
        if (s.rpe !== undefined) return acc + s.rpe;
        if (s.rir !== undefined) return acc + (10 - s.rir);
        return acc + 8;
      }, 0) / setsWithRpe.length;

    const target = config.targetRpe ?? 8.0;

    if (avgRpe <= target - 1.0) {
      // Effort was too low (undershot) -> increase weight
      const nextWeight = roundToHalf(lastWeight + config.incrementKg);
      const suggestedSets: ProgressionSetSuggestion[] = Array.from(
        { length: setsCount },
        (_, i) => ({
          setNumber: i + 1,
          weight: nextWeight,
          reps: lastReps,
          targetRpe: config.targetRpe,
          type: SetType.NORMAL,
        }),
      );

      return {
        id: generateId('prog'),
        exerciseId: context.exerciseId,
        strategyType: this.type,
        title: 'Autorregulação RPE (Aumentar Carga)',
        summary: `Subir +${config.incrementKg}kg para ${nextWeight}kg (RPE médio anterior ${avgRpe.toFixed(1)} ficou abaixo de ${target})`,
        evidence: `RPE registrado (${avgRpe.toFixed(1)}) indicou esforço abaixo da meta planejada de ${target}.`,
        suggestedSets,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      };
    } else if (avgRpe >= 9.5 && target <= 8.5) {
      // Overshot -> hold or slight deload
      const suggestedSets: ProgressionSetSuggestion[] = Array.from(
        { length: setsCount },
        (_, i) => ({
          setNumber: i + 1,
          weight: lastWeight,
          reps: lastReps,
          targetRpe: config.targetRpe,
          type: SetType.NORMAL,
        }),
      );

      return {
        id: generateId('prog'),
        exerciseId: context.exerciseId,
        strategyType: this.type,
        title: 'Autorregulação RPE (Consolidar)',
        summary: `Manter ${lastWeight}kg e focar na qualidade do movimento para atingir RPE ${target}`,
        evidence: `RPE da sessão anterior (${avgRpe.toFixed(1)}) aproximou-se da falha máxima.`,
        suggestedSets,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      };
    } else {
      // In the pocket
      const nextWeight = roundToHalf(lastWeight + config.incrementKg);
      const suggestedSets: ProgressionSetSuggestion[] = Array.from(
        { length: setsCount },
        (_, i) => ({
          setNumber: i + 1,
          weight: nextWeight,
          reps: lastReps,
          targetRpe: config.targetRpe,
          type: SetType.NORMAL,
        }),
      );

      return {
        id: generateId('prog'),
        exerciseId: context.exerciseId,
        strategyType: this.type,
        title: 'Autorregulação RPE (Progresso Gradual)',
        summary: `Subir para ${nextWeight}kg buscando RPE alvo ${target}`,
        evidence: `RPE anterior (${avgRpe.toFixed(1)}) dentro da zona ideal de treinamento (${target}).`,
        suggestedSets,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      };
    }
  }
}

// 8. Top Set + Backoff Strategy
export class TopSetBackoffProgressionStrategy implements ProgressionStrategy {
  readonly type = ProgressionStrategyType.TOP_SET_BACKOFF;

  evaluate(
    context: ProgressionContext,
    userConfig?: Partial<TopSetBackoffProgressionConfig>,
  ): ProgressionSuggestion | null {
    const workingSets = getWorkingSets(context.previousSets);
    if (workingSets.length === 0) return null;

    const config: TopSetBackoffProgressionConfig = {
      topSetReps: userConfig?.topSetReps ?? 5,
      backoffPercentage: userConfig?.backoffPercentage ?? 0.9,
      backoffSets: userConfig?.backoffSets ?? 3,
      backoffReps: userConfig?.backoffReps ?? 8,
      incrementKg: userConfig?.incrementKg ?? 2.5,
    };

    // Find top set: either tagged as TOP_SET or highest load
    const topSet =
      workingSets.find((s) => s.type === SetType.TOP_SET) ??
      [...workingSets].sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0))[0];

    if (!topSet || (topSet.weight ?? 0) <= 0) return null;

    const topWeight = topSet.weight ?? 0;
    const topReps = topSet.reps ?? 0;
    const topHit = topReps >= config.topSetReps;

    const nextTopWeight = topHit ? roundToHalf(topWeight + config.incrementKg) : topWeight;
    const backoffWeight = roundToHalf(nextTopWeight * config.backoffPercentage);

    const suggestedSets: ProgressionSetSuggestion[] = [
      {
        setNumber: 1,
        weight: nextTopWeight,
        reps: config.topSetReps,
        type: SetType.TOP_SET,
      },
      ...Array.from({ length: config.backoffSets }, (_, i) => ({
        setNumber: i + 2,
        weight: backoffWeight,
        reps: config.backoffReps,
        type: SetType.BACKOFF,
      })),
    ];

    const pctDisplay = Math.round(config.backoffPercentage * 100);

    return {
      id: generateId('prog'),
      exerciseId: context.exerciseId,
      strategyType: this.type,
      title: 'Top Set + Backoff',
      summary: topHit
        ? `Top Set: +${config.incrementKg}kg (${nextTopWeight}kg × ${config.topSetReps}) | Backoff: ${config.backoffSets}x${config.backoffReps} @ ${backoffWeight}kg (${pctDisplay}%)`
        : `Manter Top Set em ${nextTopWeight}kg × ${config.topSetReps} | Backoff: ${config.backoffSets}x${config.backoffReps} @ ${backoffWeight}kg`,
      evidence: `Top set anterior: ${topWeight}kg × ${topReps} reps (${topHit ? 'meta batida' : 'meta pendente'}).`,
      suggestedSets,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };
  }
}

// 9. Custom Progression Strategy
export class CustomProgressionStrategy implements ProgressionStrategy {
  readonly type = ProgressionStrategyType.CUSTOM;

  evaluate(
    context: ProgressionContext,
    userConfig?: Partial<CustomProgressionConfig>,
  ): ProgressionSuggestion | null {
    const workingSets = getWorkingSets(context.previousSets);
    if (workingSets.length === 0) return null;

    const config: CustomProgressionConfig = {
      stepKg: userConfig?.stepKg ?? 2.0,
      repTarget: userConfig?.repTarget ?? 10,
      description: userConfig?.description ?? 'Progressão Customizada',
    };

    const lastWeight = workingSets[0]?.weight ?? 0;
    const allMet = workingSets.every((s) => (s.reps ?? 0) >= config.repTarget);
    const setsCount =
      context.plannedSets.length > 0 ? context.plannedSets.length : workingSets.length;
    const nextWeight = allMet ? roundToHalf(lastWeight + config.stepKg) : lastWeight;

    const suggestedSets: ProgressionSetSuggestion[] = Array.from({ length: setsCount }, (_, i) => ({
      setNumber: i + 1,
      weight: nextWeight,
      reps: config.repTarget,
      type: SetType.NORMAL,
    }));

    return {
      id: generateId('prog'),
      exerciseId: context.exerciseId,
      strategyType: this.type,
      title: `Custom: ${config.description}`,
      summary: allMet
        ? `Aumentar +${config.stepKg}kg para ${nextWeight}kg mantendo ${config.repTarget} reps`
        : `Manter ${lastWeight}kg e buscar ${config.repTarget} reps`,
      evidence: `Meta customizada de ${config.repTarget} reps ${allMet ? 'completada' : 'incompleta'} na sessão anterior.`,
      suggestedSets,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };
  }
}

/**
 * Registry holding all strategy instances.
 */
export const progressionStrategies: Record<ProgressionStrategyType, ProgressionStrategy> = {
  [ProgressionStrategyType.MANUAL]: new ManualProgressionStrategy(),
  [ProgressionStrategyType.LINEAR_PROGRESSION]: new LinearProgressionStrategy(),
  [ProgressionStrategyType.DOUBLE_PROGRESSION]: new DoubleProgressionStrategy(),
  [ProgressionStrategyType.DYNAMIC_DOUBLE_PROGRESSION]: new DynamicDoubleProgressionStrategy(),
  [ProgressionStrategyType.REP_GOAL]: new RepGoalProgressionStrategy(),
  [ProgressionStrategyType.PERCENTAGE_BASED]: new PercentageBasedProgressionStrategy(),
  [ProgressionStrategyType.RPE_RIR_BASED]: new RpeRirProgressionStrategy(),
  [ProgressionStrategyType.TOP_SET_BACKOFF]: new TopSetBackoffProgressionStrategy(),
  [ProgressionStrategyType.CUSTOM]: new CustomProgressionStrategy(),
};

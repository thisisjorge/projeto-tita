import { SEED_TEMPLATES, type ProgramTemplate } from '../../data/seed-templates.js';
import { builtinSplitLabel } from '../../data/builtin-display.js';

export interface DiscoveryPreferences {
  readonly daysPerWeek: number; // 2, 3, 4, 5, 6
  readonly sessionDurationMinutes: number; // 30 to 120
  readonly experienceLevel: 'beginner' | 'intermediate' | 'advanced';
  readonly goal: 'hypertrophy' | 'strength' | 'general_fitness';
  readonly equipment: 'full_gym' | 'barbell_and_rack' | 'dumbbells';
  readonly preferredSplit?: 'full_body' | 'upper_lower' | 'ppl' | 'any';
  readonly complexity?: 'simple' | 'moderate' | 'advanced';
}

export interface CompatibilityBreakdown {
  readonly scheduleAlignment: number; // max 35
  readonly durationAlignment: number; // max 25
  readonly experienceAlignment: number; // max 20
  readonly goalAlignment: number; // max 20
}

export interface DiscoveryRecommendation {
  readonly template: ProgramTemplate;
  readonly compatibilityScore: number; // 0 to 100
  readonly scoreBreakdown: CompatibilityBreakdown;
  readonly matchReasoning: readonly string[];
  readonly pros: readonly string[];
  readonly tradeoffs: readonly string[];
}

export interface DiscoveryReport {
  readonly preferences: DiscoveryPreferences;
  readonly recommendations: readonly DiscoveryRecommendation[];
  readonly topRecommendation: DiscoveryRecommendation | null;
  readonly generatedAt: string;
}

export class ProgramDiscoveryEngine {
  private readonly templates: readonly ProgramTemplate[];

  constructor(templates: readonly ProgramTemplate[] = SEED_TEMPLATES) {
    this.templates = templates;
  }

  /**
   * Deterministically evaluates and ranks available program templates against user preferences.
   * Zero AI, pure logic based on schedule, duration, experience, and training intent.
   */
  discover(preferences: DiscoveryPreferences): DiscoveryReport {
    const scoredRecommendations: DiscoveryRecommendation[] = this.templates.map((template) => {
      return this.evaluateTemplate(template, preferences);
    });

    // Sort descending by compatibilityScore, tiebreak by alphabetical name for determinism
    scoredRecommendations.sort((a, b) => {
      if (b.compatibilityScore !== a.compatibilityScore) {
        return b.compatibilityScore - a.compatibilityScore;
      }
      return a.template.name.localeCompare(b.template.name);
    });

    return {
      preferences,
      recommendations: scoredRecommendations,
      topRecommendation: scoredRecommendations[0] ?? null,
      generatedAt: new Date().toISOString(),
    };
  }

  private evaluateTemplate(
    template: ProgramTemplate,
    prefs: DiscoveryPreferences,
  ): DiscoveryRecommendation {
    const reasoning: string[] = [];
    const pros: string[] = [];
    const tradeoffs: string[] = [];

    // 1. Schedule Alignment (max 35 pts)
    const dayDiff = Math.abs(template.daysPerWeek - prefs.daysPerWeek);
    let scheduleScore = 0;

    if (dayDiff === 0) {
      scheduleScore = 35;
      reasoning.push(
        `Alinhamento perfeito de frequência: ${template.daysPerWeek} dias semanais correspondem exatamente à sua disponibilidade.`,
      );
    } else if (dayDiff === 1) {
      scheduleScore = 22;
      reasoning.push(
        `Frequência próxima: o modelo prevê ${template.daysPerWeek} dias (diferença de apenas 1 dia para seus ${prefs.daysPerWeek} dias).`,
      );
      if (template.daysPerWeek > prefs.daysPerWeek) {
        tradeoffs.push(
          `Exige ajustar sua rotina para encaixar 1 dia a mais na semana ou estender o ciclo.`,
        );
      }
    } else if (dayDiff === 2) {
      scheduleScore = 12;
      reasoning.push(
        `Diferença moderada de dias: requer adaptação de calendário (${template.daysPerWeek} dias previstos vs ${prefs.daysPerWeek} disponíveis).`,
      );
      tradeoffs.push(
        `Volume semanal precisará ser redistribuído ou sessões combinadas para a sua rotina de ${prefs.daysPerWeek} dias.`,
      );
    } else {
      scheduleScore = 5;
      tradeoffs.push(
        `Grande divergência de dias semanais (${template.daysPerWeek} dias do modelo vs ${prefs.daysPerWeek} desejados).`,
      );
    }

    // 2. Duration Alignment (max 25 pts)
    const durDiff = Math.abs(
      template.estimatedSessionDurationMinutes - prefs.sessionDurationMinutes,
    );
    let durationScore = 0;

    if (durDiff <= 10) {
      durationScore = 25;
      reasoning.push(
        `Tempo de sessão ideal: estimada em ~${template.estimatedSessionDurationMinutes} min, perfeitamente compatível com seu limite de ${prefs.sessionDurationMinutes} min.`,
      );
    } else if (durDiff <= 20) {
      durationScore = 18;
      reasoning.push(
        `Duração gerenciável: cerca de ${template.estimatedSessionDurationMinutes} min por treino.`,
      );
    } else if (durDiff <= 35) {
      durationScore = 10;
      if (template.estimatedSessionDurationMinutes > prefs.sessionDurationMinutes) {
        tradeoffs.push(
          `Sessão ligeiramente mais longa que seus ${prefs.sessionDurationMinutes} min ideais; descansar menos pode acelerar o ritmo.`,
        );
      }
    } else {
      durationScore = 5;
      tradeoffs.push(
        `Duração estimada de ${template.estimatedSessionDurationMinutes} min destoa do seu objetivo de ${prefs.sessionDurationMinutes} min.`,
      );
    }

    // 3. Experience Alignment (max 20 pts)
    let experienceScore = 0;
    if (template.experienceLevel === prefs.experienceLevel) {
      experienceScore = 20;
      reasoning.push(
        `Nível técnico equivalente: desenhado para praticantes com experiência ${this.translateExperience(prefs.experienceLevel)}.`,
      );
    } else if (
      (prefs.experienceLevel === 'intermediate' &&
        (template.experienceLevel === 'beginner' || template.experienceLevel === 'advanced')) ||
      (prefs.experienceLevel === 'beginner' && template.experienceLevel === 'intermediate') ||
      (prefs.experienceLevel === 'advanced' && template.experienceLevel === 'intermediate')
    ) {
      experienceScore = 14;
      reasoning.push(
        `Nível técnico viável com transição suave (${this.translateExperience(template.experienceLevel)}).`,
      );
    } else {
      experienceScore = 6;
      tradeoffs.push(
        `Nível técnico avançado (${this.translateExperience(template.experienceLevel)}) pode apresentar curva acentuada para o momento atual.`,
      );
    }

    // 4. Goal Alignment (max 20 pts)
    let goalScore = 0;
    if (template.goal === prefs.goal) {
      goalScore = 20;
      reasoning.push(
        `Alinhamento de objetivo: estruturado especificamente para ${this.translateGoal(prefs.goal)}.`,
      );
    } else if (
      prefs.goal === 'general_fitness' ||
      template.goal === 'general_fitness' ||
      (prefs.goal === 'hypertrophy' && template.goal === 'strength') ||
      (prefs.goal === 'strength' && template.goal === 'hypertrophy')
    ) {
      goalScore = 15;
      reasoning.push(
        `Objetivos complementares: estímulo promove ganhos mútuos de força e hipertrofia.`,
      );
    } else {
      goalScore = 10;
    }

    // Split preference bonus
    let splitBonus = 0;
    if (prefs.preferredSplit && prefs.preferredSplit !== 'any') {
      const splitMatches =
        (prefs.preferredSplit === 'full_body' && template.splitType === 'Full Body') ||
        (prefs.preferredSplit === 'upper_lower' && template.splitType === 'Upper / Lower') ||
        (prefs.preferredSplit === 'ppl' && template.splitType === 'Push / Pull / Legs');

      if (splitMatches) {
        splitBonus = 5;
        reasoning.push(
          `Combina com sua preferência pessoal de divisão (${builtinSplitLabel(template.splitType)}).`,
        );
      }
    }

    // Add Template-specific pros
    if (template.splitType === 'Full Body') {
      pros.push('Alta frequência semanal por grupo muscular (estímulo a cada 48h).');
      pros.push('Eficiente: menos idas à academia e excelente flexibilidade de rotina.');
      tradeoffs.push('Exige foco total em compostos e descanso adequado entre treinos.');
    } else if (template.splitType === 'Upper / Lower') {
      pros.push('Excelente balanço entre volume de trabalho e tempo de recuperação muscular.');
      pros.push('Permite treinar membros superiores e inferiores com máxima intensidade.');
      tradeoffs.push('Requer 4 dias de dedicação na semana.');
    } else if (template.splitType === 'Push / Pull / Legs') {
      pros.push('Isolamento cirúrgico de movimentos empurrar, puxar e pernas.');
      pros.push('Capacidade de gerar máximo volume hipertrófico para avançados.');
      tradeoffs.push('Compromisso exigente de 6 dias por semana na academia.');
    }

    const totalRaw = scheduleScore + durationScore + experienceScore + goalScore + splitBonus;
    const finalScore = Math.min(100, Math.max(0, Math.round(totalRaw)));

    return {
      template,
      compatibilityScore: finalScore,
      scoreBreakdown: {
        scheduleAlignment: scheduleScore,
        durationAlignment: durationScore,
        experienceAlignment: experienceScore,
        goalAlignment: goalScore,
      },
      matchReasoning: reasoning,
      pros,
      tradeoffs,
    };
  }

  private translateExperience(level: string): string {
    switch (level) {
      case 'beginner':
        return 'Iniciante';
      case 'intermediate':
        return 'Intermediário';
      case 'advanced':
        return 'Avançado';
      default:
        return level;
    }
  }

  private translateGoal(goal: string): string {
    switch (goal) {
      case 'hypertrophy':
        return 'Hipertrofia Muscular';
      case 'strength':
        return 'Ganhos de Força Bruta';
      case 'general_fitness':
        return 'Condicionamento & Saúde Geral';
      default:
        return goal;
    }
  }
}

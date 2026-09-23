import React, { useState, useEffect, useCallback } from 'react';
import { builtinExerciseName } from '../../data/builtin-display.js';
import { useNavigate } from 'react-router-dom';
import { IntelligenceAction } from '../intelligence/IntelligenceAction.js';
import { HelpAction } from '../intelligence/HelpAction.js';
import { aggregateEffort, progressSummary } from '../../intelligence/summaries.js';
import type { EntityId } from '../../domain/common/types.js';
import type {
  ExerciseProgressSummary,
  GlobalProgressMetrics,
} from '../../domain/analytics/index.js';
import type { PlateauReport } from '../../domain/analytics/types.js';
import { HistoryService, type TimeRangePreset } from '../../services/history-service.js';
import {
  Card,
  EmptyState,
  SimpleLineChart,
  ChartIcon,
  CalendarIcon,
  TrophyIcon,
  BoltIcon,
  DumbbellIcon,
} from '../../ui/components/index.js';
import { WeeklyReviewTab } from './WeeklyReviewTab.js';
import { MonthlyReviewTab } from './MonthlyReviewTab.js';

type MetricTab = 'CARGA' | 'E1RM' | 'VOLUME' | 'REPS';
type ProgressSection = 'EVOLUTION' | 'WEEKLY' | 'MONTHLY';

export const ProgressView: React.FC = () => {
  const navigate = useNavigate();
  const [historyService] = useState(() => new HistoryService());
  const [activeSection, setActiveSection] = useState<ProgressSection>('EVOLUTION');

  const [timeRange, setTimeRange] = useState<TimeRangePreset>('ALL');
  const [globalMetrics, setGlobalMetrics] = useState<GlobalProgressMetrics>({
    totalWorkouts: 0,
    totalVolumeKg: 0,
    totalReps: 0,
    totalSets: 0,
    totalActiveDurationMs: 0,
    averageDurationMinutes: 0,
    weeklyFrequency: 0,
    totalPRsCount: 0,
  });

  const [uniqueExercises, setUniqueExercises] = useState<{ id: EntityId; name: string }[]>([]);
  const [selectedExerciseId, setSelectedExerciseId] = useState<EntityId | null>(null);
  const [exerciseProgress, setExerciseProgress] = useState<ExerciseProgressSummary | null>(null);
  const [plateauReports, setPlateauReports] = useState<readonly PlateauReport[]>([]);
  const [activeMetricTab, setActiveMetricTab] = useState<MetricTab>('CARGA');
  const [isLoading, setIsLoading] = useState(true);

  // Load global metrics and available exercises
  const loadInitialData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [metrics, exercises, plateaus] = await Promise.all([
        historyService.getGlobalMetrics(timeRange),
        historyService.getUniqueExercises(),
        historyService.getPlateauReports(),
      ]);

      setGlobalMetrics(metrics);
      setUniqueExercises(exercises);
      setPlateauReports(plateaus);

      if (
        exercises.length > 0 &&
        (!selectedExerciseId || !exercises.some((e) => e.id === selectedExerciseId))
      ) {
        setSelectedExerciseId(exercises[0].id);
      }
    } catch (err) {
      console.error('Failed to load initial progress data', err);
    } finally {
      setIsLoading(false);
    }
  }, [historyService, timeRange, selectedExerciseId]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Load exercise-specific progress when selectedExerciseId or timeRange changes
  useEffect(() => {
    if (!selectedExerciseId) {
      setExerciseProgress(null);
      return;
    }

    let isMounted = true;
    historyService
      .getExerciseProgress(selectedExerciseId, timeRange)
      .then((summary) => {
        if (isMounted) {
          setExerciseProgress(summary);
        }
      })
      .catch((err) => console.error('Failed to load exercise progress', err));

    return () => {
      isMounted = false;
    };
  }, [historyService, selectedExerciseId, timeRange]);

  // Chart data mapping based on active metric tab
  const chartData = (exerciseProgress?.historyPoints ?? []).map((pt) => {
    const formattedDate = new Date(pt.date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
    });

    let value = 0;
    let subtitle = '';

    switch (activeMetricTab) {
      case 'CARGA':
        value = pt.maxWeightKg;
        subtitle = `${pt.workingSetsCount} séries`;
        break;
      case 'E1RM':
        value = pt.estimated1RM;
        subtitle = 'estimado via Epley';
        break;
      case 'VOLUME':
        value = pt.totalVolumeKg;
        subtitle = `${pt.maxReps} reps máx`;
        break;
      case 'REPS':
        value = pt.maxReps;
        subtitle = `com ${pt.maxWeightKg} kg`;
        break;
    }

    return {
      label: formattedDate,
      value,
      date: pt.date,
      isPR: pt.isPR,
      subtitle,
    };
  });

  const getMetricUnit = () => {
    switch (activeMetricTab) {
      case 'CARGA':
      case 'E1RM':
      case 'VOLUME':
        return 'kg';
      case 'REPS':
        return 'reps';
    }
  };

  if (!isLoading && uniqueExercises.length === 0 && globalMetrics.totalWorkouts === 0) {
    return (
      <div>
        <h2 style={{ fontFamily: 'var(--tita-font-display)' }}>Progresso e Recordes Pessoais</h2>
        <EmptyState
          title="Seu progresso começa com um treino"
          description="Registre sua primeira sessão para acompanhar cargas, frequência e recordes."
          action={{ label: 'Escolher treino', onClick: () => navigate('/routines') }}
        />
      </div>
    );
  }

  return (
    <div
      className="tita-progress-view"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--tita-space-5)',
        paddingBottom: 'var(--tita-space-8)',
        maxWidth: 'var(--tita-max-width-content)',
        margin: '0 auto',
        width: '100%',
      }}
    >
      {/* Title & Range Selector Header */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 'var(--tita-space-3)',
        }}
      >
        <div>
          <h2
            style={{
              fontFamily: 'var(--tita-font-display)',
              fontSize: 'clamp(1.5rem, 4vw, 2rem)',
              fontWeight: 'var(--tita-weight-bold)',
              letterSpacing: '0.02em',
              color: 'var(--tita-text)',
              margin: 0,
            }}
          >
            Progresso<span className="sr-only"> e Recordes Pessoais</span>
          </h2>
          <p
            className="tita-progress-subtitle"
            style={{
              fontSize: 'var(--tita-text-sm)',
              color: 'var(--tita-text-muted)',
              margin: 'var(--tita-space-1) 0 0 0',
            }}
          >
            Análise técnica de sobrecarga progressiva, volume de treino e marcas pessoais.
            <span className="sr-only">Métricas determinísticas calculadas localmente</span>
          </p>
        </div>

        {/* Time Range Selector */}
        <div
          style={{
            display: 'flex',
            backgroundColor: 'var(--tita-surface-1)',
            borderRadius: 'var(--tita-radius-pill)',
            padding: '3px',
            border: '1px solid var(--tita-border)',
            gap: '2px',
          }}
        >
          {(['1M', '3M', '6M', '1Y', 'ALL'] as TimeRangePreset[]).map((preset) => {
            const labels: Record<TimeRangePreset, string> = {
              '1M': '1M',
              '3M': '3M',
              '6M': '6M',
              '1Y': '1A',
              ALL: 'Tudo',
            };
            const isSelected = timeRange === preset;
            return (
              <button
                key={preset}
                type="button"
                aria-pressed={isSelected}
                aria-label={`Filtrar por período: ${labels[preset]}`}
                onClick={() => setTimeRange(preset)}
                style={{
                  padding: '0 14px',
                  minHeight: '44px',
                  borderRadius: 'var(--tita-radius-pill)',
                  border: 'none',
                  backgroundColor: isSelected ? 'var(--tita-primary)' : 'transparent',
                  color: isSelected ? 'var(--tita-primary-contrast)' : 'var(--tita-text-muted)',
                  fontSize: 'var(--tita-text-xs)',
                  fontWeight: isSelected ? 'var(--tita-weight-bold)' : 'var(--tita-weight-medium)',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease',
                }}
                data-testid={`time-range-${preset}`}
              >
                {labels[preset]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Section Navigation Tabs */}
      <div
        role="tablist"
        aria-label="Seções de Análise e Progresso"
        style={{
          display: 'flex',
          gap: 'var(--tita-space-2)',
          borderBottom: '1px solid var(--tita-border)',
          paddingBottom: 'var(--tita-space-2)',
          flexWrap: 'wrap',
        }}
      >
        {[
          { id: 'EVOLUTION', label: 'Evolução', icon: ChartIcon },
          { id: 'WEEKLY', label: 'Semanal', icon: CalendarIcon },
          { id: 'MONTHLY', label: 'Mensal', icon: CalendarIcon },
        ].map((tab) => {
          const isSelected = activeSection === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isSelected}
              type="button"
              onClick={() => setActiveSection(tab.id as ProgressSection)}
              style={{
                padding: 'var(--tita-space-2) var(--tita-space-4)',
                borderRadius: 'var(--tita-radius-md)',
                border: isSelected
                  ? '1px solid var(--tita-primary)'
                  : '1px solid var(--tita-border)',
                backgroundColor: isSelected ? 'var(--tita-primary)' : 'var(--tita-surface-1)',
                color: isSelected ? 'var(--tita-primary-contrast)' : 'var(--tita-text)',
                fontSize: 'var(--tita-text-sm)',
                fontWeight: isSelected ? 'var(--tita-weight-bold)' : 'var(--tita-weight-medium)',
                cursor: 'pointer',
                minHeight: '44px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 'var(--tita-space-2)',
                transition: 'all var(--tita-transition-fast)',
              }}
              data-testid={`tab-progress-${tab.id.toLowerCase()}`}
            >
              <Icon
                size={16}
                color={isSelected ? 'var(--tita-primary-contrast)' : 'var(--tita-primary)'}
              />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {activeSection === 'WEEKLY' && <WeeklyReviewTab historyService={historyService} />}
      {activeSection === 'MONTHLY' && <MonthlyReviewTab historyService={historyService} />}

      {activeSection === 'EVOLUTION' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--tita-space-4)' }}>
          {/* Global KPI Horizon Bar (Compact 2x2 Mobile / 4-Col Desktop) */}
          <div className="tita-progress-kpis">
            {/* KPI 1: Treinos Realizados */}
            <div className="tita-progress-kpi-item">
              <span className="tita-progress-kpi-label">Treinos Realizados</span>
              <div className="tita-progress-kpi-num" data-testid="global-total-workouts">
                {globalMetrics.totalWorkouts}
              </div>
              <span className="tita-progress-kpi-sub">Sessões no período</span>
            </div>

            {/* KPI 2: Volume Total (Hero Highlight) */}
            <div
              className="tita-progress-kpi-item"
              style={{ backgroundColor: 'rgba(245, 158, 11, 0.03)' }}
            >
              <span className="tita-progress-kpi-label" style={{ color: 'var(--tita-primary)' }}>
                Volume Total
              </span>
              <div
                className="tita-progress-kpi-num"
                style={{ color: 'var(--tita-primary)' }}
                data-testid="global-total-volume"
              >
                {globalMetrics.totalVolumeKg.toLocaleString('pt-BR')} kg
              </div>
              <span className="tita-progress-kpi-sub">Tonelagem acumulada</span>
            </div>

            {/* KPI 3: Frequência Semanal */}
            <div className="tita-progress-kpi-item">
              <span className="tita-progress-kpi-label">Frequência Semanal</span>
              <div className="tita-progress-kpi-num" data-testid="global-weekly-frequency">
                {globalMetrics.weeklyFrequency} / sem
              </div>
              <span className="tita-progress-kpi-sub">Média de sessões</span>
            </div>

            {/* KPI 4: Recordes Conquistados */}
            <div className="tita-progress-kpi-item">
              <span className="tita-progress-kpi-label">Recordes Superados</span>
              <div
                className="tita-progress-kpi-num"
                style={{
                  color: 'var(--tita-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--tita-space-2)',
                }}
                data-testid="global-total-prs"
              >
                <TrophyIcon size={20} color="var(--tita-primary)" />
                <span>{globalMetrics.totalPRsCount}</span>
              </div>
              <span className="tita-progress-kpi-sub">Novos PRs no período</span>
            </div>
          </div>

          {/* Per-Exercise Progression Arena */}
          {uniqueExercises.length > 0 ? (
            <div className="tita-progress-arena">
              {/* Main Chart Column */}
              <div
                className="tita-progress-chart-col"
                style={{ display: 'flex', flexDirection: 'column', gap: 'var(--tita-space-4)' }}
              >
                {/* Exercise Selector Bar */}
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 'var(--tita-space-3)',
                    backgroundColor: 'var(--tita-surface-1)',
                    padding: 'var(--tita-space-3) var(--tita-space-4)',
                    borderRadius: 'var(--tita-radius-md)',
                    border: '1px solid var(--tita-border)',
                  }}
                >
                  <div
                    style={{
                      flex: '1 1 240px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 'var(--tita-space-1)',
                    }}
                  >
                    <label
                      htmlFor="exercise-progress-select"
                      style={{
                        fontSize: '10px',
                        fontWeight: 'var(--tita-weight-bold)',
                        color: 'var(--tita-text-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                      }}
                    >
                      Exercício em Foco
                    </label>
                    <select
                      id="exercise-progress-select"
                      value={selectedExerciseId ?? ''}
                      onChange={(e) => setSelectedExerciseId(e.target.value)}
                      style={{
                        width: '100%',
                        minHeight: '44px',
                        padding: '0 var(--tita-space-3)',
                        borderRadius: 'var(--tita-radius-sm)',
                        border: '1px solid var(--tita-border)',
                        backgroundColor: 'var(--tita-surface-2)',
                        color: 'var(--tita-text)',
                        fontSize: 'var(--tita-text-sm)',
                        fontWeight: 'var(--tita-weight-semibold)',
                        outline: 'none',
                      }}
                      data-testid="exercise-progress-select"
                    >
                      {uniqueExercises.map((ex) => (
                        <option key={ex.id} value={ex.id}>
                          {builtinExerciseName(ex.id, ex.name)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Metric Tabs */}
                  <div
                    role="tablist"
                    aria-label="Métrica de evolução"
                    style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}
                  >
                    {[
                      { id: 'CARGA', label: 'Carga Máx' },
                      { id: 'E1RM', label: 'e1RM (Epley)' },
                      { id: 'VOLUME', label: 'Volume' },
                      { id: 'REPS', label: 'Reps Máx' },
                    ].map((tab) => {
                      const isSelected = activeMetricTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          role="tab"
                          aria-selected={isSelected}
                          type="button"
                          onClick={() => setActiveMetricTab(tab.id as MetricTab)}
                          style={{
                            padding: '0 var(--tita-space-3)',
                            minHeight: '44px',
                            borderRadius: 'var(--tita-radius-sm)',
                            border: isSelected
                              ? '1px solid var(--tita-primary)'
                              : '1px solid var(--tita-border)',
                            backgroundColor: isSelected
                              ? 'var(--tita-primary)'
                              : 'var(--tita-surface-2)',
                            color: isSelected ? 'var(--tita-primary-contrast)' : 'var(--tita-text)',
                            fontSize: 'var(--tita-text-xs)',
                            fontWeight: isSelected
                              ? 'var(--tita-weight-bold)'
                              : 'var(--tita-weight-medium)',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s ease',
                          }}
                          data-testid={`metric-tab-${tab.id.toLowerCase()}`}
                        >
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Dominant Chart Card */}
                <div
                  style={{
                    backgroundColor: 'var(--tita-surface)',
                    border: '1px solid var(--tita-border)',
                    borderRadius: 'var(--tita-radius-lg)',
                    padding: 'var(--tita-space-5)',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: 'var(--tita-space-3)',
                    }}
                  >
                    <div>
                      <h3
                        style={{
                          fontFamily: 'var(--tita-font-display)',
                          fontSize: 'var(--tita-text-2xl)',
                          fontWeight: 'var(--tita-weight-extrabold)',
                          color: 'var(--tita-text)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.02em',
                          margin: 0,
                        }}
                      >
                        {
                          {
                            CARGA: 'Carga máxima',
                            E1RM: '1RM estimado · Epley',
                            VOLUME: 'Volume por sessão',
                            REPS: 'Repetições máximas',
                          }[activeMetricTab]
                        }
                      </h3>
                      <span
                        style={{ fontSize: 'var(--tita-text-xs)', color: 'var(--tita-text-muted)' }}
                      >
                        {exerciseProgress?.totalSessions ?? 0} sessões registradas com esta marca
                      </span>
                    </div>
                  </div>

                  <div>
                    <SimpleLineChart
                      data={chartData}
                      unit={getMetricUnit()}
                      height={280}
                      ariaLabel={`Gráfico de evolução de ${exerciseProgress ? builtinExerciseName(exerciseProgress.exerciseId, exerciseProgress.exerciseName) : ''}`}
                    />
                  </div>

                  <HelpAction
                    key={`help-${selectedExerciseId}-${timeRange}-${activeMetricTab}`}
                    screen="progress"
                    getContext={() =>
                      exerciseProgress
                        ? {
                            ...progressSummary(
                              exerciseProgress,
                              globalMetrics,
                              timeRange,
                              plateauReports,
                            ),
                            data: {
                              ...progressSummary(
                                exerciseProgress,
                                globalMetrics,
                                timeRange,
                                plateauReports,
                              ).data,
                              metric: activeMetricTab,
                            },
                          }
                        : { version: 1, kind: 'progress', data: { period: timeRange } }
                    }
                  />
                  {exerciseProgress && (
                    <IntelligenceAction
                      key={`${selectedExerciseId}-${timeRange}`}
                      label="Analisar com Titã Intelligence"
                      getSummary={async () => {
                        const history = await historyService.getHistory({
                          pageSize: Number.MAX_SAFE_INTEGER,
                        });
                        const effort = aggregateEffort(
                          history.pagination.items,
                          exerciseProgress.exerciseId,
                          new Set(exerciseProgress.historyPoints.map((p) => p.snapshotId)),
                        );
                        return progressSummary(
                          exerciseProgress,
                          globalMetrics,
                          timeRange,
                          plateauReports,
                          effort,
                        );
                      }}
                    />
                  )}
                  {/* Visual Plateau Annotation & Recommendation Badge */}
                  {(() => {
                    const currentPlateau = plateauReports.find(
                      (p) => p.exerciseId === selectedExerciseId && p.exposuresCount >= 3,
                    );
                    if (!currentPlateau) return null;
                    return (
                      <div
                        style={{
                          marginTop: 'var(--tita-space-4)',
                          padding: 'var(--tita-space-3) var(--tita-space-4)',
                          backgroundColor: 'rgba(245, 158, 11, 0.08)',
                          border: '1px solid rgba(245, 158, 11, 0.25)',
                          borderRadius: 'var(--tita-radius-md)',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 'var(--tita-space-3)',
                        }}
                        data-testid="plateau-alert-card"
                      >
                        <div
                          style={{ color: 'var(--tita-warning)', fontSize: '20px', lineHeight: 1 }}
                        >
                          ⚠️
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 'var(--tita-space-2)',
                              flexWrap: 'wrap',
                            }}
                          >
                            <strong
                              style={{
                                color: 'var(--tita-warning)',
                                fontSize: 'var(--tita-text-sm)',
                              }}
                            >
                              Platô Identificado ({currentPlateau.exposuresCount} sessões
                              consecutivas)
                            </strong>
                            <span
                              style={{
                                fontSize: '10px',
                                backgroundColor: 'rgba(245, 158, 11, 0.2)',
                                color: 'var(--tita-warning)',
                                padding: '1px 6px',
                                borderRadius: 'var(--tita-radius-pill)',
                                fontWeight: 'var(--tita-weight-bold)',
                              }}
                            >
                              {currentPlateau.typeLabel}
                            </span>
                          </div>
                          <p
                            style={{
                              fontSize: 'var(--tita-text-xs)',
                              color: 'var(--tita-text-muted)',
                              margin: 0,
                            }}
                          >
                            {currentPlateau.reason ||
                              `A performance permaneceu constante em ${currentPlateau.currentValue} kg nas últimas ${currentPlateau.exposuresCount} sessões com esforço elevado.`}
                          </p>
                          <span
                            style={{
                              fontSize: '11px',
                              color: 'var(--tita-text-secondary)',
                              fontWeight: 'var(--tita-weight-medium)',
                            }}
                          >
                            💡{' '}
                            {currentPlateau.recommendation ||
                              'Considere um deload programado (-10% de carga por 1 semana) ou ajuste a faixa de repetições.'}
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* PR Showcase Column */}
              {exerciseProgress?.personalBests && (
                <div
                  className="tita-progress-prs-col"
                  style={{ display: 'flex', flexDirection: 'column', gap: 'var(--tita-space-3)' }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--tita-space-2)',
                      padding: '0 var(--tita-space-1)',
                    }}
                  >
                    <TrophyIcon size={18} color="var(--tita-primary)" />
                    <h3
                      style={{
                        fontFamily: 'var(--tita-font-display)',
                        fontSize: 'var(--tita-text-base)',
                        fontWeight: 'var(--tita-weight-bold)',
                        color: 'var(--tita-text)',
                        margin: 0,
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                      }}
                    >
                      Recordes Pessoais
                    </h3>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr',
                      gap: 'var(--tita-space-2)',
                    }}
                  >
                    {/* PR 1: Maior Carga */}
                    <div
                      style={{
                        backgroundColor: 'var(--tita-surface-2)',
                        border: '1px solid var(--tita-border)',
                        borderRadius: 'var(--tita-radius-md)',
                        padding: 'var(--tita-space-3) var(--tita-space-4)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '10px',
                          color: 'var(--tita-text-muted)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          fontWeight: 'var(--tita-weight-bold)',
                        }}
                      >
                        Maior Carga Levantada
                      </span>
                      <div
                        style={{
                          fontFamily: 'var(--tita-font-display)',
                          fontSize: 'var(--tita-text-2xl)',
                          fontWeight: 'var(--tita-weight-extrabold)',
                          color: 'var(--tita-text)',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {exerciseProgress.personalBests.heaviestWeightKg > 0
                          ? `${exerciseProgress.personalBests.heaviestWeightKg} kg`
                          : '—'}
                      </div>
                      {exerciseProgress.personalBests.heaviestWeightDate && (
                        <div style={{ fontSize: '10px', color: 'var(--tita-text-muted)' }}>
                          Em{' '}
                          {new Date(
                            exerciseProgress.personalBests.heaviestWeightDate,
                          ).toLocaleDateString('pt-BR')}
                        </div>
                      )}
                    </div>

                    {/* PR 2: e1RM Epley */}
                    <div
                      style={{
                        backgroundColor: 'var(--tita-surface-2)',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                        borderRadius: 'var(--tita-radius-md)',
                        padding: 'var(--tita-space-3) var(--tita-space-4)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                        boxShadow: '0 0 12px rgba(245, 158, 11, 0.08)',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '10px',
                          color: 'var(--tita-primary)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          fontWeight: 'var(--tita-weight-bold)',
                        }}
                      >
                        Melhor e1RM Estimado (Epley)
                      </span>
                      <div
                        style={{
                          fontFamily: 'var(--tita-font-display)',
                          fontSize: 'var(--tita-text-2xl)',
                          fontWeight: 'var(--tita-weight-extrabold)',
                          color: 'var(--tita-primary)',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {exerciseProgress.personalBests.bestE1RMKg > 0
                          ? `${exerciseProgress.personalBests.bestE1RMKg} kg`
                          : '—'}
                      </div>
                      {exerciseProgress.personalBests.bestE1RMDate && (
                        <div style={{ fontSize: '10px', color: 'var(--tita-text-muted)' }}>
                          Em{' '}
                          {new Date(exerciseProgress.personalBests.bestE1RMDate).toLocaleDateString(
                            'pt-BR',
                          )}
                        </div>
                      )}
                    </div>

                    {/* PR 3: Melhor Série em Volume */}
                    <div
                      style={{
                        backgroundColor: 'var(--tita-surface-2)',
                        border: '1px solid var(--tita-border)',
                        borderRadius: 'var(--tita-radius-md)',
                        padding: 'var(--tita-space-3) var(--tita-space-4)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '10px',
                          color: 'var(--tita-text-muted)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          fontWeight: 'var(--tita-weight-bold)',
                        }}
                      >
                        Melhor Série em Volume
                      </span>
                      <div
                        style={{
                          fontFamily: 'var(--tita-font-display)',
                          fontSize: 'var(--tita-text-2xl)',
                          fontWeight: 'var(--tita-weight-extrabold)',
                          color: 'var(--tita-text)',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {exerciseProgress.personalBests.bestSetVolumeKg > 0
                          ? `${exerciseProgress.personalBests.bestSetVolumeKg} kg`
                          : '—'}
                      </div>
                      {exerciseProgress.personalBests.bestSetVolumeDate && (
                        <div style={{ fontSize: '10px', color: 'var(--tita-text-muted)' }}>
                          Em{' '}
                          {new Date(
                            exerciseProgress.personalBests.bestSetVolumeDate,
                          ).toLocaleDateString('pt-BR')}
                        </div>
                      )}
                    </div>

                    {/* PR 4: Mais Repetições */}
                    <div
                      style={{
                        backgroundColor: 'var(--tita-surface-2)',
                        border: '1px solid var(--tita-border)',
                        borderRadius: 'var(--tita-radius-md)',
                        padding: 'var(--tita-space-3) var(--tita-space-4)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '10px',
                          color: 'var(--tita-text-muted)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          fontWeight: 'var(--tita-weight-bold)',
                        }}
                      >
                        Mais Reps em Carga
                      </span>
                      <div
                        style={{
                          fontFamily: 'var(--tita-font-display)',
                          fontSize: 'var(--tita-text-xl)',
                          fontWeight: 'var(--tita-weight-extrabold)',
                          color: 'var(--tita-primary)',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {exerciseProgress.personalBests.mostRepsAtWeight
                          ? `${exerciseProgress.personalBests.mostRepsAtWeight.reps} reps @ ${exerciseProgress.personalBests.mostRepsAtWeight.weightKg} kg`
                          : '—'}
                      </div>
                      {exerciseProgress.personalBests.mostRepsAtWeight?.date && (
                        <div style={{ fontSize: '10px', color: 'var(--tita-text-muted)' }}>
                          Em{' '}
                          {new Date(
                            exerciseProgress.personalBests.mostRepsAtWeight.date,
                          ).toLocaleDateString('pt-BR')}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <EmptyState
              title="Sem dados de exercícios para exibir"
              description="Finalize um treino contendo exercícios para começar a visualizar suas curvas de progressão e recordes pessoais."
            />
          )}
        </div>
      )}

      <style>{`
        .tita-progress-kpis {
          display: grid;
          background-color: var(--tita-surface);
          border: 1px solid var(--tita-border);
          border-radius: var(--tita-radius-lg);
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        }
        .tita-progress-kpi-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .tita-progress-kpi-label {
          font-size: 11px;
          color: var(--tita-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.04em;
          font-weight: var(--tita-weight-bold);
        }
        .tita-progress-kpi-num {
          font-family: var(--tita-font-display);
          font-weight: var(--tita-weight-extrabold);
          color: var(--tita-text);
          font-variant-numeric: tabular-nums;
          line-height: 1.1;
        }
        .tita-progress-kpi-sub {
          font-size: 11px;
          color: var(--tita-text-subtle);
        }
        @media (min-width: 769px) {
          .tita-progress-kpis {
            grid-template-columns: repeat(4, 1fr) !important;
          }
          .tita-progress-kpi-item {
            padding: var(--tita-space-4) var(--tita-space-5);
            border-right: 1px solid var(--tita-border);
          }
          .tita-progress-kpi-item:last-child {
            border-right: none;
          }
          .tita-progress-kpi-num {
            font-size: 2.25rem !important;
          }
        }
        @media (max-width: 768px) {
          .tita-progress-kpis {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          .tita-progress-kpi-item {
            padding: 8px 12px !important;
            border-right: 1px solid var(--tita-border);
            border-bottom: 1px solid var(--tita-border);
          }
          .tita-progress-kpi-item:nth-child(2n) {
            border-right: none !important;
          }
          .tita-progress-kpi-item:nth-child(3),
          .tita-progress-kpi-item:nth-child(4) {
            border-bottom: none !important;
          }
          .tita-progress-kpi-num {
            font-size: 1.35rem !important;
          }
          .tita-progress-kpi-label {
            font-size: 10px !important;
          }
          .tita-progress-kpi-sub {
            display: none !important;
          }
          .tita-progress-subtitle {
            display: none !important;
          }
        }

        @media (min-width: 1025px) {
          .tita-progress-arena {
            display: grid !important;
            grid-template-columns: 1fr 340px !important;
            gap: var(--tita-space-6) !important;
            align-items: start !important;
          }
        }
        @media (max-width: 1024px) {
          .tita-progress-arena {
            display: flex !important;
            flex-direction: column !important;
            gap: var(--tita-space-4) !important;
          }
        }
      `}</style>
    </div>
  );
};

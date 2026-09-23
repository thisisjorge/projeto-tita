import React, { useState, useEffect, useCallback } from 'react';
import { builtinExerciseName } from '../../data/builtin-display.js';
import { useNavigate } from 'react-router-dom';
import type { WorkoutSnapshot } from '../../domain/entities/workout-snapshot.js';
import type { MonthlyWorkoutGroup, PaginatedResult } from '../../domain/analytics/index.js';
import { HistoryService } from '../../services/history-service.js';
import {
  Button,
  Card,
  EmptyState,
  Field,
  CalendarIcon,
  SearchIcon,
  ArrowRightIcon,
  TimerIcon,
} from '../../ui/components/index.js';
import { WorkoutSessionDetailDialog } from './WorkoutSessionDetailDialog.js';

export const HistoryView: React.FC = () => {
  const navigate = useNavigate();
  const [historyService] = useState(() => new HistoryService());
  const [groups, setGroups] = useState<readonly MonthlyWorkoutGroup[]>([]);
  const [pagination, setPagination] = useState<PaginatedResult<WorkoutSnapshot>>({
    items: [],
    page: 1,
    pageSize: 10,
    totalItems: 0,
    totalPages: 1,
  });

  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<'ALL' | '30D' | '90D' | 'YEAR'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  // Detail dialog state & Desktop Inspector state
  const [selectedSnapshot, setSelectedSnapshot] = useState<WorkoutSnapshot | null>(null);
  const [inspectedSnapshot, setInspectedSnapshot] = useState<WorkoutSnapshot | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const loadHistory = useCallback(async () => {
    try {
      setIsLoading(true);

      let startDate: string | undefined;
      const now = new Date();
      if (dateFilter === '30D') {
        const d = new Date(now);
        d.setDate(d.getDate() - 30);
        startDate = d.toISOString();
      } else if (dateFilter === '90D') {
        const d = new Date(now);
        d.setDate(d.getDate() - 90);
        startDate = d.toISOString();
      } else if (dateFilter === 'YEAR') {
        const d = new Date(now.getFullYear(), 0, 1);
        startDate = d.toISOString();
      }

      const result = await historyService.getHistory({
        page: currentPage,
        pageSize: 10,
        search,
        startDate,
      });

      setGroups(result.groups);
      setPagination(result.pagination);

      // Auto-select first snapshot for desktop inspector if none selected
      if (result.groups.length > 0 && result.groups[0].snapshots.length > 0) {
        setInspectedSnapshot((prev) => prev ?? result.groups[0].snapshots[0]);
      }
    } catch (err) {
      console.error('Failed to load history', err);
    } finally {
      setIsLoading(false);
    }
  }, [historyService, currentPage, search, dateFilter]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleOpenDetail = (snapshot: WorkoutSnapshot) => {
    setSelectedSnapshot(snapshot);
    setInspectedSnapshot(snapshot);
    setIsDetailOpen(true);
  };

  const handleDeleteSnapshot = async (id: string) => {
    await historyService.deleteSnapshot(id);
    setInspectedSnapshot(null);
    await loadHistory();
  };

  return (
    <div
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
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 'var(--tita-space-3)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--tita-space-2)' }}>
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
              Histórico de Treinos
            </h2>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '2px 8px',
                borderRadius: 'var(--tita-radius-pill)',
                fontSize: 'var(--tita-text-xs)',
                fontWeight: 'var(--tita-weight-bold)',
                backgroundColor: 'rgba(245, 158, 11, 0.12)',
                color: 'var(--tita-primary)',
                border: '1px solid rgba(245, 158, 11, 0.25)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {pagination.totalItems} {pagination.totalItems === 1 ? 'treino' : 'treinos'}
            </span>
          </div>
          <p
            style={{
              fontSize: 'var(--tita-text-sm)',
              color: 'var(--tita-text-muted)',
              margin: 'var(--tita-space-1) 0 0 0',
            }}
          >
            Registro cronológico das suas sessões de treino concluídas e snapshots salvos.
            <span className="sr-only">Snapshots imutáveis</span>
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      {(pagination.totalItems > 0 || search !== '' || dateFilter !== 'ALL') && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 'var(--tita-space-3)',
            alignItems: 'center',
            backgroundColor: 'var(--tita-surface-1)',
            padding: 'var(--tita-space-3)',
            borderRadius: 'var(--tita-radius-md)',
            border: '1px solid var(--tita-border)',
          }}
        >
          <div style={{ flex: '1 1 250px' }}>
            <Field
              label="Buscar no Histórico"
              hideLabel
              type="text"
              placeholder="Buscar por título, exercício ou nota..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              data-testid="search-history-input"
            />
          </div>

          {/* Date Filter Pills */}
          <div style={{ display: 'flex', gap: 'var(--tita-space-2)', flexWrap: 'wrap' }}>
            {[
              { id: 'ALL', label: 'Todos' },
              { id: '30D', label: '30 Dias' },
              { id: '90D', label: '90 Dias' },
              { id: 'YEAR', label: 'Este Ano' },
            ].map((pill) => {
              const isSelected = dateFilter === pill.id;
              return (
                <button
                  key={pill.id}
                  type="button"
                  aria-pressed={isSelected}
                  aria-label={`Filtrar por período: ${pill.label}`}
                  onClick={() => {
                    setDateFilter(pill.id as typeof dateFilter);
                    setCurrentPage(1);
                  }}
                  style={{
                    padding: '0 var(--tita-space-3)',
                    minHeight: '44px',
                    borderRadius: 'var(--tita-radius-pill)',
                    border: isSelected
                      ? '1px solid var(--tita-primary)'
                      : '1px solid var(--tita-border)',
                    backgroundColor: isSelected ? 'var(--tita-primary)' : 'var(--tita-surface-2)',
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
                >
                  {pill.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
      {/* History Monthly Groups */}
      {isLoading ? (
        <div
          style={{
            padding: 'var(--tita-space-8)',
            textAlign: 'center',
            color: 'var(--tita-text-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 'var(--tita-space-3)',
          }}
        >
          <div
            style={{
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              border: '2px solid var(--tita-primary)',
              borderTopColor: 'transparent',
              animation: 'spin 0.8s linear infinite',
            }}
          />
          <span>Carregando histórico...</span>
        </div>
      ) : groups.length > 0 ? (
        <div className="tita-history-workstation">
          {/* Left Column: Monthly Session List */}
          <div
            className="tita-history-list-col"
            style={{ display: 'flex', flexDirection: 'column', gap: 'var(--tita-space-5)' }}
          >
            {groups.map((group) => (
              <div
                key={group.monthKey}
                style={{ display: 'flex', flexDirection: 'column', gap: 'var(--tita-space-3)' }}
              >
                {/* Monthly Header */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--tita-space-2)',
                    paddingLeft: 'var(--tita-space-1)',
                  }}
                >
                  <CalendarIcon size={16} color="var(--tita-primary)" />
                  <span
                    style={{
                      fontFamily: 'var(--tita-font-display)',
                      fontSize: 'var(--tita-text-base)',
                      fontWeight: 'var(--tita-weight-bold)',
                      color: 'var(--tita-primary)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {group.monthLabel}
                  </span>
                  <span
                    style={{
                      fontSize: 'var(--tita-text-xs)',
                      color: 'var(--tita-text-muted)',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    ({group.snapshots.length} {group.snapshots.length === 1 ? 'sessão' : 'sessões'})
                  </span>
                </div>

                {/* Workout Cards in this Month */}
                <div
                  style={{ display: 'flex', flexDirection: 'column', gap: 'var(--tita-space-3)' }}
                >
                  {group.snapshots.map((session) => {
                    const durationMin = Math.round(session.activeDurationMs / 60000);
                    const sessionDate = new Date(session.completedAt).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    });
                    const isSelected = inspectedSnapshot?.id === session.id;

                    return (
                      <div
                        key={session.id}
                        onClick={() => {
                          setInspectedSnapshot(session);
                          if (typeof window !== 'undefined' && window.innerWidth < 1025) {
                            handleOpenDetail(session);
                          }
                        }}
                        style={{
                          cursor: 'pointer',
                          borderRadius: 'var(--tita-radius-md)',
                          border: isSelected
                            ? '1px solid var(--tita-primary)'
                            : '1px solid var(--tita-border)',
                          backgroundColor: isSelected
                            ? 'rgba(16, 185, 129, 0.05)'
                            : 'var(--tita-surface)',
                          boxShadow: isSelected ? '0 0 16px rgba(16, 185, 129, 0.15)' : 'none',
                          padding: '12px 14px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                          transition: 'all 0.15s ease',
                        }}
                        data-testid={`history-session-card-${session.id}`}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 'var(--tita-space-2)',
                          }}
                        >
                          <span
                            style={{
                              fontSize: 'var(--tita-text-base)',
                              fontWeight: 'var(--tita-weight-bold)',
                              color: 'var(--tita-text)',
                              lineHeight: 1.2,
                            }}
                          >
                            {session.title}
                          </span>
                          <button
                            type="button"
                            aria-label={`Ver detalhes de ${session.title}, ${sessionDate}`}
                            data-testid="history-session-detail-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDetail(session);
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '4px 8px',
                              borderRadius: 'var(--tita-radius-sm)',
                              border: 'none',
                              backgroundColor: 'transparent',
                              color: isSelected ? 'var(--tita-primary)' : 'var(--tita-primary)',
                              fontSize: 'var(--tita-text-xs)',
                              fontWeight: 'var(--tita-weight-semibold)',
                              cursor: 'pointer',
                              minHeight: '44px',
                            }}
                          >
                            <span>Ver Detalhes →</span>
                          </button>
                        </div>

                        <div
                          style={{
                            fontSize: 'var(--tita-text-xs)',
                            color: 'var(--tita-text-muted)',
                            lineHeight: 1,
                          }}
                        >
                          {sessionDate} • {durationMin > 0 ? `${durationMin} min` : '< 1 min'} •{' '}
                          {session.completedSetsCount} séries
                        </div>

                        <div
                          style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '6px',
                            alignItems: 'center',
                            marginTop: '2px',
                          }}
                        >
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              backgroundColor: 'var(--tita-surface-2)',
                              padding: '2px 8px',
                              borderRadius: 'var(--tita-radius-sm)',
                              border: '1px solid var(--tita-border)',
                              fontSize: '11px',
                            }}
                          >
                            <span style={{ color: 'var(--tita-text-muted)' }}>Volume:</span>
                            <strong
                              style={{
                                color: 'var(--tita-text)',
                                fontVariantNumeric: 'tabular-nums',
                              }}
                            >
                              {session.totalVolumeKg} kg
                            </strong>
                          </div>

                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              backgroundColor: 'var(--tita-surface-2)',
                              padding: '2px 8px',
                              borderRadius: 'var(--tita-radius-sm)',
                              border: '1px solid var(--tita-border)',
                              fontSize: '11px',
                            }}
                          >
                            <span style={{ color: 'var(--tita-text-muted)' }}>Exercícios:</span>
                            <strong
                              style={{
                                color: 'var(--tita-text)',
                                fontVariantNumeric: 'tabular-nums',
                              }}
                            >
                              {session.exercises.length}
                            </strong>
                          </div>

                          {session.notes && (
                            <span
                              style={{
                                color: 'var(--tita-text-muted)',
                                fontStyle: 'italic',
                                maxWidth: '200px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                fontSize: '11px',
                              }}
                            >
                              "{session.notes}"
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: 'var(--tita-space-3) 0',
                  borderTop: '1px solid var(--tita-border)',
                }}
              >
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  style={{ minHeight: '44px' }}
                >
                  ← Anterior
                </Button>
                <span
                  style={{
                    fontSize: 'var(--tita-text-xs)',
                    color: 'var(--tita-text-muted)',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  Página {pagination.page} de {pagination.totalPages}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={currentPage >= pagination.totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                  style={{ minHeight: '44px' }}
                >
                  Próxima →
                </Button>
              </div>
            )}
          </div>

          {/* Right Column: Desktop Interactive Session Inspector Panel */}
          <div
            className="tita-history-inspector-col"
            style={{
              display: 'none',
              flexDirection: 'column',
              gap: 'var(--tita-space-4)',
              backgroundColor: 'var(--tita-surface)',
              border: '1px solid var(--tita-border)',
              borderRadius: 'var(--tita-radius-lg)',
              padding: 'var(--tita-space-5)',
              position: 'sticky',
              top: 'var(--tita-space-4)',
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.3)',
            }}
          >
            {inspectedSnapshot ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--tita-space-4)' }}>
                {/* Header with Title & Date */}
                <div
                  style={{
                    borderBottom: '1px solid var(--tita-border)',
                    paddingBottom: 'var(--tita-space-3)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 'var(--tita-weight-bold)',
                        color: 'var(--tita-primary)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                      }}
                    >
                      // Inspetor de Sessão
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleOpenDetail(inspectedSnapshot)}
                      style={{ fontSize: '12px', minHeight: '36px' }}
                    >
                      Ver Detalhes ↗
                    </Button>
                  </div>
                  <h3
                    style={{
                      fontFamily: 'var(--tita-font-display)',
                      fontSize: 'var(--tita-text-2xl)',
                      fontWeight: 'var(--tita-weight-extrabold)',
                      color: 'var(--tita-text)',
                      margin: 'var(--tita-space-1) 0',
                      textTransform: 'uppercase',
                      letterSpacing: '0.02em',
                    }}
                  >
                    {inspectedSnapshot.title}
                  </h3>
                  <div style={{ fontSize: 'var(--tita-text-xs)', color: 'var(--tita-text-muted)' }}>
                    Realizado em {new Date(inspectedSnapshot.completedAt).toLocaleString('pt-BR')}
                  </div>
                </div>

                {/* Metrics Pill Grid */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 'var(--tita-space-2)',
                  }}
                >
                  <div
                    style={{
                      backgroundColor: 'var(--tita-surface-2)',
                      padding: 'var(--tita-space-3)',
                      borderRadius: 'var(--tita-radius-sm)',
                      textAlign: 'center',
                      border: '1px solid var(--tita-border)',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '10px',
                        color: 'var(--tita-text-muted)',
                        textTransform: 'uppercase',
                      }}
                    >
                      Volume
                    </div>
                    <strong
                      style={{
                        fontFamily: 'var(--tita-font-display)',
                        fontSize: 'var(--tita-text-xl)',
                        color: 'var(--tita-primary)',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {inspectedSnapshot.totalVolumeKg} kg
                    </strong>
                  </div>

                  <div
                    style={{
                      backgroundColor: 'var(--tita-surface-2)',
                      padding: 'var(--tita-space-3)',
                      borderRadius: 'var(--tita-radius-sm)',
                      textAlign: 'center',
                      border: '1px solid var(--tita-border)',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '10px',
                        color: 'var(--tita-text-muted)',
                        textTransform: 'uppercase',
                      }}
                    >
                      Séries
                    </div>
                    <strong
                      style={{
                        fontFamily: 'var(--tita-font-display)',
                        fontSize: 'var(--tita-text-xl)',
                        color: 'var(--tita-text)',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {inspectedSnapshot.completedSetsCount}
                    </strong>
                  </div>

                  <div
                    style={{
                      backgroundColor: 'var(--tita-surface-2)',
                      padding: 'var(--tita-space-3)',
                      borderRadius: 'var(--tita-radius-sm)',
                      textAlign: 'center',
                      border: '1px solid var(--tita-border)',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '10px',
                        color: 'var(--tita-text-muted)',
                        textTransform: 'uppercase',
                      }}
                    >
                      Duração
                    </div>
                    <strong
                      style={{
                        fontFamily: 'var(--tita-font-display)',
                        fontSize: 'var(--tita-text-xl)',
                        color: 'var(--tita-text)',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {Math.round(inspectedSnapshot.activeDurationMs / 60000)}m
                    </strong>
                  </div>
                </div>

                {/* Exercises & Sets Breakdown */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--tita-space-3)',
                    maxHeight: '420px',
                    overflowY: 'auto',
                  }}
                >
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 'var(--tita-weight-bold)',
                      color: 'var(--tita-text-subtle)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    Exercícios Executados ({inspectedSnapshot.exercises.length})
                  </span>
                  {inspectedSnapshot.exercises.map((ex, exIdx) => (
                    <div
                      key={ex.exerciseId + exIdx}
                      style={{
                        backgroundColor: 'var(--tita-surface-2)',
                        border: '1px solid var(--tita-border)',
                        borderRadius: 'var(--tita-radius-sm)',
                        padding: 'var(--tita-space-3)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 'var(--tita-space-2)',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <span
                          style={{
                            fontWeight: 'var(--tita-weight-bold)',
                            fontSize: 'var(--tita-text-sm)',
                            color: 'var(--tita-text)',
                          }}
                        >
                          {builtinExerciseName(ex.exerciseId, ex.exerciseName)}
                        </span>
                        <span
                          style={{
                            fontSize: '11px',
                            color: 'var(--tita-primary)',
                            fontWeight: 'bold',
                          }}
                        >
                          {ex.sets.filter((s) => s.completed).length} séries
                        </span>
                      </div>

                      {/* Set pills */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {ex.sets.map((st, stIdx) => (
                          <span
                            key={st.id || stIdx}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '2px 8px',
                              borderRadius: 'var(--tita-radius-xs)',
                              backgroundColor: st.completed
                                ? 'rgba(245, 158, 11, 0.12)'
                                : 'var(--tita-surface-1)',
                              border: st.completed
                                ? '1px solid rgba(245, 158, 11, 0.3)'
                                : '1px solid var(--tita-border)',
                              fontSize: '11px',
                              color: st.completed ? 'var(--tita-text)' : 'var(--tita-text-muted)',
                              fontVariantNumeric: 'tabular-nums',
                            }}
                          >
                            <span style={{ color: 'var(--tita-primary)', fontWeight: 'bold' }}>
                              #{stIdx + 1}
                            </span>
                            <span>
                              {st.weight}kg × {st.reps}
                            </span>
                            {st.completed && <span style={{ color: 'var(--tita-accent)' }}>✓</span>}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div
                style={{
                  padding: 'var(--tita-space-8)',
                  textAlign: 'center',
                  color: 'var(--tita-text-muted)',
                  fontSize: 'var(--tita-text-sm)',
                }}
              >
                Selecione um treino ao lado para visualizar a análise completa.
              </div>
            )}
          </div>
        </div>
      ) : (
        <EmptyState
          title="Nenhum treino no histórico"
          description={
            search || dateFilter !== 'ALL'
              ? 'Nenhum treino encontrado para os filtros selecionados.'
              : 'Conclua sua primeira sessão de treino para começar a registrar seu histórico e evolução.'
          }
          action={
            search || dateFilter !== 'ALL'
              ? {
                  label: 'Limpar Filtros',
                  onClick: () => {
                    setSearch('');
                    setDateFilter('ALL');
                    setCurrentPage(1);
                  },
                }
              : { label: 'Escolher treino', onClick: () => navigate('/routines') }
          }
        />
      )}

      {/* Session Detail Dialog */}
      <WorkoutSessionDetailDialog
        snapshot={selectedSnapshot}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onDelete={handleDeleteSnapshot}
      />

      <style>{`
        @media (min-width: 1025px) {
          .tita-history-workstation {
            display: grid !important;
            grid-template-columns: 460px 1fr !important;
            gap: var(--tita-space-6) !important;
            align-items: start !important;
          }
          .tita-history-inspector-col {
            display: flex !important;
          }
        }
      `}</style>
    </div>
  );
};

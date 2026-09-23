import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { IntelligenceAction } from '../intelligence/IntelligenceAction.js';
import { HelpAction } from '../intelligence/HelpAction.js';
import { routineSummary } from '../../intelligence/summaries.js';
import type { Routine } from '../../domain/entities/routine.js';
import type { Program } from '../../domain/entities/program.js';
import { ProgressionStrategyType } from '../../domain/enums/progression-strategy-type.js';
import { RoutineService } from '../../services/routine-service.js';
import { TemplateService } from '../../services/template-service.js';
import { ExerciseLibraryService } from '../../services/exercise-library-service.js';
import { builtinRoutineName } from '../../data/builtin-display.js';
import { IdbProgramRepository } from '../../repositories/indexeddb/idb-program-repository.js';
import { ActiveWorkoutService } from '../../services/active-workout-service.js';
import { getAppDatabase } from '../../services/db-provider.js';
import { generateId } from '../../domain/common/id.js';
import {
  exportProgramToShareableJson,
  importShareableProgram,
  validateShareableProgram,
} from '../../backup/program-sharing.js';
import { fileShareAdapter } from '../../platform/index.js';
import {
  Card,
  Button,
  EmptyState,
  PlusIcon,
  CompassIcon,
  ClipboardIcon,
  DumbbellIcon,
  DownloadIcon,
  UploadIcon,
} from '../../ui/components/index.js';
import { RoutineEditorDialog } from './RoutineEditorDialog.js';
import { TemplateBrowserDialog } from './TemplateBrowserDialog.js';
import { DiscoveryWizardDialog } from './DiscoveryWizardDialog.js';

export const RoutinesView: React.FC = () => {
  const navigate = useNavigate();

  const routineService = useMemo(() => new RoutineService(), []);
  const templateService = useMemo(() => new TemplateService(), []);
  const libraryService = useMemo(() => new ExerciseLibraryService(), []);

  const [routines, setRoutines] = useState<Routine[]>([]);
  const [templateRefs, setTemplateRefs] = useState<Record<string, string>>({});
  const [exercisesMap, setExercisesMap] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
  const [isLoading, setIsLoading] = useState(true);

  // Dialog controls
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [routineToEdit, setRoutineToEdit] = useState<Routine | null>(null);
  const [isTemplateBrowserOpen, setIsTemplateBrowserOpen] = useState(false);
  const [isDiscoveryOpen, setIsDiscoveryOpen] = useState(false);
  const [startingRoutineId, setStartingRoutineId] = useState<string | null>(null);
  const [shareNotice, setShareNotice] = useState<string | null>(null);
  const importFileInputRef = useRef<HTMLInputElement>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      await libraryService.initialize();
      const allEx = await libraryService.getExercises();
      const exMap: Record<string, string> = {};
      for (const ex of allEx) {
        exMap[ex.id] = ex.name;
      }
      setExercisesMap(exMap);

      const list = await routineService.getRoutines({
        includeArchived: activeTab === 'archived',
      });
      const programs = await new IdbProgramRepository(getAppDatabase()).getAll();
      setTemplateRefs(
        Object.fromEntries(
          programs
            .filter((program) => program.templateRef)
            .map((program) => [program.id, program.templateRef!]),
        ),
      );

      if (activeTab === 'archived') {
        setRoutines(list.filter((r) => Boolean(r.deletedAt)));
      } else {
        setRoutines(list.filter((r) => !r.deletedAt));
      }
    } catch (err) {
      console.error('Erro ao carregar rotinas:', err);
    } finally {
      setIsLoading(false);
    }
  }, [routineService, libraryService, activeTab]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handlers
  const handleOpenCreate = () => {
    setRoutineToEdit(null);
    setIsEditorOpen(true);
  };

  const handleOpenEdit = (routine: Routine) => {
    setRoutineToEdit(routine);
    setIsEditorOpen(true);
  };

  const handleDuplicate = async (routine: Routine) => {
    try {
      await routineService.duplicateRoutine(routine.id);
      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao duplicar rotina.');
    }
  };

  const handleArchive = async (routine: Routine) => {
    try {
      await routineService.archiveRoutine(routine.id);
      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao arquivar rotina.');
    }
  };

  const handleRestore = async (routine: Routine) => {
    try {
      await routineService.restoreRoutine(routine.id);
      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao restaurar rotina.');
    }
  };

  const handleDeletePermanently = async (routine: Routine) => {
    if (
      window.confirm(`Tem certeza que deseja excluir permanentemente a rotina "${routine.name}"?`)
    ) {
      try {
        await routineService.deleteRoutine(routine.id);
        loadData();
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Erro ao excluir rotina.');
      }
    }
  };

  const handleExportRoutine = async (routine: Routine) => {
    try {
      const allExercises = await libraryService.getExercises();
      const now = new Date().toISOString();
      const programId = generateId('prog');
      const programWrapper: Program = {
        id: programId,
        schemaVersion: 1,
        createdAt: now,
        updatedAt: now,
        name: routine.name,
        description: routine.notes ?? 'Ficha de treino',
        progressionStrategy:
          routine.defaultProgressionStrategy ?? ProgressionStrategyType.DOUBLE_PROGRESSION,
        durationWeeks: 4,
        daysPerWeek: 1,
        active: true,
        weeks: [
          {
            id: generateId('week'),
            programId,
            schemaVersion: 1,
            createdAt: now,
            updatedAt: now,
            weekNumber: 1,
            routineIds: [routine.id],
          },
        ],
      };
      const json = exportProgramToShareableJson(programWrapper, [routine], allExercises, '1.0.0');
      const blob = new Blob([json], { type: 'application/json' });
      const slug =
        routine.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '') || 'ficha';
      const fileName = `${slug}-ficha.json`;
      const result = await fileShareAdapter.shareFile({
        fileName,
        blob,
        text: `Ficha de Treino: ${routine.name}`,
      });
      if (result.method !== 'native-share' && result.method !== 'web-share') {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
      }
      setShareNotice(`Ficha "${routine.name}" exportada com sucesso!`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao exportar ficha.');
    }
  };

  const handleImportRoutineFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const validation = validateShareableProgram(text);
      if (!validation.valid || !validation.shareable) {
        alert(`Arquivo de ficha inválido: ${validation.errors.join(', ')}`);
        return;
      }
      const db = getAppDatabase();
      if (!db.isOpen()) await db.open();
      const result = await importShareableProgram(db, validation.shareable);
      await loadData();
      setShareNotice(
        `Ficha importada com sucesso! (${result.routineIds.length} ${
          result.routineIds.length === 1 ? 'rotina criada' : 'rotinas criadas'
        })`,
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao importar ficha.');
    } finally {
      if (importFileInputRef.current) importFileInputRef.current.value = '';
    }
  };

  const handleStartWorkout = async (routine: Routine) => {
    setStartingRoutineId(routine.id);
    try {
      const db = getAppDatabase();
      if (!db.isOpen()) {
        await db.open();
      }
      const workoutService = new ActiveWorkoutService(db);

      const exercises = await Promise.all(
        routine.exercises.map(async (slot, sIdx) => {
          const prevSets = await workoutService.getPreviousExerciseSets(slot.exerciseId);
          return {
            id: generateId('slot'),
            exerciseId: slot.exerciseId,
            exerciseName: exercisesMap[slot.exerciseId] || `Exercício ${sIdx + 1}`,
            order: sIdx + 1,
            targetRestSeconds: slot.restSeconds ?? 90,
            progressionStrategy: slot.progressionStrategy ?? routine.defaultProgressionStrategy,
            sets: slot.sets.map((st, setIdx) => {
              const prevSet = prevSets?.[setIdx] ?? prevSets?.[0];
              const resolvedWeight = st.targetLoad !== undefined ? st.targetLoad : prevSet?.weight;
              const resolvedReps =
                st.targetReps !== undefined
                  ? st.targetReps
                  : prevSet?.reps !== undefined
                    ? prevSet.reps
                    : (st.minReps ?? 10);

              return {
                id: generateId('set'),
                setNumber: setIdx + 1,
                type: st.type,
                weight: resolvedWeight,
                reps: resolvedReps,
                restTargetSeconds: st.restSeconds ?? slot.restSeconds ?? 90,
                completed: false,
              };
            }),
          };
        }),
      );

      await workoutService.startWorkout({
        title: routine.name,
        sourceRoutineId: routine.id,
        exercises,
      });

      navigate('/');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao iniciar treino da rotina.');
      setStartingRoutineId(null);
    }
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
        className="tita-routines-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 'var(--tita-space-4)',
          borderBottom: '1px solid var(--tita-border-subtle)',
          paddingBottom: 'var(--tita-space-4)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--tita-space-3)' }}>
            <h2
              style={{
                fontFamily: 'var(--tita-font-display)',
                fontSize: 'clamp(1.5rem, 3.5vw, 2.1rem)',
                fontWeight: 'var(--tita-weight-black)',
                letterSpacing: '-0.02em',
                color: 'var(--tita-text)',
                margin: 0,
                textTransform: 'uppercase',
              }}
            >
              Minhas Rotinas
            </h2>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '2px 8px',
                borderRadius: 'var(--tita-radius-xs)',
                fontSize: 'var(--tita-text-2xs)',
                fontWeight: 'var(--tita-weight-bold)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                backgroundColor: 'var(--tita-accent-subtle, rgba(16, 185, 129, 0.1))',
                color: 'var(--tita-accent)',
                border: '1px solid var(--tita-border-focus, rgba(16, 185, 129, 0.25))',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {routines.length} {routines.length === 1 ? 'programa' : 'programas'}
            </span>
          </div>
          <p
            style={{
              fontSize: 'var(--tita-text-sm)',
              color: 'var(--tita-text-muted)',
              margin: 'var(--tita-space-1) 0 0 0',
              maxWidth: '560px',
              lineHeight: 1.4,
            }}
          >
            Sua ficha, pronta para o próximo treino.
            <span className="sr-only">100% offline</span>
          </p>
        </div>

        <Button
          variant="primary"
          onClick={handleOpenCreate}
          data-testid="create-routine-btn"
          leftIcon={<PlusIcon size={18} />}
        >
          Nova Rotina
        </Button>
        <div
          className="tita-routines-secondary"
          style={{
            display: 'flex',
            gap: 'var(--tita-space-2)',
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <Button
            variant="secondary"
            onClick={() => setIsDiscoveryOpen(true)}
            data-testid="open-discovery-btn"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--tita-space-2)' }}
          >
            <CompassIcon size={16} color="var(--tita-accent)" />
            <span>Descobrir</span>
          </Button>
          <Button
            variant="secondary"
            onClick={() => setIsTemplateBrowserOpen(true)}
            data-testid="open-templates-btn"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--tita-space-2)' }}
          >
            <ClipboardIcon size={16} color="var(--tita-accent)" />
            <span>Modelos</span>
          </Button>
          <Button
            variant="secondary"
            onClick={() => importFileInputRef.current?.click()}
            data-testid="import-routine-btn"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--tita-space-2)' }}
          >
            <UploadIcon size={16} color="var(--tita-accent)" />
            <span>Importar</span>
          </Button>
          <input
            ref={importFileInputRef}
            type="file"
            accept=".json,application/json"
            style={{ display: 'none' }}
            onChange={handleImportRoutineFile}
            data-testid="import-routine-file-input"
          />
        </div>
      </div>

      {/* Share/Import Notification */}
      {shareNotice && (
        <div
          style={{
            backgroundColor: 'rgba(16, 185, 129, 0.15)',
            color: '#10B981',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: 'var(--tita-radius-sm)',
            padding: 'var(--tita-space-3) var(--tita-space-4)',
            fontSize: 'var(--tita-text-sm)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
          data-testid="share-notice-banner"
        >
          <span>{shareNotice}</span>
          <button
            type="button"
            onClick={() => setShareNotice(null)}
            style={{
              background: 'none',
              border: 'none',
              color: 'inherit',
              cursor: 'pointer',
              fontWeight: 'bold',
              padding: '0 var(--tita-space-1)',
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Tabs */}
      <div
        role="tablist"
        aria-label="Filtro de rotinas ativas ou arquivadas"
        style={{
          display: 'flex',
          gap: 'var(--tita-space-2)',
          borderBottom: '1px solid var(--tita-border-subtle)',
          paddingBottom: 'var(--tita-space-1)',
        }}
      >
        <Button
          size="sm"
          variant={activeTab === 'active' ? 'primary' : 'ghost'}
          onClick={() => setActiveTab('active')}
          data-testid="tab-active-routines"
          role="tab"
          aria-selected={activeTab === 'active'}
          style={{
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            fontSize: 'var(--tita-text-xs)',
          }}
        >
          Ativas ({activeTab === 'active' ? routines.length : '...'})
        </Button>
        <Button
          size="sm"
          variant={activeTab === 'archived' ? 'primary' : 'ghost'}
          onClick={() => setActiveTab('archived')}
          data-testid="tab-archived-routines"
          role="tab"
          aria-selected={activeTab === 'archived'}
          style={{
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            fontSize: 'var(--tita-text-xs)',
          }}
        >
          Arquivadas
        </Button>
      </div>

      {/* Routines Grid */}
      {isLoading ? (
        <div
          style={{
            textAlign: 'center',
            padding: 'var(--tita-space-8)',
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
              border: '2px solid var(--tita-accent)',
              borderTopColor: 'transparent',
              animation: 'spin 0.8s linear infinite',
            }}
          />
          <span>Carregando programas de treino...</span>
        </div>
      ) : routines.length === 0 ? (
        <EmptyState
          title={
            activeTab === 'active' ? 'Nenhuma rotina criada ainda' : 'Nenhuma rotina arquivada'
          }
          description={
            activeTab === 'active'
              ? 'Você pode criar sua rotina personalizada do zero ou começar clonando um modelo pronto da comunidade.'
              : 'Rotinas arquivadas não aparecem na sua tela principal, mas seu histórico passado permanece intacto.'
          }
          actionLabel={activeTab === 'active' ? '+ Criar Primeira Rotina' : undefined}
          onAction={activeTab === 'active' ? handleOpenCreate : undefined}
        />
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 340px), 1fr))',
            gap: 'var(--tita-space-4)',
          }}
          data-testid="routines-grid"
        >
          {routines.map((routine) => {
            const exerciseNames = routine.exercises
              .map((slot) => exercisesMap[slot.exerciseId] || 'Exercício')
              .slice(0, 4);

            const totalSets = routine.exercises.reduce((acc, slot) => acc + slot.sets.length, 0);

            return (
              <div
                key={routine.id}
                data-testid={`routine-card-${routine.id}`}
                style={{
                  backgroundColor: 'var(--tita-surface-1)',
                  border: '1px solid var(--tita-border)',
                  borderRadius: 'var(--tita-radius-sm)',
                  padding: 'var(--tita-space-4)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'border-color 0.15s ease, background-color 0.15s ease',
                }}
              >
                {/* Top architectural marker hairline */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '2px',
                    backgroundColor: 'var(--tita-accent, #10B981)',
                  }}
                />

                <div>
                  {/* Routine Header */}
                  <div
                    className="tita-routine-card__header"
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: 'var(--tita-space-3)',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3
                        style={{
                          fontFamily: 'var(--tita-font-display)',
                          fontSize: 'var(--tita-text-lg)',
                          fontWeight: 'var(--tita-weight-bold)',
                          letterSpacing: '-0.01em',
                          color: 'var(--tita-text)',
                          margin: 0,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {builtinRoutineName(templateRefs[routine.programId ?? ''], routine.name)}
                      </h3>

                      {/* Clean Telemetry String (NO CARD-ITIS CHIPS) */}
                      <div
                        style={{
                          fontFamily: 'var(--tita-font-mono)',
                          fontSize: 'var(--tita-text-2xs)',
                          color: 'var(--tita-text-muted)',
                          marginTop: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          letterSpacing: '0.06em',
                          textTransform: 'uppercase',
                        }}
                      >
                        <span style={{ color: 'var(--tita-text-secondary)' }}>
                          {routine.exercises.length} EXERCÍCIOS
                        </span>
                        <span>•</span>
                        <span style={{ color: 'var(--tita-text-secondary)' }}>
                          ~{totalSets} SÉRIES
                        </span>
                        <span>•</span>
                        <span>DIVISÃO LIVRE</span>
                      </div>
                    </div>

                    {activeTab === 'active' && (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleStartWorkout(routine)}
                        disabled={startingRoutineId === routine.id}
                        data-testid={`start-routine-btn-${routine.id}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 'var(--tita-space-1)',
                          flexShrink: 0,
                          minHeight: '44px',
                          padding: '0 var(--tita-space-3)',
                          fontFamily: 'var(--tita-font-display)',
                          letterSpacing: '0.04em',
                          fontWeight: 'var(--tita-weight-bold)',
                        }}
                      >
                        <DumbbellIcon size={14} color="var(--tita-primary-contrast)" />
                        <span>{startingRoutineId === routine.id ? 'Iniciando...' : 'Iniciar'}</span>
                      </Button>
                    )}
                  </div>

                  {/* Notes if any */}
                  {routine.notes && (
                    <p
                      style={{
                        fontSize: 'var(--tita-text-xs)',
                        color: 'var(--tita-text-muted)',
                        fontStyle: 'italic',
                        borderLeft: '2px solid var(--tita-accent-subtle, rgba(16, 185, 129, 0.4))',
                        paddingLeft: 'var(--tita-space-2)',
                        margin: 'var(--tita-space-3) 0 0 0',
                        lineHeight: 1.4,
                      }}
                    >
                      {routine.notes}
                    </p>
                  )}

                  {/* Exercise List Roster (Athletic Numbered Preview, Clean Scannable) */}
                  <div
                    style={{
                      marginTop: 'var(--tita-space-3)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      paddingTop: 'var(--tita-space-2)',
                      borderTop: '1px solid var(--tita-border-subtle)',
                    }}
                  >
                    {exerciseNames.map((name, idx) => (
                      <div
                        key={idx}
                        style={{
                          fontSize: 'var(--tita-text-xs)',
                          color: 'var(--tita-text-secondary)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 'var(--tita-space-2)',
                          lineHeight: '1.5',
                        }}
                      >
                        <span
                          style={{
                            fontFamily: 'var(--tita-font-mono)',
                            fontWeight: 'var(--tita-weight-bold)',
                            color: 'var(--tita-accent)',
                            fontSize: '11px',
                            minWidth: '18px',
                          }}
                        >
                          {String(idx + 1).padStart(2, '0')}
                        </span>
                        <span
                          style={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            color: 'var(--tita-text)',
                            fontWeight: 'var(--tita-weight-medium)',
                          }}
                        >
                          {name}
                        </span>
                      </div>
                    ))}
                    {routine.exercises.length > 4 && (
                      <div
                        style={{
                          fontFamily: 'var(--tita-font-mono)',
                          fontSize: '11px',
                          color: 'var(--tita-text-muted)',
                          paddingLeft: '26px',
                          marginTop: '2px',
                        }}
                      >
                        + {routine.exercises.length - 4} outros exercícios no plano
                      </div>
                    )}
                  </div>
                </div>

                <HelpAction
                  screen="routine"
                  getContext={async () => {
                    const summary = routineSummary(routine, await libraryService.getExercises());
                    return {
                      ...summary,
                      data: {
                        ...summary.data,
                        strategy: routine.defaultProgressionStrategy ?? null,
                        exerciseStrategies: routine.exercises.map(
                          (e) =>
                            e.progressionStrategy ?? routine.defaultProgressionStrategy ?? null,
                        ),
                      },
                    };
                  }}
                />
                <IntelligenceAction
                  key={routine.updatedAt}
                  label="Analisar rotina"
                  getSummary={async () =>
                    routineSummary(routine, await libraryService.getExercises())
                  }
                />
                {/* Actions Bar */}
                <div
                  className="tita-routine-card__actions"
                  style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: 'var(--tita-space-1)',
                    paddingTop: 'var(--tita-space-3)',
                    borderTop: '1px solid var(--tita-border-subtle)',
                    marginTop: 'var(--tita-space-3)',
                  }}
                >
                  {activeTab === 'active' ? (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleOpenEdit(routine)}
                        data-testid={`edit-routine-btn-${routine.id}`}
                        style={{
                          minHeight: '40px',
                          minWidth: '60px',
                          fontSize: 'var(--tita-text-xs)',
                        }}
                      >
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDuplicate(routine)}
                        data-testid={`duplicate-routine-btn-${routine.id}`}
                        style={{
                          minHeight: '40px',
                          minWidth: '68px',
                          fontSize: 'var(--tita-text-xs)',
                        }}
                      >
                        Duplicar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleExportRoutine(routine)}
                        data-testid={`export-routine-btn-${routine.id}`}
                        style={{
                          minHeight: '40px',
                          minWidth: '95px',
                          fontSize: 'var(--tita-text-xs)',
                        }}
                      >
                        Exportar Ficha
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleArchive(routine)}
                        data-testid={`archive-routine-btn-${routine.id}`}
                        style={{
                          color: 'var(--tita-text-muted)',
                          minHeight: '40px',
                          minWidth: '68px',
                          fontSize: 'var(--tita-text-xs)',
                        }}
                      >
                        Arquivar
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleRestore(routine)}
                        data-testid={`restore-routine-btn-${routine.id}`}
                        style={{ minHeight: '40px', fontSize: 'var(--tita-text-xs)' }}
                      >
                        Restaurar
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleDeletePermanently(routine)}
                        data-testid={`delete-routine-btn-${routine.id}`}
                        style={{ minHeight: '40px', fontSize: 'var(--tita-text-xs)' }}
                      >
                        Excluir
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Routine Editor Dialog */}
      <RoutineEditorDialog
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        routineToEdit={routineToEdit}
        onSaved={loadData}
        routineService={routineService}
      />

      {/* Template Browser Dialog */}
      <TemplateBrowserDialog
        isOpen={isTemplateBrowserOpen}
        onClose={() => setIsTemplateBrowserOpen(false)}
        templateService={templateService}
        onTemplateCloned={() => {
          loadData();
          setActiveTab('active');
        }}
      />

      {/* Discovery Wizard Dialog */}
      <DiscoveryWizardDialog
        isOpen={isDiscoveryOpen}
        onClose={() => setIsDiscoveryOpen(false)}
        templateService={templateService}
        onProgramSelected={() => {
          loadData();
          setActiveTab('active');
        }}
      />
    </div>
  );
};

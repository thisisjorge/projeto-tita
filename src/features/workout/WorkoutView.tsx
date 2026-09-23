import React, { useState, useEffect, useTransition } from 'react';
import { HomeTrainingSummary } from './HomeTrainingSummary.js';
import { workoutErrorMessage } from '../../ui/workout-error.js';
import { AnchoredMenu } from '../../ui/components/AnchoredMenu.js';
import { TrophyIcon } from '../../ui/components/icons.js';
import { Link } from 'react-router-dom';
import { ExerciseSubstitutionDialog } from './ExerciseSubstitutionDialog.js';
import { substitutionCatalogId } from '../../domain/workout/substitution.js';
import {
  Card,
  Button,
  SetRow,
  Timer,
  Dialog,
  StatusBanner,
  MobileWorkoutHud,
  DesktopWorkoutHud,
} from '../../ui/components/index.js';
import type { ActiveWorkout, ActiveWorkoutExercise } from '../../domain/entities/active-workout.js';
import type { RestTimer } from '../../domain/entities/rest-timer.js';
import type { WorkoutSnapshot } from '../../domain/entities/workout-snapshot.js';
import type { ExerciseSet } from '../../domain/entities/exercise-set.js';
import { SetType } from '../../domain/enums/set-type.js';
import { GroupType } from '../../domain/enums/group-type.js';
import { WorkoutStatus } from '../../domain/enums/workout-status.js';
import { TimerStatus } from '../../domain/enums/timer-status.js';
import { calculateRemainingMs } from '../../domain/math/timer-math.js';
import { getAppDatabase } from '../../services/db-provider.js';
import { ActiveWorkoutService } from '../../services/active-workout-service.js';
import { ExerciseLibraryService } from '../../services/exercise-library-service.js';
import { SettingsService } from '../../services/settings-service.js';
import {
  type AdvancedTrackingSettings,
  DEFAULT_ADVANCED_TRACKING_SETTINGS,
} from '../../domain/settings/advanced-tracking-settings.js';
import { ProgressionEngine } from '../../domain/progression/progression-engine.js';
import { HelpAction } from '../intelligence/HelpAction.js';
import { workoutHelpContext } from '../../intelligence/help.js';
import type {
  ProgressionSuggestion,
  ProgressionSetSuggestion,
} from '../../domain/progression/types.js';
import { ProgressionSuggestionCard } from './ProgressionSuggestionCard.js';
import { serviceWorkerManager } from '../../services/service-worker-manager.js';
import type { Exercise } from '../../domain/entities/exercise.js';
import {
  notificationAdapter,
  hapticsAdapter,
  lifecycleAdapter,
  type AppState,
} from '../../platform/index.js';

export const WorkoutView: React.FC = () => {
  const [, startTransition] = useTransition();

  const [service, setService] = useState<ActiveWorkoutService | null>(null);
  const [exerciseLibService] = useState(() => new ExerciseLibraryService());
  const [settingsService] = useState(() => new SettingsService(getAppDatabase()));
  const [advancedSettings, setAdvancedSettings] = useState<AdvancedTrackingSettings>(
    DEFAULT_ADVANCED_TRACKING_SETTINGS,
  );
  const [progressionSuggestions, setProgressionSuggestions] = useState<
    Record<string, ProgressionSuggestion>
  >({});
  const [libraryExercises, setLibraryExercises] = useState<Exercise[]>([]);
  const [substitutionSlotId, setSubstitutionSlotId] = useState<string | null>(null);
  const [favoriteExerciseIds, setFavoriteExerciseIds] = useState<string[]>([]);
  useEffect(() => {
    let mounted = true;
    void exerciseLibService
      .initialize()
      .then(async () => {
        const [catalog, favorites] = await Promise.all([
          exerciseLibService.getExercises(),
          exerciseLibService.getFavoriteIds(),
        ]);
        if (mounted) {
          setLibraryExercises(catalog);
          setFavoriteExerciseIds(favorites);
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [exerciseLibService]);
  const [activeWorkout, setActiveWorkout] = useState<ActiveWorkout | null>(null);
  const [unfinishedExisting, setUnfinishedExisting] = useState<ActiveWorkout | null>(null);
  const [timer, setTimer] = useState<RestTimer | null>(null);
  const [timerRemainingSeconds, setTimerRemainingSeconds] = useState<number>(0);
  const [activeExerciseSlotId, setActiveExerciseSlotId] = useState<string | null>(null);
  const [timerAnnouncement, setTimerAnnouncement] = useState('');
  const prevRunningRef = React.useRef(false);
  const announcedMilestones = React.useRef<Set<number>>(new Set());

  useEffect(() => {
    const remaining = timer ? Math.ceil(calculateRemainingMs(timer, Date.now()) / 1000) : 0;
    const isRunning = timer?.status === TimerStatus.RUNNING;
    const isFinished = remaining <= 0;
    const m = Math.floor(Math.max(0, remaining) / 60);
    const s = Math.max(0, remaining) % 60;
    const formatted = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

    if (remaining > 35) {
      announcedMilestones.current.clear();
    }

    if (prevRunningRef.current !== isRunning) {
      if (isRunning) {
        setTimerAnnouncement(`Descanso iniciado: ${formatted}`);
      } else if (!isFinished) {
        setTimerAnnouncement(`Descanso pausado em ${formatted}`);
      }
      prevRunningRef.current = isRunning;
    }

    if (isRunning) {
      if (remaining === 30 && !announcedMilestones.current.has(30)) {
        announcedMilestones.current.add(30);
        setTimerAnnouncement('30 segundos restantes de descanso');
      } else if (remaining === 10 && !announcedMilestones.current.has(10)) {
        announcedMilestones.current.add(10);
        setTimerAnnouncement('10 segundos restantes de descanso');
      } else if (isFinished && !announcedMilestones.current.has(0)) {
        announcedMilestones.current.add(0);
        setTimerAnnouncement('Tempo de descanso concluído!');
      }
    }
  }, [timerRemainingSeconds, timer]);

  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [previousPerformances, setPreviousPerformances] = useState<Record<string, string>>({});
  const [previousSetsMap, setPreviousSetsMap] = useState<Record<string, readonly ExerciseSet[]>>(
    {},
  );
  const [focusModeMinimized, setFocusModeMinimized] = useState(false);

  // Group Dialog states
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [selectedGroupSlots, setSelectedGroupSlots] = useState<string[]>([]);
  const [groupType, setGroupType] = useState<GroupType>(GroupType.SUPERSET);
  const [groupRestSeconds, setGroupRestSeconds] = useState<number>(60);

  // Dialog states
  const [isFinalizeDialogOpen, setIsFinalizeDialogOpen] = useState(false);
  const [isDiscardDialogOpen, setIsDiscardDialogOpen] = useState(false);
  const [isAddExerciseDialogOpen, setIsAddExerciseDialogOpen] = useState(false);
  const [newExerciseName, setNewExerciseName] = useState('');
  const [completedSnapshot, setCompletedSnapshot] = useState<WorkoutSnapshot | null>(null);
  const finalizingRef = React.useRef(false);
  const editGeneration = React.useRef(0);

  // Active Workout Focus Mode effect: hides bottom nav on mobile when active workout is running
  useEffect(() => {
    if (activeWorkout && !focusModeMinimized) {
      document.body.setAttribute('data-tita-focus-mode', 'true');
    } else {
      document.body.removeAttribute('data-tita-focus-mode');
    }
    return () => {
      document.body.removeAttribute('data-tita-focus-mode');
    };
  }, [activeWorkout, focusModeMinimized]);

  // Initialize service and load current active workout
  useEffect(() => {
    let isMounted = true;

    async function init() {
      try {
        const db = getAppDatabase();
        if (!db.isOpen()) {
          await db.open();
        }
        const s = new ActiveWorkoutService(db);
        if (isMounted) {
          setService(s);
          const current = await s.getActiveWorkout();
          const adv = await settingsService.getAdvancedTrackingSettings();
          if (isMounted) {
            setAdvancedSettings(adv);
          }

          if (current) {
            setActiveWorkout(current);
            serviceWorkerManager.notifyActiveWorkoutChanged(true);
            // Load previous performances for exercises in workout
            const perfMap: Record<string, string> = {};
            const suggMap: Record<string, ProgressionSuggestion> = {};
            const prevSetsRecord: Record<string, readonly ExerciseSet[]> = {};

            let updatedWorkout = current;
            let needsPrefill = false;

            for (const ex of current.exercises) {
              const perf = await s.getPreviousPerformance(ex.exerciseId);
              if (perf) perfMap[ex.exerciseId] = perf;

              // Progression Suggestion Evaluation & Previous Sets Loading
              const prevSets = await s.getPreviousExerciseSets(ex.exerciseId);
              if (prevSets && prevSets.length > 0) {
                prevSetsRecord[ex.exerciseId] = prevSets;
                const sugg = ProgressionEngine.evaluate({
                  exerciseId: ex.exerciseId,
                  exerciseName: ex.exerciseName,
                  plannedSets: ex.sets,
                  previousSets: prevSets,
                });
                if (sugg) {
                  suggMap[ex.exerciseId] = sugg;
                }

                // Prefill check: if all sets in this exercise have neither weight nor reps, prefill from previous session
                const isAllBlank = ex.sets.every(
                  (st) => !st.completed && st.weight === undefined && st.reps === undefined,
                );
                if (isAllBlank) {
                  needsPrefill = true;
                  for (let i = 0; i < ex.sets.length; i++) {
                    const st = ex.sets[i]!;
                    const prevSt = prevSets[i] ?? prevSets[0];
                    if (prevSt && (prevSt.weight !== undefined || prevSt.reps !== undefined)) {
                      updatedWorkout = await s.updateSet(updatedWorkout.id, ex.id, st.id, {
                        weight: prevSt.weight,
                        reps: prevSt.reps,
                      });
                    }
                  }
                }
              }
            }
            if (isMounted) {
              setPreviousPerformances(perfMap);
              setProgressionSuggestions(suggMap);
              setPreviousSetsMap(prevSetsRecord);
              if (needsPrefill) {
                setActiveWorkout(updatedWorkout);
              }
            }
          }
          // Load active timer
          const activeTimer = await s.getActiveTimer();
          if (activeTimer && isMounted) {
            setTimer(activeTimer);
          }
        }
      } catch (err) {
        if (isMounted) {
          setErrorMessage(workoutErrorMessage(err));
        }
      }
    }

    init();

    return () => {
      isMounted = false;
    };
  }, []);

  // Native & Web Lifecycle synchronization (restore active workout and timer on resume)
  useEffect(() => {
    if (!service) return;

    const unsubscribe = lifecycleAdapter.onAppStateChange(async (state: AppState) => {
      if (state.isActive) {
        try {
          const current = await service.getActiveWorkout();
          if (current) {
            setActiveWorkout(current);
          }
          const activeTimer = await service.getActiveTimer();
          if (activeTimer) {
            setTimer(activeTimer);
            const remaining = calculateRemainingMs(activeTimer, Date.now());
            if (remaining <= 0 && activeTimer.status === TimerStatus.RUNNING) {
              notificationAdapter.playChime();
              hapticsAdapter.impact('heavy');
            }
          }
        } catch {
          // Ignore background sync errors
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [service]);

  // Timer countdown synchronization (derived purely from deadline, zero tick drift)
  useEffect(() => {
    if (!timer || timer.status !== TimerStatus.RUNNING) {
      if (timer && timer.status === TimerStatus.PAUSED) {
        const rem = Math.ceil((timer.remainingMsWhenPaused ?? 0) / 1000);
        setTimerRemainingSeconds(rem);
      } else {
        setTimerRemainingSeconds(0);
      }
      return;
    }

    // Paint the deadline-derived value immediately instead of flashing 00:00
    // until the first 500 ms tick. Countdown and persistence rules are unchanged.
    setTimerRemainingSeconds(Math.ceil(calculateRemainingMs(timer, Date.now()) / 1000));
    const interval = setInterval(() => {
      const remainingMs = calculateRemainingMs(timer, Date.now());
      const remainingSec = Math.ceil(remainingMs / 1000);
      setTimerRemainingSeconds(remainingSec);

      if (remainingMs <= 0) {
        setTimer((prev) => (prev ? { ...prev, status: TimerStatus.COMPLETED } : null));
        notificationAdapter.playChime();
        hapticsAdapter.impact('heavy');
        clearInterval(interval);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [timer]);

  // Handler: Start new workout
  const handleStartWorkout = async (title = 'Treino do Dia') => {
    if (!service) return;
    setSaveStatus('saving');
    setErrorMessage(null);

    const benchPrev = await service.getPreviousExerciseSets('bench-press');
    const latPrev = await service.getPreviousExerciseSets('lat-pulldown');

    const defaultExercises = [
      {
        id: 'slot-1',
        exerciseId: 'bench-press',
        exerciseName: 'Supino Reto com Barra',
        order: 1,
        targetRestSeconds: 90,
        sets: [
          {
            id: 'set-1',
            setNumber: 1,
            type: SetType.NORMAL,
            weight: benchPrev?.[0]?.weight ?? 60,
            reps: benchPrev?.[0]?.reps ?? 8,
            completed: false,
          },
          {
            id: 'set-2',
            setNumber: 2,
            type: SetType.NORMAL,
            weight: benchPrev?.[1]?.weight ?? benchPrev?.[0]?.weight ?? 60,
            reps: benchPrev?.[1]?.reps ?? benchPrev?.[0]?.reps ?? 8,
            completed: false,
          },
          {
            id: 'set-3',
            setNumber: 3,
            type: SetType.NORMAL,
            weight: benchPrev?.[2]?.weight ?? benchPrev?.[0]?.weight ?? 60,
            reps: benchPrev?.[2]?.reps ?? benchPrev?.[0]?.reps ?? 8,
            completed: false,
          },
        ],
      },
      {
        id: 'slot-2',
        exerciseId: 'lat-pulldown',
        exerciseName: 'Puxada Alta na Barra',
        order: 2,
        targetRestSeconds: 90,
        sets: [
          {
            id: 'set-4',
            setNumber: 1,
            type: SetType.NORMAL,
            weight: latPrev?.[0]?.weight ?? 50,
            reps: latPrev?.[0]?.reps ?? 10,
            completed: false,
          },
          {
            id: 'set-5',
            setNumber: 2,
            type: SetType.NORMAL,
            weight: latPrev?.[1]?.weight ?? latPrev?.[0]?.weight ?? 50,
            reps: latPrev?.[1]?.reps ?? latPrev?.[0]?.reps ?? 10,
            completed: false,
          },
          {
            id: 'set-6',
            setNumber: 3,
            type: SetType.NORMAL,
            weight: latPrev?.[2]?.weight ?? latPrev?.[0]?.weight ?? 50,
            reps: latPrev?.[2]?.reps ?? latPrev?.[0]?.reps ?? 10,
            completed: false,
          },
        ],
      },
    ];

    const result = await service.startWorkout({
      title,
      exercises: defaultExercises,
    });

    if (result.type === 'started') {
      setActiveWorkout(result.workout);
      setUnfinishedExisting(null);
      serviceWorkerManager.notifyActiveWorkoutChanged(true);
      setSaveStatus('saved');
    } else if (result.type === 'mustResume') {
      setUnfinishedExisting(result.existing);
      serviceWorkerManager.notifyActiveWorkoutChanged(true);
      setSaveStatus('saved');
    } else {
      setErrorMessage(workoutErrorMessage(result.error));
      setSaveStatus('error');
    }
  };

  // Handler: Resume existing workout
  const handleResumeWorkout = async () => {
    if (!service) return;
    const target = unfinishedExisting ?? activeWorkout;
    if (!target) return;

    setSaveStatus('saving');
    try {
      const resumed = await service.resumeWorkout(target.id);
      setActiveWorkout(resumed);
      setUnfinishedExisting(null);
      serviceWorkerManager.notifyActiveWorkoutChanged(true);
      setSaveStatus('saved');
    } catch (err) {
      setErrorMessage(workoutErrorMessage(err));
      setSaveStatus('error');
    }
  };

  // Handler: Pause workout
  const handlePauseWorkout = async () => {
    if (!service || !activeWorkout) return;
    setSaveStatus('saving');
    try {
      const paused = await service.pauseWorkout(activeWorkout.id);
      setActiveWorkout(paused);
      setSaveStatus('saved');
    } catch (err) {
      setErrorMessage(workoutErrorMessage(err));
      setSaveStatus('error');
    }
  };

  // Handler: Discard workout
  const handleDiscardWorkout = async () => {
    if (!service) return;
    const target = activeWorkout ?? unfinishedExisting;
    if (!target) return;

    setSaveStatus('saving');
    try {
      await service.discardWorkout(target.id);
      setActiveWorkout(null);
      setUnfinishedExisting(null);
      setTimer(null);
      setIsDiscardDialogOpen(false);
      serviceWorkerManager.notifyActiveWorkoutChanged(false);
      setSaveStatus('saved');
    } catch (err) {
      setErrorMessage(workoutErrorMessage(err));
      setSaveStatus('error');
    }
  };

  // Handler: Immediate Set Editing & Completion
  const handleUpdateSet = async (
    exerciseSlotId: string,
    setId: string,
    updates: Partial<ExerciseSet>,
  ) => {
    if (!service || !activeWorkout || finalizingRef.current) return;
    const generation = editGeneration.current;

    setSaveStatus('saving');
    try {
      const updated = await service.updateSet(activeWorkout.id, exerciseSlotId, setId, updates);
      if (generation !== editGeneration.current) return;
      setActiveWorkout(updated);
      setErrorMessage(null);
      setSaveStatus('saved');

      if (updates.completed) {
        hapticsAdapter.impact('medium');
        setActiveExerciseSlotId(exerciseSlotId);
      } else if (updates.completed === false) {
        setActiveExerciseSlotId(exerciseSlotId);
      }

      // Refresh timer if triggered
      const activeTimer = await service.getActiveTimer();
      if (generation !== editGeneration.current) return;
      if (activeTimer) {
        setTimer(activeTimer);
        if (activeTimer.status === TimerStatus.RUNNING && activeTimer.deadlineAt) {
          notificationAdapter.scheduleNotification({
            id: 1001,
            title: 'Tempo de Descanso Concluído!',
            body: 'Seu tempo de descanso acabou. Pronto para a próxima série?',
            scheduleAt: new Date(activeTimer.deadlineAt),
          });
        }
      }
    } catch (err) {
      if (generation !== editGeneration.current) return;
      setErrorMessage(workoutErrorMessage(err));
      setSaveStatus('error');
    }
  };

  // Handler: Apply Progression Suggestion
  const handleApplySuggestion = async (
    suggestion: ProgressionSuggestion,
    customSets?: readonly ProgressionSetSuggestion[],
  ) => {
    if (!service || !activeWorkout) return;
    const exerciseSlot = activeWorkout.exercises.find(
      (e) => e.exerciseId === suggestion.exerciseId,
    );
    if (!exerciseSlot) return;

    const setsToApply = customSets ?? suggestion.suggestedSets;
    setSaveStatus('saving');
    try {
      let currentWorkout = activeWorkout;
      for (let i = 0; i < exerciseSlot.sets.length && i < setsToApply.length; i++) {
        const existingSet = exerciseSlot.sets[i]!;
        const suggested = setsToApply[i]!;
        currentWorkout = await service.updateSet(
          currentWorkout.id,
          exerciseSlot.id,
          existingSet.id,
          {
            weight: suggested.weight,
            reps: suggested.reps,
            type: suggested.type ?? existingSet.type,
          },
        );
      }
      setActiveWorkout(currentWorkout);
      // Remove applied suggestion
      setProgressionSuggestions((prev) => {
        const next = { ...prev };
        delete next[suggestion.exerciseId];
        return next;
      });
      setSuccessNotice(`Sugestão de sobrecarga aplicada para ${exerciseSlot.exerciseName}.`);
      setSaveStatus('saved');
    } catch (err) {
      setErrorMessage(workoutErrorMessage(err));
      setSaveStatus('error');
    }
  };

  // Handler: Ignore Progression Suggestion
  const handleIgnoreSuggestion = (exerciseId: string) => {
    setProgressionSuggestions((prev) => {
      const next = { ...prev };
      delete next[exerciseId];
      return next;
    });
  };

  // Handler: Open Group Dialog
  const handleOpenGroupDialog = (initialSlotId: string) => {
    setSelectedGroupSlots([initialSlotId]);
    setGroupType(GroupType.SUPERSET);
    setGroupRestSeconds(60);
    setIsGroupDialogOpen(true);
  };

  // Handler: Create Exercise Group (Superset / Circuit)
  const handleCreateGroup = async () => {
    if (!service || !activeWorkout || selectedGroupSlots.length < 2) return;
    setSaveStatus('saving');
    try {
      const updated = await service.createExerciseGroup(
        activeWorkout.id,
        selectedGroupSlots,
        groupType,
        groupRestSeconds,
      );
      setActiveWorkout(updated);
      setIsGroupDialogOpen(false);
      setSuccessNotice('Agrupamento criado com sucesso.');
      setSaveStatus('saved');
    } catch (err) {
      setErrorMessage(workoutErrorMessage(err));
      setSaveStatus('error');
    }
  };

  // Handler: Remove Exercise Group
  const handleRemoveGroup = async (groupId: string) => {
    if (!service || !activeWorkout) return;
    setSaveStatus('saving');
    try {
      const updated = await service.removeExerciseGroup(activeWorkout.id, groupId);
      setActiveWorkout(updated);
      setSuccessNotice('Agrupamento removido.');
      setSaveStatus('saved');
    } catch (err) {
      setErrorMessage(workoutErrorMessage(err));
      setSaveStatus('error');
    }
  };

  // Handler: Add set to exercise
  const handleAddSet = async (exerciseSlotId: string) => {
    if (!service || !activeWorkout) return;
    setSaveStatus('saving');
    try {
      const updated = await service.addSet(activeWorkout.id, exerciseSlotId);
      setActiveWorkout(updated);
      setSaveStatus('saved');
    } catch (err) {
      setErrorMessage(workoutErrorMessage(err));
      setSaveStatus('error');
    }
  };

  // Handler: Remove set from exercise
  const handleRemoveSet = async (exerciseSlotId: string, setId: string) => {
    if (!service || !activeWorkout) return;
    setSaveStatus('saving');
    try {
      const updated = await service.removeSet(activeWorkout.id, exerciseSlotId, setId);
      setActiveWorkout(updated);
      setSaveStatus('saved');
    } catch (err) {
      setErrorMessage(workoutErrorMessage(err));
      setSaveStatus('error');
    }
  };

  useEffect(() => {
    if (isAddExerciseDialogOpen) {
      exerciseLibService.initialize().then(() => {
        exerciseLibService.getExercises().then(setLibraryExercises);
      });
    }
  }, [isAddExerciseDialogOpen, exerciseLibService]);

  const handleAddExerciseWithDetails = async (
    exerciseId: string,
    exerciseName: string,
    targetRestSeconds = 90,
  ) => {
    if (!service || !activeWorkout || !exerciseName.trim()) return;
    setSaveStatus('saving');
    try {
      const prevSets = await service.getPreviousExerciseSets(exerciseId);
      const initialSets = [];
      for (let i = 0; i < 3; i++) {
        const p = prevSets?.[i] ?? prevSets?.[0];
        initialSets.push({
          weight: p?.weight,
          reps: p?.reps ?? 10,
        });
      }

      const updated = await service.addExercise(activeWorkout.id, {
        exerciseId,
        exerciseName: exerciseName.trim(),
        targetRestSeconds,
        initialSetsCount: 3,
        initialSets,
      });

      if (prevSets && prevSets.length > 0) {
        setPreviousSetsMap((prev) => ({ ...prev, [exerciseId]: prevSets }));
        const perf = await service.getPreviousPerformance(exerciseId);
        if (perf) {
          setPreviousPerformances((prev) => ({ ...prev, [exerciseId]: perf }));
        }
      }

      setActiveWorkout(updated);
      setNewExerciseName('');
      setIsAddExerciseDialogOpen(false);
      setSaveStatus('saved');
    } catch (err) {
      setErrorMessage(workoutErrorMessage(err));
      setSaveStatus('error');
    }
  };

  // Handler: Add new exercise
  const handleAddExercise = async () => {
    if (!newExerciseName.trim()) return;
    const matched = libraryExercises.find(
      (e) => e.name.toLowerCase() === newExerciseName.trim().toLowerCase(),
    );
    if (matched) {
      await handleAddExerciseWithDetails(
        matched.id,
        matched.name,
        matched.defaultRestSeconds ?? 90,
      );
    } else {
      await handleAddExerciseWithDetails(
        newExerciseName.toLowerCase().replace(/\s+/g, '-'),
        newExerciseName.trim(),
        90,
      );
    }
  };

  // Handler: Timer Controls
  const handleToggleTimer = async () => {
    if (!service || !timer) return;
    if (timer.status === TimerStatus.RUNNING) {
      const paused = await service.pauseTimer();
      if (paused) {
        setTimer(paused);
        notificationAdapter.cancelNotification(1001);
      }
    } else if (timer.status === TimerStatus.PAUSED) {
      const resumed = await service.resumeTimer();
      if (resumed) {
        setTimer(resumed);
        if (resumed.deadlineAt) {
          notificationAdapter.scheduleNotification({
            id: 1001,
            title: 'Tempo de Descanso Concluído!',
            body: 'Seu tempo de descanso acabou. Pronto para a próxima série?',
            scheduleAt: new Date(resumed.deadlineAt),
          });
        }
      }
    }
  };

  const handleAddTimerSeconds = async (seconds: number) => {
    if (!service) return;
    const updated = await service.addTimerSeconds(seconds);
    if (updated) {
      setTimer(updated);
      if (updated.status === TimerStatus.RUNNING && updated.deadlineAt) {
        notificationAdapter.scheduleNotification({
          id: 1001,
          title: 'Tempo de Descanso Concluído!',
          body: 'Seu tempo de descanso acabou. Pronto para a próxima série?',
          scheduleAt: new Date(updated.deadlineAt),
        });
      }
    }
  };

  const handleSkipTimer = async () => {
    if (!service) return;
    await service.skipTimer();
    notificationAdapter.cancelNotification(1001);
    setTimer(null);
  };

  // Handler: Finalize workout
  const handleFinalizeWorkout = async () => {
    if (!service || !activeWorkout || finalizingRef.current) return;
    finalizingRef.current = true;
    setSaveStatus('saving');
    try {
      const snapshot = await service.finalizeWorkout(activeWorkout.id);
      editGeneration.current += 1;
      setErrorMessage(null);
      serviceWorkerManager.notifyActiveWorkoutChanged(false);
      startTransition(() => {
        setCompletedSnapshot(snapshot);
        setActiveWorkout(null);
        setTimer(null);
        setIsFinalizeDialogOpen(false);
        setSaveStatus('saved');
      });
    } catch (err) {
      setErrorMessage(workoutErrorMessage(err));
      setSaveStatus('error');
    } finally {
      finalizingRef.current = false;
    }
  };

  // If a finished snapshot celebration is active
  if (completedSnapshot) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--tita-space-4)',
          maxWidth: '600px',
          margin: '0 auto',
        }}
        data-testid="workout-completion-summary"
      >
        <Card
          title={
            <>
              <TrophyIcon aria-hidden="true" /> Treino Concluído com Sucesso!
            </>
          }
          subtitle={completedSnapshot.title}
          style={{ border: '1px solid var(--tita-accent)' }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 'var(--tita-space-3)',
              margin: 'var(--tita-space-4) 0',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                backgroundColor: 'var(--tita-surface-2)',
                padding: 'var(--tita-space-3)',
                borderRadius: 'var(--tita-radius-sm)',
              }}
            >
              <div style={{ fontSize: 'var(--tita-text-xs)', color: 'var(--tita-text-muted)' }}>
                Volume Total
              </div>
              <strong style={{ fontSize: 'var(--tita-text-xl)', color: 'var(--tita-accent)' }}>
                {completedSnapshot.totalVolumeKg.toLocaleString('pt-BR')} kg
              </strong>
            </div>

            <div
              style={{
                backgroundColor: 'var(--tita-surface-2)',
                padding: 'var(--tita-space-3)',
                borderRadius: 'var(--tita-radius-sm)',
              }}
            >
              <div style={{ fontSize: 'var(--tita-text-xs)', color: 'var(--tita-text-muted)' }}>
                Séries Válidas
              </div>
              <strong style={{ fontSize: 'var(--tita-text-xl)', color: 'var(--tita-text)' }}>
                {completedSnapshot.completedSetsCount}
              </strong>
            </div>

            <div
              style={{
                backgroundColor: 'var(--tita-surface-2)',
                padding: 'var(--tita-space-3)',
                borderRadius: 'var(--tita-radius-sm)',
              }}
            >
              <div style={{ fontSize: 'var(--tita-text-xs)', color: 'var(--tita-text-muted)' }}>
                Duração Ativa
              </div>
              <strong style={{ fontSize: 'var(--tita-text-xl)', color: 'var(--tita-text)' }}>
                {Math.round(completedSnapshot.activeDurationMs / 60000)} min
              </strong>
            </div>
          </div>

          <p data-testid="completion-extra-stats">
            Exercícios concluídos:{' '}
            {
              completedSnapshot.exercises.filter((exercise) =>
                exercise.sets.some((set) => set.completed),
              ).length
            }{' '}
            · Repetições: {completedSnapshot.totalReps}
          </p>
          <nav
            aria-label="Depois do treino"
            style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}
          >
            <Link to="/app/history">Ver histórico</Link>
            <Link to="/app/progress">Ver progresso</Link>
            <Link to="/app/routines">Ver próximas rotinas</Link>
          </nav>
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              marginTop: 'var(--tita-space-4)',
            }}
          >
            <Button variant="primary" onClick={() => setCompletedSnapshot(null)}>
              Concluir e Voltar
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // If an unfinished workout was detected and needs Resume or Discard (REQ-4)
  if (unfinishedExisting) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--tita-space-4)',
          maxWidth: '600px',
          margin: '0 auto',
        }}
        data-testid="unfinished-workout-prompt"
      >
        <StatusBanner
          type="warning"
          title="Treino Inacabado Encontrado"
          message={`Você possui uma sessão aberta: "${unfinishedExisting.title}". Conforme a regra de segurança, finalize ou descarte este treino antes de iniciar um novo.`}
        />

        <Card
          title={unfinishedExisting.title}
          subtitle={`Iniciado em ${new Date(unfinishedExisting.startedAt).toLocaleString()}`}
          action={
            <div style={{ display: 'flex', gap: 'var(--tita-space-2)' }}>
              <Button variant="danger" size="sm" onClick={() => setIsDiscardDialogOpen(true)}>
                Descartar
              </Button>
              <Button variant="primary" size="sm" onClick={handleResumeWorkout}>
                Retomar Treino
              </Button>
            </div>
          }
        >
          <p style={{ fontSize: 'var(--tita-text-sm)', color: 'var(--tita-text-muted)' }}>
            Seus dados e séries permanecem preservados de forma segura na memória local do
            dispositivo.
          </p>
        </Card>

        {/* Discard Confirmation Dialog */}
        <Dialog
          isOpen={isDiscardDialogOpen}
          onClose={() => setIsDiscardDialogOpen(false)}
          title="Descartar Sessão de Treino?"
          description="Tem certeza que deseja descartar este treino? Os dados não finalizados desta sessão serão apagados."
          footer={
            <>
              <Button variant="secondary" onClick={() => setIsDiscardDialogOpen(false)}>
                Cancelar
              </Button>
              <Button variant="danger" onClick={handleDiscardWorkout}>
                Sim, Descartar
              </Button>
            </>
          }
        />
      </div>
    );
  }

  // If no active workout session is underway
  if (!activeWorkout) {
    return (
      <HomeTrainingSummary
        onStart={() => handleStartWorkout('Treino Rápido')}
        startDisabled={!service}
        error={errorMessage}
        onDismissError={() => setErrorMessage(null)}
      />
    );
  }

  // Active workout is IN_PROGRESS or PAUSED
  const isPaused = activeWorkout.status === WorkoutStatus.PAUSED;
  const totalCompletedSets = activeWorkout.exercises.reduce(
    (count, ex) => count + ex.sets.filter((s) => s.completed).length,
    0,
  );
  const totalSetsCount = activeWorkout.exercises.reduce((count, ex) => count + ex.sets.length, 0);
  const renderExerciseSlot = (exerciseSlot: ActiveWorkoutExercise, isGrouped: boolean) => (
    <div
      key={exerciseSlot.id}
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--tita-space-2)' }}
    >
      {/* Progression Suggestion Card */}
      {progressionSuggestions[exerciseSlot.exerciseId] && (
        <ProgressionSuggestionCard
          suggestion={progressionSuggestions[exerciseSlot.exerciseId]!}
          onApply={handleApplySuggestion}
          onIgnore={() => handleIgnoreSuggestion(exerciseSlot.exerciseId)}
        />
      )}

      <Card
        title={exerciseSlot.exerciseName}
        subtitle={
          previousPerformances[exerciseSlot.exerciseId]
            ? `Anterior: ${previousPerformances[exerciseSlot.exerciseId]}`
            : `Descanso alvo: ${exerciseSlot.targetRestSeconds ?? 90}s`
        }
        action={
          <div style={{ display: 'flex', gap: 'var(--tita-space-1)', flexShrink: 0 }}>
            {
              <AnchoredMenu
                className="tita-exercise-options"
                label={`Opções de ${exerciseSlot.exerciseName}`}
              >
                <div>
                  <HelpAction
                    screen="workout"
                    getContext={() =>
                      workoutHelpContext(
                        exerciseSlot,
                        previousSetsMap[exerciseSlot.exerciseId],
                        progressionSuggestions[exerciseSlot.exerciseId],
                      )
                    }
                  />
                  {exerciseSlot.sets.some((s) => !s.completed) &&
                    libraryExercises.some(
                      (e) => e.id === substitutionCatalogId(exerciseSlot.exerciseId),
                    ) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(event) => {
                          event.currentTarget.closest('details')?.removeAttribute('open');
                          setSubstitutionSlotId(exerciseSlot.id);
                        }}
                      >
                        Trocar exercício
                      </Button>
                    )}
                  {!isGrouped && activeWorkout && activeWorkout.exercises.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(event) => {
                        event.currentTarget.closest('details')?.removeAttribute('open');
                        handleOpenGroupDialog(exerciseSlot.id);
                      }}
                      aria-label={`Criar agrupamento com ${exerciseSlot.exerciseName}`}
                      data-testid={`create-group-btn-${exerciseSlot.id}`}
                    >
                      + Superset
                    </Button>
                  )}
                </div>
              </AnchoredMenu>
            }
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleAddSet(exerciseSlot.id)}
              aria-label={`Adicionar série em ${exerciseSlot.exerciseName}`}
            >
              + Série
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--tita-space-1)' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'auto 1fr 1fr 52px',
              padding: 'var(--tita-space-2)',
              fontSize: 'var(--tita-text-xs)',
              fontWeight: 'var(--tita-weight-bold)',
              color: 'var(--tita-text-muted)',
              textTransform: 'uppercase',
            }}
          >
            <span style={{ minWidth: '40px', textAlign: 'center' }}>#</span>
            <span style={{ textAlign: 'center' }}>Carga (kg)</span>
            <span style={{ textAlign: 'center' }}>Reps</span>
            <span style={{ textAlign: 'center' }}>Status</span>
          </div>

          {exerciseSlot.sets.map((set) => {
            const prevSet =
              previousSetsMap[exerciseSlot.exerciseId]?.find(
                (s) => s.setNumber === set.setNumber,
              ) ?? previousSetsMap[exerciseSlot.exerciseId]?.[0];
            const prevPerfStr =
              prevSet && prevSet.weight !== undefined
                ? `${prevSet.weight.toLocaleString('pt-BR')} kg × ${prevSet.reps ?? 0}`
                : previousPerformances[exerciseSlot.exerciseId];

            const sugg = progressionSuggestions[exerciseSlot.exerciseId];
            const targetSet = sugg?.suggestedSets.find((s) => s.setNumber === set.setNumber);
            const targetPerfStr = targetSet
              ? `${targetSet.weight.toLocaleString('pt-BR')} kg × ${targetSet.reps}`
              : undefined;

            return (
              <div
                key={set.id}
                style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                data-testid={`set-row-container-${set.setNumber}`}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <SetRow
                    setNumber={set.setNumber}
                    type={set.type}
                    weight={set.weight}
                    reps={set.reps}
                    rir={set.rir}
                    rpe={set.rpe}
                    tempo={set.tempo}
                    notes={set.notes}
                    durationSeconds={set.durationSeconds}
                    distanceMeters={set.distanceMeters}
                    completed={set.completed}
                    onInvalidCommit={() =>
                      handleUpdateSet(exerciseSlot.id, set.id, { completed: false })
                    }
                    previousPerformance={prevPerfStr}
                    targetPerformance={targetPerfStr}
                    onRemove={
                      exerciseSlot.sets.length > 1
                        ? () => handleRemoveSet(exerciseSlot.id, set.id)
                        : undefined
                    }
                    weightStep={2.5}
                    showAdvanced={advancedSettings.enabled}
                    showSetType={advancedSettings.showSetType}
                    showRpe={advancedSettings.showRpe}
                    showRir={advancedSettings.showRir}
                    showTempo={advancedSettings.showTempo}
                    showNotes={advancedSettings.showNotes}
                    showDuration={advancedSettings.showDuration}
                    showDistance={advancedSettings.showDistance}
                    onWeightChange={(w) => handleUpdateSet(exerciseSlot.id, set.id, { weight: w })}
                    onRepsChange={(r) => handleUpdateSet(exerciseSlot.id, set.id, { reps: r })}
                    onTypeChange={(t) => handleUpdateSet(exerciseSlot.id, set.id, { type: t })}
                    onRpeChange={(rpe) => handleUpdateSet(exerciseSlot.id, set.id, { rpe })}
                    onRirChange={(rir) => handleUpdateSet(exerciseSlot.id, set.id, { rir })}
                    onTempoChange={(tempo) => handleUpdateSet(exerciseSlot.id, set.id, { tempo })}
                    onNotesChange={(notes) => handleUpdateSet(exerciseSlot.id, set.id, { notes })}
                    onDurationChange={(durationSeconds) =>
                      handleUpdateSet(exerciseSlot.id, set.id, { durationSeconds })
                    }
                    onDistanceChange={(distanceMeters) =>
                      handleUpdateSet(exerciseSlot.id, set.id, { distanceMeters })
                    }
                    onToggleComplete={() =>
                      handleUpdateSet(exerciseSlot.id, set.id, { completed: !set.completed })
                    }
                  />
                </div>
              </div>
            );
          })}

          {/* Contextual Inline Rest Timer next to completed sets (Single contextual instance) */}
          {(() => {
            const isTargetSlotForInlineTimer = activeExerciseSlotId
              ? exerciseSlot.id === activeExerciseSlotId
              : activeWorkout.exercises[0]?.id === exerciseSlot.id;

            if (
              !timer ||
              (timer.status !== TimerStatus.RUNNING && timer.status !== TimerStatus.PAUSED) ||
              !isTargetSlotForInlineTimer
            ) {
              return null;
            }

            const formattedTime = `${String(Math.floor(timerRemainingSeconds / 60)).padStart(2, '0')}:${String(timerRemainingSeconds % 60).padStart(2, '0')}`;

            return (
              <div
                role="timer"
                aria-label={`Temporizador de descanso: ${formattedTime}`}
                style={{
                  marginTop: 'var(--tita-space-3)',
                  padding: 'var(--tita-space-3) var(--tita-space-4)',
                  backgroundColor: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: 'var(--tita-radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 'var(--tita-space-2)',
                }}
                data-testid="rest-timer-display"
              >
                {/* Polite live region for assistive technologies */}
                <div
                  aria-live="polite"
                  aria-atomic="true"
                  className="sr-only"
                  data-testid="timer-announcer"
                >
                  {timerAnnouncement}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--tita-space-2)' }}>
                  <span style={{ fontSize: '18px' }}>⏱</span>
                  <div>
                    <div
                      style={{
                        fontFamily: 'var(--tita-font-display)',
                        fontSize: 'var(--tita-text-xl)',
                        fontWeight: 'var(--tita-weight-bold)',
                        color: 'var(--tita-accent)',
                        fontVariantNumeric: 'tabular-nums',
                        lineHeight: 1,
                      }}
                    >
                      {String(Math.floor(timerRemainingSeconds / 60)).padStart(2, '0')}:
                      {String(timerRemainingSeconds % 60).padStart(2, '0')}
                    </div>
                    <span style={{ fontSize: '10px', color: 'var(--tita-text-muted)' }}>
                      Descanso entre séries
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => handleAddTimerSeconds(-15)}
                    style={{
                      padding: '4px 8px',
                      borderRadius: 'var(--tita-radius-sm)',
                      border: '1px solid var(--tita-border)',
                      backgroundColor: 'var(--tita-surface-2)',
                      color: 'var(--tita-text)',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      minHeight: '36px',
                    }}
                    aria-label="Diminuir 15 segundos do descanso"
                  >
                    -15s
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddTimerSeconds(15)}
                    style={{
                      padding: '4px 8px',
                      borderRadius: 'var(--tita-radius-sm)',
                      border: '1px solid var(--tita-border)',
                      backgroundColor: 'var(--tita-surface-2)',
                      color: 'var(--tita-text)',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      minHeight: '36px',
                    }}
                    aria-label="Adicionar 15 segundos ao descanso"
                  >
                    +15s
                  </button>
                  <button
                    type="button"
                    onClick={handleSkipTimer}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 'var(--tita-radius-sm)',
                      border: '1px solid var(--tita-border)',
                      backgroundColor: 'var(--tita-surface-2)',
                      color: 'var(--tita-text-muted)',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      minHeight: '36px',
                    }}
                    aria-label="Pular descanso"
                  >
                    Pular
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      </Card>
    </div>
  );

  const totalVolumeKg = activeWorkout.exercises.reduce(
    (acc, ex) =>
      acc +
      ex.sets.reduce((setAcc, s) => {
        if (s.completed && s.weight && s.reps) {
          return setAcc + s.weight * s.reps;
        }
        return setAcc;
      }, 0),
    0,
  );

  return (
    <div
      className="tita-active-workout-layout"
      data-testid="active-workout-session"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--tita-space-4)',
        width: '100%',
        maxWidth: 'var(--tita-workstation-max-width)',
        margin: '0 auto',
      }}
    >
      {/* Minimized Focus Mode Banner */}
      {focusModeMinimized && (
        <div
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 30,
            padding: '10px 16px',
            backgroundColor: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: 'var(--tita-radius-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 'var(--tita-space-3)',
          }}
          data-testid="focus-mode-minimized-banner"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px' }}>🟢</span>
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--tita-accent)' }}>
              Treino em Andamento: {totalCompletedSets}/{totalSetsCount} séries
            </span>
          </div>
          <button
            type="button"
            onClick={() => setFocusModeMinimized(false)}
            style={{
              padding: '6px 14px',
              backgroundColor: 'var(--tita-primary)',
              color: '#ffffff',
              border: 'none',
              borderRadius: 'var(--tita-radius-sm)',
              fontSize: '12px',
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
            data-testid="resume-focus-mode-btn"
          >
            Retomar Foco
          </button>
        </div>
      )}
      {/* Column 1: Workout Queue Sidebar (Desktop only) */}
      <aside className="tita-workout-queue-col">
        <div
          style={{
            backgroundColor: 'var(--tita-surface)',
            border: '1px solid var(--tita-border)',
            borderRadius: 'var(--tita-radius-md)',
            padding: 'var(--tita-space-4)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--tita-space-3)',
            position: 'sticky',
            top: 'var(--tita-space-4)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3
              style={{
                fontSize: 'var(--tita-text-xs)',
                fontWeight: 'var(--tita-weight-bold)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                color: 'var(--tita-text-muted)',
              }}
            >
              Roteiro da Sessão
            </h3>
            <span
              className="tita-num"
              style={{
                fontSize: '12px',
                color: 'var(--tita-accent)',
                fontWeight: 'bold',
              }}
            >
              {totalCompletedSets}/{totalSetsCount}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {activeWorkout.exercises.map((slot, idx) => {
              const completedCount = slot.sets.filter((s) => s.completed).length;
              const isAllDone = completedCount === slot.sets.length && slot.sets.length > 0;
              return (
                <div
                  key={slot.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    borderRadius: 'var(--tita-radius-sm)',
                    backgroundColor: isAllDone
                      ? 'rgba(16, 185, 129, 0.08)'
                      : 'var(--tita-surface-2)',
                    border: `1px solid ${isAllDone ? 'rgba(16, 185, 129, 0.25)' : 'var(--tita-border)'}`,
                    fontSize: '12px',
                  }}
                >
                  <span
                    style={{
                      fontWeight: isAllDone ? '600' : '500',
                      color: isAllDone ? 'var(--tita-text)' : 'var(--tita-text-secondary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      maxWidth: '130px',
                    }}
                    title={slot.exerciseName}
                  >
                    {idx + 1}. {slot.exerciseName}
                  </span>
                  <span
                    className="tita-num"
                    style={{
                      fontSize: '11px',
                      color: isAllDone ? 'var(--tita-accent)' : 'var(--tita-text-muted)',
                      fontWeight: 'bold',
                    }}
                  >
                    {isAllDone ? '✓' : `${completedCount}/${slot.sets.length}`}
                  </span>
                </div>
              );
            })}
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsAddExerciseDialogOpen(true)}
            style={{ width: '100%', marginTop: '4px' }}
          >
            + Adicionar Exercício
          </Button>
        </div>
      </aside>

      {/* Column 2: Center Workout Area */}
      <div
        className="tita-workout-center-col"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--tita-space-4)',
          flex: 1,
          minWidth: 0,
        }}
      >
        {/* Error Banner */}
        {errorMessage && (
          <StatusBanner
            type="error"
            message={errorMessage}
            onDismiss={() => setErrorMessage(null)}
          />
        )}

        {/* Success Banner */}
        {successNotice && (
          <StatusBanner
            type="success"
            message={successNotice}
            onDismiss={() => setSuccessNotice(null)}
          />
        )}

        {/* Header Card */}
        <Card
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--tita-space-2)' }}>
              <span>{activeWorkout.title}</span>
              {isPaused && (
                <span
                  style={{
                    fontSize: 'var(--tita-text-xs)',
                    backgroundColor: 'var(--tita-warning-bg)',
                    color: 'var(--tita-warning)',
                    padding: '2px 6px',
                    borderRadius: 'var(--tita-radius-sm)',
                    fontWeight: 'var(--tita-weight-bold)',
                  }}
                >
                  PAUSADO
                </span>
              )}
            </div>
          }
          subtitle={
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--tita-space-2)' }}>
              <span>Iniciado às {new Date(activeWorkout.startedAt).toLocaleTimeString()}</span>
              <span>•</span>
              <span
                style={{
                  color:
                    saveStatus === 'error'
                      ? 'var(--tita-error)'
                      : saveStatus === 'saving'
                        ? 'var(--tita-warning)'
                        : 'var(--tita-success)',
                  fontWeight: 'var(--tita-weight-medium)',
                }}
                data-testid="save-status-indicator"
              >
                {saveStatus === 'saving'
                  ? 'Salvando...'
                  : saveStatus === 'error'
                    ? 'Erro ao salvar'
                    : 'Salvo ✓'}
              </span>
            </div>
          }
          action={
            <div style={{ display: 'flex', gap: 'var(--tita-space-2)' }}>
              <Button
                variant="secondary"
                size="sm"
                onClick={isPaused ? handleResumeWorkout : handlePauseWorkout}
              >
                {isPaused ? 'Retomar' : 'Pausar'}
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsFinalizeDialogOpen(true)}
                data-testid="finalize-workout-button"
              >
                Finalizar
              </Button>
            </div>
          }
        >
          <div
            style={{
              display: 'flex',
              gap: 'var(--tita-space-4)',
              marginTop: 'var(--tita-space-2)',
            }}
          >
            <div style={{ fontSize: 'var(--tita-text-sm)', color: 'var(--tita-text-muted)' }}>
              Séries Concluídas:{' '}
              <strong style={{ color: 'var(--tita-text)' }} data-testid="completed-sets-counter">
                {totalCompletedSets} / {totalSetsCount}
              </strong>
            </div>
          </div>
        </Card>

        {/* Exercise List & Grouped Work Containers */}
        {(() => {
          const groups = activeWorkout.groups ?? [];
          const renderedGroupIds = new Set<string>();

          return activeWorkout.exercises.map((exerciseSlot) => {
            const group = groups.find((g) => g.exerciseSlotIds.includes(exerciseSlot.id));
            if (group) {
              if (renderedGroupIds.has(group.id)) {
                return null;
              }
              renderedGroupIds.add(group.id);
              const groupSlots = group.exerciseSlotIds
                .map((id) => activeWorkout.exercises.find((e) => e.id === id))
                .filter((e): e is NonNullable<typeof e> => Boolean(e));

              return (
                <div
                  key={group.id}
                  style={{
                    borderLeft: '4px solid var(--tita-accent)',
                    backgroundColor: 'var(--tita-surface-2)',
                    borderRadius: 'var(--tita-radius-md)',
                    padding: 'var(--tita-space-3)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--tita-space-3)',
                    marginBottom: 'var(--tita-space-2)',
                  }}
                  data-testid={`exercise-group-container-${group.id}`}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: 'var(--tita-space-2)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          fontWeight: 'bold',
                          fontSize: '11px',
                          padding: '3px 8px',
                          borderRadius: '12px',
                          backgroundColor: 'var(--tita-accent)',
                          color: '#ffffff',
                          textTransform: 'uppercase',
                        }}
                        data-testid={`group-badge-${group.id}`}
                      >
                        {group.type}
                      </span>
                      <span style={{ fontSize: '12px', color: 'var(--tita-text-muted)' }}>
                        {groupSlots.length} exercícios agrupados • Descanso entre rodadas:{' '}
                        {group.restAfterSeconds ?? 60}s
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveGroup(group.id)}
                      aria-label="Desagrupar exercícios"
                      data-testid={`ungroup-btn-${group.id}`}
                    >
                      Desagrupar
                    </Button>
                  </div>
                  <div
                    style={{ display: 'flex', flexDirection: 'column', gap: 'var(--tita-space-3)' }}
                  >
                    {groupSlots.map((slot) => renderExerciseSlot(slot, true))}
                  </div>
                </div>
              );
            }

            return renderExerciseSlot(exerciseSlot, false);
          });
        })()}

        {/* Add Exercise & Discard Actions */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: 'var(--tita-space-2)',
          }}
        >
          <Button variant="secondary" onClick={() => setIsAddExerciseDialogOpen(true)}>
            + Adicionar Exercício
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => setIsDiscardDialogOpen(true)}
            data-testid="discard-workout-button"
          >
            Descartar Treino
          </Button>
        </div>
      </div>

      {/* Column 3: Performance HUD (Desktop only) */}
      <aside className="tita-workout-hud-col">
        <DesktopWorkoutHud
          remainingSeconds={timerRemainingSeconds}
          timerStatus={
            timer?.status === TimerStatus.RUNNING
              ? 'RUNNING'
              : timer?.status === TimerStatus.PAUSED
                ? 'PAUSED'
                : 'IDLE'
          }
          completedSetsCount={totalCompletedSets}
          totalSetsCount={totalSetsCount}
          onTimerAdd30={() => handleAddTimerSeconds(30)}
          onFinalize={() => setIsFinalizeDialogOpen(true)}
          onPauseResume={isPaused ? handleResumeWorkout : handlePauseWorkout}
          isPaused={isPaused}
          totalVolumeKg={totalVolumeKg}
        />
      </aside>

      <MobileWorkoutHud
        remainingSeconds={timerRemainingSeconds}
        timerStatus={
          timer?.status === TimerStatus.RUNNING
            ? 'RUNNING'
            : timer?.status === TimerStatus.PAUSED
              ? 'PAUSED'
              : 'IDLE'
        }
        completedSetsCount={totalCompletedSets}
        totalSetsCount={totalSetsCount}
        onTimerAdd30={() => handleAddTimerSeconds(30)}
        onFinalize={() => setIsFinalizeDialogOpen(true)}
        onPauseResume={isPaused ? handleResumeWorkout : handlePauseWorkout}
        isPaused={isPaused}
        onMinimize={() => setFocusModeMinimized(true)}
      />

      {/* Dialog: Add Exercise */}
      <Dialog
        isOpen={isAddExerciseDialogOpen}
        onClose={() => setIsAddExerciseDialogOpen(false)}
        title="Adicionar Exercício"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsAddExerciseDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              disabled={!newExerciseName.trim()}
              onClick={handleAddExercise}
            >
              Adicionar
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--tita-space-3)' }}>
          <label
            htmlFor="new-exercise-input"
            style={{ fontSize: 'var(--tita-text-sm)', color: 'var(--tita-text-muted)' }}
          >
            Buscar na Biblioteca ou Digitar Nome:
          </label>
          <input
            id="new-exercise-input"
            value={newExerciseName}
            onChange={(e) => setNewExerciseName(e.target.value)}
            placeholder="Ex: Supino Inclinado com Halteres"
            style={{
              height: 'var(--tita-touch-min)',
              backgroundColor: 'var(--tita-surface-2)',
              color: 'var(--tita-text)',
              border: '1px solid var(--tita-border)',
              borderRadius: 'var(--tita-radius-sm)',
              padding: '0 var(--tita-space-3)',
              fontSize: 'var(--tita-text-base)',
            }}
          />

          {/* Quick suggestions from Exercise Library */}
          <div
            style={{
              maxHeight: '180px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            {libraryExercises
              .filter(
                (ex) =>
                  !newExerciseName.trim() ||
                  ex.name.toLowerCase().includes(newExerciseName.toLowerCase()) ||
                  ex.aliases.some((a) => a.toLowerCase().includes(newExerciseName.toLowerCase())),
              )
              .slice(0, 8)
              .map((ex) => (
                <div
                  key={ex.id}
                  onClick={() =>
                    handleAddExerciseWithDetails(ex.id, ex.name, ex.defaultRestSeconds ?? 90)
                  }
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 12px',
                    borderRadius: 'var(--tita-radius-sm)',
                    backgroundColor: 'var(--tita-surface)',
                    border: '1px solid var(--tita-border)',
                    cursor: 'pointer',
                    fontSize: 'var(--tita-text-sm)',
                  }}
                >
                  <div>
                    <span style={{ fontWeight: 'bold' }}>{ex.name}</span>
                    <span
                      style={{
                        fontSize: '11px',
                        color: 'var(--tita-text-muted)',
                        marginLeft: '6px',
                      }}
                    >
                      ({ex.primaryMuscle} • {ex.equipment})
                    </span>
                  </div>
                  <Button size="sm" variant="ghost">
                    + Adicionar
                  </Button>
                </div>
              ))}
          </div>
        </div>
      </Dialog>

      {substitutionSlotId && activeWorkout.exercises.find((s) => s.id === substitutionSlotId) && (
        <ExerciseSubstitutionDialog
          workout={activeWorkout}
          slot={activeWorkout.exercises.find((s) => s.id === substitutionSlotId)!}
          catalog={libraryExercises}
          favorites={favoriteExerciseIds}
          onClose={() => setSubstitutionSlotId(null)}
          onConfirm={async (replacementId, reason) => {
            if (!service) return;
            const updated = await service.substituteExercise(
              activeWorkout.id,
              substitutionSlotId,
              replacementId,
              reason,
            );
            setActiveWorkout(updated);
            setActiveExerciseSlotId(updated.substitutions?.at(-1)?.toSlotId ?? null);
            setSubstitutionSlotId(null);
            setSuccessNotice(
              'Exercício trocado. Séries concluídas preservadas. Confira a carga antes de continuar.',
            );
          }}
        />
      )}

      {/* Dialog: Finalize Workout Confirmation */}
      <Dialog
        isOpen={isFinalizeDialogOpen}
        onClose={() => setIsFinalizeDialogOpen(false)}
        title="Finalizar Sessão de Treino?"
        description={`Você completou ${totalCompletedSets} de ${totalSetsCount} séries nesta sessão. Deseja congelar o snapshot histórico?`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsFinalizeDialogOpen(false)}>
              Continuar Treinando
            </Button>
            <Button
              variant="primary"
              onClick={handleFinalizeWorkout}
              data-testid="confirm-finalize-button"
            >
              Confirmar e Salvar
            </Button>
          </>
        }
      />

      {/* Dialog: Discard Workout Confirmation */}
      <Dialog
        isOpen={isDiscardDialogOpen}
        onClose={() => setIsDiscardDialogOpen(false)}
        title="Descartar Sessão de Treino?"
        description="Esta ação apagará a sessão ativa atual. Todas as séries desta sessão serão descartadas."
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsDiscardDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={handleDiscardWorkout}
              data-testid="confirm-discard-workout"
            >
              Sim, Descartar
            </Button>
          </>
        }
      />

      {/* Dialog: Create Exercise Group (Superset / Circuit) */}
      <Dialog
        isOpen={isGroupDialogOpen}
        onClose={() => setIsGroupDialogOpen(false)}
        title="Criar Agrupamento (Superset / Circuito)"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsGroupDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              disabled={selectedGroupSlots.length < 2}
              onClick={handleCreateGroup}
              data-testid="confirm-create-group-btn"
            >
              Confirmar Grupo
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--tita-space-3)' }}>
          <div>
            <label
              htmlFor="select-group-type-input"
              style={{ fontSize: 'var(--tita-text-xs)', color: 'var(--tita-text-muted)' }}
            >
              Tipo de Agrupamento:
            </label>
            <select
              id="select-group-type-input"
              value={groupType}
              onChange={(e) => setGroupType(e.target.value as GroupType)}
              style={{
                width: '100%',
                marginTop: '4px',
                padding: '8px',
                backgroundColor: 'var(--tita-surface-2)',
                color: 'var(--tita-text)',
                border: '1px solid var(--tita-border)',
                borderRadius: 'var(--tita-radius-sm)',
              }}
              data-testid="select-group-type"
            >
              <option value={GroupType.SUPERSET}>Bi-set / Superset (2 exercícios)</option>
              <option value={GroupType.TRI_SET}>Tri-set (3 exercícios)</option>
              <option value={GroupType.GIANT_SET}>Giant Set (4+ exercícios)</option>
              <option value={GroupType.CIRCUIT}>Circuito Geral</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="group-rest-seconds-input"
              style={{ fontSize: 'var(--tita-text-xs)', color: 'var(--tita-text-muted)' }}
            >
              Descanso após rodada completa (segundos):
            </label>
            <input
              id="group-rest-seconds-input"
              type="number"
              min="0"
              step="15"
              value={groupRestSeconds}
              onChange={(e) => setGroupRestSeconds(Number(e.target.value) || 0)}
              style={{
                width: '100%',
                marginTop: '4px',
                padding: '8px',
                backgroundColor: 'var(--tita-surface-2)',
                color: 'var(--tita-text)',
                border: '1px solid var(--tita-border)',
                borderRadius: 'var(--tita-radius-sm)',
              }}
            />
          </div>

          <div>
            <span style={{ fontSize: 'var(--tita-text-xs)', color: 'var(--tita-text-muted)' }}>
              Selecione os exercícios do grupo (mínimo 2):
            </span>
            <div
              style={{
                marginTop: '6px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                maxHeight: '180px',
                overflowY: 'auto',
              }}
            >
              {activeWorkout?.exercises.map((slot) => (
                <label
                  key={slot.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 10px',
                    backgroundColor: 'var(--tita-surface-2)',
                    borderRadius: 'var(--tita-radius-sm)',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedGroupSlots.includes(slot.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedGroupSlots((prev) => [...prev, slot.id]);
                      } else {
                        setSelectedGroupSlots((prev) => prev.filter((id) => id !== slot.id));
                      }
                    }}
                    data-testid={`checkbox-group-slot-${slot.id}`}
                  />
                  <span style={{ fontSize: 'var(--tita-text-sm)' }}>{slot.exerciseName}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </Dialog>

      <style>{`
        @media (min-width: 1025px) {
          .tita-active-workout-layout {
            display: grid !important;
            grid-template-columns: 260px minmax(0, 1fr) !important;
            gap: var(--tita-space-6) !important;
            align-items: start !important;
          }
          .tita-mobile-hud {
            display: none !important;
          }
          .tita-workout-hud-col { grid-column: 1; grid-row: 1; }
          .tita-workout-queue-col { grid-column: 1; grid-row: 2; }
          .tita-workout-center-col { grid-column: 2; grid-row: 1 / span 3; }
        }

        @media (max-width: 1024px) {
          .tita-workout-queue-col,
          .tita-workout-hud-col {
            display: none !important;
          }
          .tita-active-workout-layout {
            display: flex !important;
            flex-direction: column !important;
            gap: var(--tita-space-4) !important;
            max-width: 720px !important;
            padding-bottom: 80px !important;
          }
        }
      `}</style>
    </div>
  );
};

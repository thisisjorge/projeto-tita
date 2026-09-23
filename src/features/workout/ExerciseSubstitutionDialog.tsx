import { useEffect, useMemo, useRef, useState } from 'react';
import { builtinExerciseName } from '../../data/builtin-display.js';
import type { Exercise } from '../../domain/entities/exercise.js';
import type { ActiveWorkout, ActiveWorkoutExercise } from '../../domain/entities/active-workout.js';
import {
  rankSubstitutions,
  substitutionCatalogId,
  SUBSTITUTION_REASONS,
  type SubstitutionReason,
} from '../../domain/workout/substitution.js';
import { Button, Dialog } from '../../ui/components/index.js';
import { CompositeExerciseMediaProvider } from '../../media/composite-media-provider.js';
import { useIntelligence } from '../../intelligence/session.js';
import { serializeSummary } from '../../intelligence/contracts.js';
import {
  substitutionSummary,
  refineSubstitutions,
  type JudgedCandidate,
} from '../../intelligence/substitution-judge.js';
import '../intelligence/intelligence.css';
import './substitution.css';

const mediaProvider = new CompositeExerciseMediaProvider();
export function ExerciseSubstitutionDialog({
  workout,
  slot,
  catalog,
  favorites,
  onClose,
  onConfirm,
}: {
  workout: ActiveWorkout;
  slot: ActiveWorkoutExercise;
  catalog: readonly Exercise[];
  favorites: readonly string[];
  onClose: () => void;
  onConfirm: (exerciseId: string, reason: SubstitutionReason) => Promise<void>;
}) {
  const current = catalog.find((e) => e.id === substitutionCatalogId(slot.exerciseId))!;
  const state = useIntelligence();
  const [reason, setReason] = useState<SubstitutionReason>('occupied');
  const [equipment, setEquipment] = useState('');
  const local = useMemo(
    () =>
      rankSubstitutions(current, catalog, {
        reason,
        excludedIds: workout.exercises.map((s) => s.exerciseId),
        favoriteIds: favorites,
        availableEquipment: equipment ? [equipment] : undefined,
        limit: 5,
      }),
    [current, catalog, reason, workout.exercises, favorites, equipment],
  );
  const [judged, setJudged] = useState<JudgedCandidate[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => {
    controller.current?.abort();
    setJudged(null);
    setSelected(null);
    setBusy(false);
    setNotice('');
    setPreview(false);
    return () => controller.current?.abort();
  }, [local, state.revision]);
  const candidates: JudgedCandidate[] = judged ?? local;
  const destination = state.fastJudge ?? state;
  const summary = useMemo(
    () => substitutionSummary(current, local, catalog, reason),
    [current, local, catalog, reason],
  );
  const refine = async () => {
    const request = new AbortController();
    controller.current = request;
    setBusy(true);
    setNotice('Refinando sugestões… Você já pode escolher uma alternativa.');
    const result = await refineSubstitutions(summary, local, request.signal);
    if (request.signal.aborted) return;
    setJudged(result.source === 'judge' ? result.candidates : null);
    setNotice(result.notice);
    setBusy(false);
  };
  return (
    <Dialog
      isOpen
      onClose={onClose}
      title="Trocar exercício"
      description={builtinExerciseName(slot.exerciseId, slot.exerciseName)}
      className="tita-substitution-sheet"
      footer={
        <Button
          disabled={!selected || saving}
          onClick={async () => {
            if (!selected) return;
            controller.current?.abort();
            setBusy(false);
            setSaving(true);
            try {
              await onConfirm(selected, reason);
            } catch {
              setNotice(
                'Não foi possível salvar a troca. O treino foi preservado. Tente novamente.',
              );
              setSaving(false);
            }
          }}
        >
          {saving ? 'Salvando…' : 'Confirmar troca'}
        </Button>
      }
    >
      <div className="tita-substitution">
        <div className="tita-substitution__reasons" aria-label="Motivo da troca">
          {Object.entries(SUBSTITUTION_REASONS).map(([id, label]) => (
            <Button
              key={id}
              size="sm"
              variant={reason === id ? 'primary' : 'secondary'}
              aria-pressed={reason === id}
              onClick={() => setReason(id as SubstitutionReason)}
            >
              {label}
            </Button>
          ))}
        </div>
        <label className="tita-intelligence__field">
          Equipamento para a alternativa
          <select value={equipment} onChange={(e) => setEquipment(e.target.value)}>
            <option value="">Todos disponíveis</option>
            {[...new Set(catalog.map((e) => e.equipment))].sort().map((e) => (
              <option key={e}>{e}</option>
            ))}
          </select>
        </label>
        <p className="tita-substitution__note">
          Só as séries futuras mudam. A carga virá do histórico do substituto; sem histórico, ficará
          vazia.
        </p>
        <h3>{judged ? 'Ordem refinada · Fast Judge' : 'Sugestões locais'}</h3>
        {candidates.length === 0 && (
          <p>Nenhuma alternativa com esse equipamento. Ajuste o filtro ou o motivo.</p>
        )}
        <div className="tita-substitution__list">
          {candidates.map((candidate) => {
            const exercise = catalog.find((e) => e.id === candidate.exerciseId)!;
            const media = mediaProvider.resolveMedia(exercise);
            const artwork = media.frames?.[0] ?? media.thumbnail;
            return (
              <button
                type="button"
                key={exercise.id}
                className="tita-substitution__candidate"
                aria-pressed={selected === exercise.id}
                onClick={() => {
                  setSelected(exercise.id);
                  controller.current?.abort();
                  setBusy(false);
                }}
              >
                {artwork && (
                  <img
                    className="tita-exercise-illustration"
                    src={artwork}
                    alt=""
                    width="56"
                    height="68"
                  />
                )}
                <span>
                  <strong>{exercise.name}</strong>
                  <span>
                    {exercise.primaryMuscle} · {exercise.equipment}
                  </span>
                  <span className="tita-substitution__equivalence">
                    {candidate.equivalence === 'high'
                      ? 'Alta afinidade no catálogo'
                      : 'Equivalência parcial · revise o estímulo'}
                  </span>
                  <span>{candidate.judgeReason ?? candidate.reasons.join(' · ')}</span>
                  {selected === exercise.id && <b>Selecionado · confirme abaixo</b>}
                </span>
              </button>
            );
          })}
        </div>
        {state.enabled && candidates.length > 0 && (
          <div className="tita-intelligence">
            <Button
              variant="secondary"
              onClick={() => setPreview(!preview)}
              aria-expanded={preview}
            >
              Refinar com Fast Judge
            </Button>
            {preview && (
              <>
                <p>
                  Envio opcional de exercício, motivo e candidatos. Sem histórico ou notas. Pode
                  gerar cobrança no provider.
                </p>
                <p className="tita-intelligence__meta">
                  {destination.endpoint} · {destination.model}
                </p>
                <details>
                  <summary>Ver JSON que será enviado</summary>
                  <pre className="tita-intelligence__preview">{serializeSummary(summary)}</pre>
                </details>
                <Button disabled={busy} onClick={refine}>
                  Enviar candidatos e refinar
                </Button>
              </>
            )}
          </div>
        )}
        <p role="status">{notice}</p>
        <p className="tita-substitution__note">
          O catálogo agrupa movimentos amplos; alternativas não são biomecanicamente idênticas. Se
          houver dor, interrompa o movimento. O Titã não avalia lesões.
        </p>
      </div>
    </Dialog>
  );
}

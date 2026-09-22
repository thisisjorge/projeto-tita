import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { Exercise } from '../../domain/entities/exercise.js';
import { ExerciseLibraryService } from '../../services/exercise-library-service.js';
import {
  Card,
  Field,
  Button,
  EmptyState,
  PlusIcon,
  SearchIcon,
  StarIcon,
  ArrowRightIcon,
  FilterIcon,
} from '../../ui/components/index.js';
import { ExerciseDetailDialog } from './ExerciseDetailDialog.js';
import { CreateCustomExerciseDialog } from './CreateCustomExerciseDialog.js';
import { CompositeExerciseMediaProvider } from '../../media/composite-media-provider.js';

const MUSCLE_FILTERS = [
  'Todos',
  'Peito',
  'Costas',
  'Ombros',
  'Quadríceps',
  'Posteriores',
  'Glúteos',
  'Bíceps',
  'Tríceps',
  'Panturrilhas',
  'Abdômen',
];

const EQUIPMENT_FILTERS = ['Todos', 'Barra', 'Halteres', 'Polia', 'Máquina', 'Peso Corporal'];

export const LibraryView: React.FC = () => {
  const service = useMemo(() => new ExerciseLibraryService(), []);
  const mediaProvider = useMemo(() => new CompositeExerciseMediaProvider(), []);

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState('Todos');
  const [selectedEquipment, setSelectedEquipment] = useState('Todos');
  const [selectedSource, setSelectedSource] = useState<'all' | 'system' | 'custom' | 'favorites'>(
    'all',
  );
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  // Dialog states
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [exerciseToEdit, setExerciseToEdit] = useState<Exercise | null>(null);

  const loadExercises = useCallback(async () => {
    setIsLoading(true);
    try {
      await service.initialize();
      const favs = await service.getFavoriteIds();
      setFavoriteIds(new Set(favs));

      const filterOpts = {
        search: searchTerm,
        muscle: selectedMuscle === 'Todos' ? undefined : selectedMuscle,
        equipment: selectedEquipment === 'Todos' ? undefined : selectedEquipment,
        source:
          selectedSource === 'all' || selectedSource === 'favorites' ? undefined : selectedSource,
        onlyFavorites: selectedSource === 'favorites',
      };

      const result = await service.getExercises(filterOpts);
      setExercises(result);
    } catch (err) {
      console.error('Erro ao carregar exercícios:', err);
    } finally {
      setIsLoading(false);
    }
  }, [service, searchTerm, selectedMuscle, selectedEquipment, selectedSource]);

  useEffect(() => {
    loadExercises();
  }, [loadExercises]);

  const handleToggleFav = async (e: React.MouseEvent, exId: string) => {
    e.stopPropagation();
    const isNowFav = await service.toggleFavorite(exId);
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (isNowFav) next.add(exId);
      else next.delete(exId);
      return next;
    });
  };

  const handleOpenDetail = (ex: Exercise) => {
    setSelectedExercise(ex);
    setIsDetailOpen(true);
  };

  const handleOpenCreate = () => {
    setExerciseToEdit(null);
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (ex: Exercise) => {
    setIsDetailOpen(false);
    setExerciseToEdit(ex);
    setIsCreateOpen(true);
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
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 'var(--tita-space-3)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--tita-space-2)' }}>
            <h2
              style={{
                fontFamily: 'var(--tita-font-display)',
                fontSize: 'clamp(1.25rem, 3.5vw, 1.8rem)',
                fontWeight: 'var(--tita-weight-bold)',
                letterSpacing: '0.02em',
                color: 'var(--tita-text)',
                margin: 0,
              }}
            >
              Biblioteca de Exercícios
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
              {exercises.length}
            </span>
          </div>
          <p
            className="tita-library-subtitle"
            style={{
              fontSize: 'var(--tita-text-xs)',
              color: 'var(--tita-text-muted)',
              margin: '2px 0 0 0',
            }}
          >
            Catálogo técnico de movimentos e orientações.
            <span className="sr-only">100% offline</span>
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={handleOpenCreate}
          data-testid="create-custom-exercise-btn"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            minHeight: '44px',
            padding: '6px 14px',
            flexShrink: 0,
          }}
        >
          <PlusIcon size={16} color="var(--tita-primary-contrast)" />
          <span>Criar Exercício</span>
        </Button>
      </div>

      {/* Search Input */}
      <div style={{ position: 'relative' }}>
        <Field
          label="Buscar exercícios"
          hideLabel
          placeholder="Buscar por nome ou sinônimo (ex: Supino, Deadlift, Agachamento)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Muscle Filter Horizontal Pills */}
      <div
        role="region"
        aria-label="Filtro por grupo muscular"
        style={{
          display: 'flex',
          gap: 'var(--tita-space-2)',
          overflowX: 'auto',
          paddingBottom: 'var(--tita-space-1)',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
        }}
      >
        {MUSCLE_FILTERS.map((muscle) => {
          const isSelected = selectedMuscle === muscle;
          return (
            <button
              key={muscle}
              type="button"
              onClick={() => setSelectedMuscle(muscle)}
              aria-pressed={isSelected}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 var(--tita-space-3)',
                minHeight: '44px',
                borderRadius: 'var(--tita-radius-pill)',
                fontSize: 'var(--tita-text-sm)',
                fontWeight: isSelected ? 'var(--tita-weight-bold)' : 'var(--tita-weight-medium)',
                backgroundColor: isSelected ? 'var(--tita-primary)' : 'var(--tita-surface-2)',
                color: isSelected ? 'var(--tita-primary-contrast)' : 'var(--tita-text)',
                border: isSelected
                  ? '1px solid var(--tita-primary)'
                  : '1px solid var(--tita-border)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'background-color 0.15s ease, color 0.15s ease',
              }}
            >
              {muscle}
            </button>
          );
        })}
      </div>

      {/* Secondary Filters: Equipment & Source */}
      <div
        className="tita-library-secondary-filters"
        style={{
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
          overflowX: 'auto',
          padding: '6px 8px',
          backgroundColor: 'var(--tita-surface-1)',
          borderRadius: 'var(--tita-radius-md)',
          border: '1px solid var(--tita-border)',
          scrollbarWidth: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          <label
            htmlFor="library-equipment-filter"
            style={{
              fontSize: '11px',
              color: 'var(--tita-text-muted)',
              fontWeight: 'var(--tita-weight-bold)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            Equip:
          </label>
          <select
            id="library-equipment-filter"
            aria-label="Filtrar por equipamento"
            value={selectedEquipment}
            onChange={(e) => setSelectedEquipment(e.target.value)}
            style={{
              minHeight: '36px',
              backgroundColor: 'var(--tita-surface-2)',
              color: 'var(--tita-text)',
              border: '1px solid var(--tita-border)',
              borderRadius: 'var(--tita-radius-sm)',
              padding: '0 8px',
              fontSize: '12px',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            {EQUIPMENT_FILTERS.map((eq) => (
              <option key={eq} value={eq}>
                {eq}
              </option>
            ))}
          </select>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            flexShrink: 0,
          }}
        >
          <Button
            size="sm"
            variant={selectedSource === 'all' ? 'primary' : 'ghost'}
            onClick={() => setSelectedSource('all')}
            style={{ minHeight: '36px', minWidth: '46px', padding: '0 8px', fontSize: '12px' }}
          >
            Todos
          </Button>
          <Button
            size="sm"
            variant={selectedSource === 'system' ? 'primary' : 'ghost'}
            onClick={() => setSelectedSource('system')}
            style={{ minHeight: '36px', minWidth: '50px', padding: '0 8px', fontSize: '12px' }}
          >
            Padrão
          </Button>
          <Button
            size="sm"
            variant={selectedSource === 'custom' ? 'primary' : 'ghost'}
            onClick={() => setSelectedSource('custom')}
            style={{ minHeight: '36px', minWidth: '60px', padding: '0 8px', fontSize: '12px' }}
          >
            Personalizados
          </Button>
          <Button
            size="sm"
            variant={selectedSource === 'favorites' ? 'primary' : 'ghost'}
            onClick={() => setSelectedSource('favorites')}
            style={{
              minHeight: '36px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '0 10px',
              fontSize: '12px',
            }}
          >
            <StarIcon size={13} filled={selectedSource === 'favorites'} />
            <span>Favoritos</span>
          </Button>
        </div>
      </div>

      {/* Exercise Cards Grid */}
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
              border: '2px solid var(--tita-accent)',
              borderTopColor: 'transparent',
              animation: 'spin 0.8s linear infinite',
            }}
          />
          <span>Carregando catálogo de exercícios...</span>
        </div>
      ) : exercises.length === 0 ? (
        <EmptyState
          title="Nenhum exercício encontrado"
          description="Tente ajustar os filtros ou a busca por nome para encontrar outros exercícios."
          actionLabel="Limpar Filtros"
          onAction={() => {
            setSearchTerm('');
            setSelectedMuscle('Todos');
            setSelectedEquipment('Todos');
            setSelectedSource('all');
          }}
        />
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: 'var(--tita-space-3)',
          }}
          data-testid="exercise-cards-grid"
        >
          {exercises.map((ex) => {
            const isFav = favoriteIds.has(ex.id);
            const hasAnimation = (mediaProvider.resolveMedia(ex).frames?.length ?? 0) > 1;
            const iconSvg = mediaProvider.getFallbackProvider().getIconSvg(ex);

            return (
              <Card key={ex.id}>
                <div
                  onClick={() => handleOpenDetail(ex)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                    cursor: 'pointer',
                    justifyContent: 'space-between',
                  }}
                  data-testid={`exercise-card-${ex.id}`}
                >
                  <div
                    style={{
                      display: 'flex',
                      gap: 'var(--tita-space-3)',
                      alignItems: 'flex-start',
                    }}
                  >
                    {/* Authentic Exercise Movement Illustration Thumbnail (84px mobile / 96px desktop) */}
                    <div
                      className="tita-exercise-thumb"
                      style={{
                        flexShrink: 0,
                        backgroundColor: 'var(--tita-surface-2)',
                        borderRadius: 'var(--tita-radius-md)',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px solid var(--tita-border)',
                        position: 'relative',
                      }}
                    >
                      {mediaProvider.getPrimaryProvider().getThumbnail(ex) ? (
                        <img
                          className="tita-exercise-illustration"
                          src={mediaProvider.getPrimaryProvider().getThumbnail(ex)!}
                          alt={ex.name}
                          loading="lazy"
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                            padding: '4px',
                          }}
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = 'none';
                            const fallback = e.currentTarget
                              .nextElementSibling as HTMLElement | null;
                            if (fallback) fallback.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div
                        style={{
                          display: mediaProvider.getPrimaryProvider().getThumbnail(ex)
                            ? 'none'
                            : 'flex',
                          width: '100%',
                          height: '100%',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '8px',
                          color: 'var(--tita-accent)',
                        }}
                        dangerouslySetInnerHTML={{ __html: iconSvg }}
                      />
                    </div>

                    {/* Title & Badges */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontFamily: 'var(--tita-font-sans)',
                          fontSize: 'var(--tita-text-base)',
                          fontWeight: 'var(--tita-weight-bold)',
                          color: 'var(--tita-text)',
                          lineHeight: '1.3',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          minHeight: '2.6em',
                        }}
                      >
                        {ex.name}
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          gap: '6px',
                          alignItems: 'center',
                          marginTop: '4px',
                          flexWrap: 'wrap',
                        }}
                      >
                        <span
                          style={{
                            fontSize: '11px',
                            backgroundColor: 'var(--tita-surface-2)',
                            color: 'var(--tita-text-muted)',
                            padding: '1px 6px',
                            borderRadius: 'var(--tita-radius-sm)',
                            border: '1px solid var(--tita-border)',
                          }}
                        >
                          {ex.primaryMuscle}
                        </span>
                        <span
                          style={{
                            fontSize: '11px',
                            backgroundColor: 'var(--tita-surface-2)',
                            color: 'var(--tita-text-muted)',
                            padding: '1px 6px',
                            borderRadius: 'var(--tita-radius-sm)',
                            border: '1px solid var(--tita-border)',
                          }}
                        >
                          {ex.equipment}
                        </span>
                      </div>
                    </div>

                    {/* Favorite Star Button - Touch Target >= 44px */}
                    <button
                      type="button"
                      onClick={(e) => handleToggleFav(e, ex.id)}
                      aria-label={isFav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                      style={{
                        background: 'none',
                        border: 'none',
                        width: '44px',
                        height: '44px',
                        cursor: 'pointer',
                        color: isFav ? 'var(--tita-accent)' : 'var(--tita-text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        borderRadius: 'var(--tita-radius-sm)',
                      }}
                    >
                      <StarIcon size={20} filled={isFav} />
                    </button>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginTop: 'var(--tita-space-3)',
                      paddingTop: 'var(--tita-space-2)',
                      borderTop: '1px solid var(--tita-border)',
                      fontSize: 'var(--tita-text-xs)',
                      color: 'var(--tita-text-muted)',
                    }}
                  >
                    <span>
                      {ex.source === 'custom' ? (
                        <span
                          style={{
                            color: '#A78BFA',
                            fontWeight: 'bold',
                            backgroundColor: 'rgba(167, 139, 250, 0.1)',
                            padding: '2px 6px',
                            borderRadius: 'var(--tita-radius-sm)',
                            border: '1px solid rgba(167, 139, 250, 0.2)',
                          }}
                        >
                          Personalizado
                        </span>
                      ) : (
                        <span
                          style={{
                            backgroundColor: 'var(--tita-surface-2)',
                            padding: '2px 6px',
                            borderRadius: 'var(--tita-radius-sm)',
                          }}
                        >
                          {ex.category}
                        </span>
                      )}
                    </span>
                    <span
                      style={{
                        color: 'var(--tita-accent)',
                        fontWeight: 'var(--tita-weight-bold)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '2px',
                      }}
                    >
                      <span>{hasAnimation ? 'Ver animação' : 'Ver Detalhes'}</span>
                      <ArrowRightIcon size={12} />
                    </span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Biomechanical Attribution & Offline Guarantee */}
      <div
        style={{
          marginTop: 'var(--tita-space-6)',
          padding: 'var(--tita-space-3) var(--tita-space-4)',
          backgroundColor: 'var(--tita-surface-1)',
          borderRadius: 'var(--tita-radius-sm)',
          border: '1px solid var(--tita-border)',
          fontSize: 'var(--tita-text-xs)',
          color: 'var(--tita-text-muted)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--tita-space-2)',
        }}
      >
        <FilterIcon size={14} color="var(--tita-text-muted)" />
        <span>Ilustrações biomecânicas disponíveis offline quando incluídas no pacote local.</span>
      </div>

      <ExerciseDetailDialog
        exercise={selectedExercise}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onEdit={handleOpenEdit}
      />

      <CreateCustomExerciseDialog
        isOpen={isCreateOpen}
        exercise={exerciseToEdit}
        onClose={() => setIsCreateOpen(false)}
        onSaved={loadExercises}
      />
    </div>
  );
};

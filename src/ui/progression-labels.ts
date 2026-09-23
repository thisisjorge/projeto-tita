export const PROGRESSION_LABELS: Record<string, string> = {
  MANUAL: 'Manual',
  LINEAR_PROGRESSION: 'Progressão Linear',
  DOUBLE_PROGRESSION: 'Progressão Dupla',
  DYNAMIC_DOUBLE_PROGRESSION: 'Progressão Dupla Dinâmica',
  REP_GOAL: 'Meta de repetições',
  PERCENTAGE_BASED: 'Percentual de 1RM',
  RPE_RIR_BASED: 'Autorregulação RPE/RIR',
  TOP_SET_BACKOFF: 'Top Set + Backoff',
  CUSTOM: 'Personalizada',
};

export function progressionText(text: string): string {
  return text
    .replace('Dynamic Double Progression', 'Progressão Dupla Dinâmica')
    .replace('Double Progression', 'Progressão Dupla')
    .replace('Rep Goal', 'Meta de repetições')
    .replace(/^Custom:/, 'Personalizada:')
    .replace(
      /(\d+(?:\.\d+)?)kg\b/g,
      (_, number: string) => `${Number(number).toLocaleString('pt-BR')} kg`,
    );
}

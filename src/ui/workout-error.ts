export function workoutErrorMessage(error: unknown): string {
  if (import.meta.env.DEV) console.error(error);
  const message = error instanceof Error ? error.message : String(error);
  if (message.startsWith('Invalid exercise set:')) {
    if (message.includes('reps'))
      return 'Esta série precisa ter um número inteiro válido de repetições antes de ser concluída.';
    return 'Confira os valores da série. Use números válidos e não negativos.';
  }
  if (message.startsWith('FINALIZATION_FAILED:'))
    return 'Não foi possível concluir. Confira as séries e marque pelo menos uma como concluída.';
  if (message === 'WORKOUT_COMPLETED') return 'Este treino já foi concluído. Consulte o histórico.';
  if (/not found|undefined at index|WORKOUT_NOT_FOUND/.test(message))
    return 'Não foi possível encontrar este registro. Reabra o treino e tente novamente.';
  if (/^[A-Z_]+:|Error|transaction|database|IndexedDB|Quota/i.test(message))
    return 'Não foi possível salvar a alteração no dispositivo. Tente novamente.';
  // Existing Portuguese application errors are already intended for the athlete.
  return /[ãáéíóúçêõ]|Não|Erro|Treino|Série/.test(message)
    ? message
    : 'Não foi possível concluir esta ação. Tente novamente.';
}

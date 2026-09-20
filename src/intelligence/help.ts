import type { Exercise } from '../domain/entities/exercise.js';
import type { ActiveWorkoutExercise } from '../domain/entities/active-workout.js';
import type { ExerciseSet } from '../domain/entities/exercise-set.js';
import type { ProgressionSuggestion } from '../domain/progression/types.js';
import { IntelligenceError, serializeSummary, type StructuredSummary } from './contracts.js';
import { progressionSummary } from './summaries.js';

export type HelpScreen = 'workout' | 'progress' | 'routine' | 'library' | 'settings';
export const helpQuestions: Record<HelpScreen, readonly string[]> = {
  workout: [
    'O que é RIR?',
    'O que é RPE?',
    'Por que apareceu esta meta?',
    'Como funciona o descanso?',
    'Como trocar este exercício?',
  ],
  progress: [
    'O que é e1RM?',
    'O que significa platô?',
    'Como interpretar este gráfico?',
    'Por que meu volume mudou?',
  ],
  routine: [
    'O que é progressão?',
    'Como funciona Double Progression?',
    'Como funciona a estratégia escolhida?',
  ],
  library: [
    'O que este exercício trabalha?',
    'O que significam estas instruções?',
    'Como comparar exercícios semelhantes?',
  ],
  settings: [
    'O que é BYOK?',
    'Minha chave fica salva?',
    'O que é enviado para o provider?',
    'Qual a diferença entre modelo principal e Fast Judge?',
  ],
};
const knowledge: [string, string][] = [
  [
    'O que é RIR?',
    'RIR é a estimativa de repetições que ainda seriam possíveis ao terminar uma série. RIR 2 significa que você acredita que conseguiria mais duas. É uma percepção de esforço, não uma medição exata. Registre no menu da série se esse campo estiver ativado em Ajustes.',
  ],
  [
    'O que é RPE?',
    'RPE registra o esforço percebido da série. No Titã, a escala vai de 1 a 10: números maiores indicam mais esforço. Use o mesmo critério ao comparar seus registros; não é uma escala de dor.',
  ],
  [
    'O que é e1RM?',
    'e1RM é uma estimativa da carga máxima para uma repetição, calculada a partir da carga e das repetições registradas. O gráfico usa Epley. Compare tendências do mesmo exercício; a estimativa não é um teste real nem uma recomendação de carga.',
  ],
  [
    'O que significa platô?',
    'O Titã sinaliza um possível platô quando a métrica deixa de avançar em exposições recentes suficientes. É uma heurística do histórico registrado, não um diagnóstico. Confira frequência, registros e período antes de interpretar o alerta.',
  ],
  [
    'O que é volume?',
    'Volume de carga soma carga × repetições das séries consideradas pela métrica. Mais séries ou repetições podem aumentar o volume mesmo sem aumentar a carga. Aquecimentos e séries incompletas podem ser tratados de forma diferente por cada indicador.',
  ],
  [
    'O que é PR?',
    'PR é um recorde pessoal calculado a partir de séries concluídas. Pode representar carga, repetições, volume ou e1RM; confira a categoria ao comparar recordes.',
  ],
  [
    'O que é progressão?',
    'Progressão organiza ajustes de carga ou repetições com base nos registros e na estratégia escolhida. No Titã, o motor local calcula a sugestão e você decide se aplica. A IA não altera seu treino.',
  ],
  [
    'Como funciona Double Progression?',
    'Double Progression trabalha com uma faixa de repetições. Primeiro a sugestão busca avançar nas repetições; ao cumprir os critérios da estratégia, pode propor um incremento de carga. Confira a evidência e a meta exibidas antes de aplicar.',
  ],
  [
    'Como funciona o descanso?',
    'Ao concluir uma série, o temporizador usa o descanso configurado. Você pode pausar ou ajustar o tempo. O fim da contagem é um aviso: não conclui séries nem obriga você a iniciar a próxima.',
  ],
  [
    'Como trocar este exercício?',
    'Abra ⋯ no exercício e escolha Trocar exercício. Selecione o motivo, confira as alternativas locais e confirme. Séries concluídas permanecem no exercício original; somente as futuras são substituídas. Sem histórico do substituto, a carga fica em branco.',
  ],
  [
    'Como interpretar este gráfico?',
    'Confira exercício, período e métrica selecionados. Cada ponto representa uma sessão registrada. Carga máxima, e1RM, volume e repetições medem aspectos diferentes; uma curva isolada não resume todo o treino.',
  ],
  [
    'Como comparar exercícios semelhantes?',
    'Compare músculos, equipamento e instruções no catálogo. Afinidade não significa execução idêntica ou cargas equivalentes. Abra uma alternativa para consultar suas instruções antes de escolher.',
  ],
  [
    'O que é BYOK?',
    'BYOK significa usar sua própria chave de API. Você escolhe o provider e o modelo; disponibilidade, cotas e custos dependem da sua conta. O treino funciona sem IA.',
  ],
  [
    'Minha chave fica salva?',
    'No Web/PWA, a chave fica somente na memória desta aba. Recarregar ou desativar Titã Intelligence a remove. Ela não entra em backup, export ou IndexedDB. Extensões e scripts comprometidos ainda podem acessar a memória da página.',
  ],
  [
    'O que é enviado para o provider?',
    'Somente a pergunta e o resumo exibidos no preview são enviados após sua confirmação. A chave autentica a chamada; não faz parte do resumo. Não inclua informações pessoais no texto livre. O provider aplica sua própria política de retenção.',
  ],
  [
    'Qual a diferença entre modelo principal e Fast Judge?',
    'O modelo principal responde análises e perguntas contextuais. Fast Judge é opcional e reordena alternativas de troca; pode reutilizar o principal ou ter configuração separada. Se falhar ou exceder 4,5 segundos, a ordem local permanece.',
  ],
  [
    'Como fazer backup?',
    'Em Ajustes, exporte um backup e guarde o arquivo em um local seu. Para restaurar, importe o arquivo e revise a prévia. Backups contêm dados de treino: compartilhe apenas quando quiser. Chaves de IA não são incluídas.',
  ],
  [
    'Funciona offline?',
    'Depois de carregar o Web/PWA, registrar treinos e consultar dados locais funciona offline. Faça backup antes de limpar dados do navegador. Chamadas ao provider precisam de conexão; as respostas locais do Ajude-me continuam disponíveis.',
  ],
];
const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[?!.]/g, '')
    .trim();
export function localHelp(question: string, exercise?: Exercise): string | null {
  const q = normalize(question);
  if (/\b(dor|dores|lesao|lesoes|machuc|pain|injur|formigamento|diagnostico|tratamento)\w*/.test(q))
    return 'Interrompa o movimento que causa dor e procure orientação de um profissional de saúde. O Titã não diagnostica lesões, prescreve tratamento nem determina se um exercício é seguro para uma lesão.';
  const answer = knowledge.find(
    ([title]) =>
      normalize(title) === q || normalize(title).replace(/^o que (e|significa) /, '') === q,
  )?.[1];
  if (answer) return answer;
  if (exercise && q === normalize(helpQuestions.library[0]))
    return `Segundo o catálogo: músculo principal — ${exercise.primaryMuscle}; secundários — ${exercise.secondaryMuscles.join(', ') || 'não informados'}. Equipamento: ${exercise.equipment}.`;
  if (exercise && q === normalize(helpQuestions.library[1]))
    return exercise.instructions.length
      ? exercise.instructions.join('\n')
      : 'Este exercício ainda não tem instruções cadastradas. Não é possível explicar uma execução sem essa referência.';
  return null;
}
export function libraryHelpContext(exercise: Exercise): StructuredSummary {
  return {
    version: 1,
    kind: 'help',
    data: {
      exercise: exercise.source === 'system' ? exercise.name : 'Exercício personalizado',
      primaryMuscle: exercise.primaryMuscle,
      secondaryMuscles: exercise.secondaryMuscles,
      equipment: exercise.equipment,
      curatedInstructions: exercise.source === 'system' ? exercise.instructions.slice(0, 12) : [],
      instructionRule:
        'Explique somente as instruções fornecidas. Sem elas, informe que não há referência; não invente técnica.',
    },
  };
}
export function workoutHelpContext(
  slot: ActiveWorkoutExercise,
  previous: readonly ExerciseSet[] = [],
  suggestion?: ProgressionSuggestion,
): StructuredSummary {
  return {
    version: 1,
    kind: 'help',
    data: {
      exercise: slot.exerciseName,
      restSeconds: slot.targetRestSeconds ?? null,
      strategy: slot.progressionStrategy ?? null,
      previous: previous
        .filter((s) => s.completed)
        .slice(0, 6)
        .map((s) => ({ kg: s.weight, reps: s.reps })),
      current: slot.sets
        .filter((s) => !s.completed)
        .slice(0, 6)
        .map((s) => ({ kg: s.weight, reps: s.reps })),
      target: suggestion ? progressionSummary(suggestion).data : null,
    },
  };
}
export function helpSummary(
  screen: HelpScreen,
  question: string,
  context: StructuredSummary,
): StructuredSummary {
  const text = question.trim();
  if (
    !text ||
    text.length > 240 ||
    /(?:sk-|nvapi-|AIza|Bearer\s|\b[A-Za-z0-9_-]{40,}\b)/i.test(text)
  )
    throw new IntelligenceError(
      'question',
      'Use até 240 caracteres e não inclua chaves ou tokens na pergunta.',
    );
  const summary: StructuredSummary = {
    version: 1,
    kind: 'help',
    data: { screen, question: text, context: context.data },
  };
  serializeSummary(summary);
  return summary;
}

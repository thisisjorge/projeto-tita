import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  Button,
  Field,
  NumberField,
  SetRow,
  Card,
  Dialog,
  BottomSheet,
  Timer,
  StatusBanner,
  EmptyState,
} from '../../src/ui/components/index.js';

describe('UI Core Components (REQ-8)', () => {
  describe('Button', () => {
    it('renders with default variant and type="button"', () => {
      const html = renderToStaticMarkup(<Button>Salvar</Button>);
      expect(html).toContain('class="tita-button tita-button--primary tita-button--md"');
      expect(html).toContain('type="button"');
      expect(html).toContain('Salvar');
    });

    it('renders different variants, sizes, and aria-busy when loading', () => {
      const html = renderToStaticMarkup(
        <Button variant="danger" size="lg" loading>
          Excluir
        </Button>,
      );
      expect(html).toContain('tita-button--danger');
      expect(html).toContain('tita-button--lg');
      expect(html).toContain('aria-busy="true"');
      expect(html).toContain('disabled=""');
    });
  });

  describe('Field', () => {
    it('associates label with input and renders helper text', () => {
      const html = renderToStaticMarkup(
        <Field id="username" label="Nome do Atleta" helperText="Como prefere ser chamado" />,
      );
      expect(html).toContain('<label for="username"');
      expect(html).toContain('Nome do Atleta');
      expect(html).toContain('id="username"');
      expect(html).toContain('aria-describedby="username-helper"');
      expect(html).toContain('Como prefere ser chamado');
    });

    it('marks input as invalid and displays error text', () => {
      const html = renderToStaticMarkup(
        <Field
          id="email"
          label="Email"
          error="Email inválido"
          value="invalid"
          onChange={() => {}}
        />,
      );
      expect(html).toContain('aria-invalid="true"');
      expect(html).toContain('aria-describedby="email-error"');
      expect(html).toContain('Email inválido');
      expect(html).toContain('tita-field__input--error');
    });
  });

  describe('NumberField', () => {
    it('renders with decimal inputmode, min, max, and step buttons', () => {
      const html = renderToStaticMarkup(
        <NumberField
          id="weight"
          label="Carga (kg)"
          value={80}
          min={0}
          step={2.5}
          unit="kg"
          onChange={() => {}}
        />,
      );
      expect(html.toLowerCase()).toContain('inputmode="decimal"');
      expect(html).toContain('value="80"');
      expect(html).toContain('aria-label="Diminuir"');
      expect(html).toContain('aria-label="Aumentar"');
      expect(html).toContain('kg');
    });

    it('preserves 0 as a valid numeric value (0 !== undefined)', () => {
      const html = renderToStaticMarkup(
        <NumberField id="reps" label="Reps" value={0} min={0} onChange={() => {}} />,
      );
      expect(html).toContain('value="0"');
    });
  });

  describe('SetRow', () => {
    it('renders set index, load, reps, and completion button', () => {
      const html = renderToStaticMarkup(
        <SetRow
          setNumber={1}
          weight={100}
          reps={8}
          isCompleted={false}
          previousPerformance="95kg x 8"
        />,
      );
      expect(html).toContain('tita-set-row');
      expect(html).toContain('1'); // set index
      expect(html).toContain('value="100"');
      expect(html).toContain('value="8"');
      expect(html).toContain('95kg x 8');
      expect(html).toContain('aria-label="Marcar série 1 como concluída"');
    });

    it('marks completed state with checked indicator', () => {
      const html = renderToStaticMarkup(
        <SetRow setNumber={2} weight={100} reps={8} isCompleted={true} />,
      );
      expect(html).toContain('tita-set-row--completed');
      expect(html).toContain('✓');
      expect(html).toContain('aria-label="Desmarcar série 2"');
    });
  });

  describe('Card', () => {
    it('renders container with title, subtitle, and custom actions', () => {
      const html = renderToStaticMarkup(
        <Card
          title="Supino Reto"
          subtitle="Peitoral Maior"
          actions={<button type="button">Editar</button>}
        >
          <p>4 séries de 8-10 reps</p>
        </Card>,
      );
      expect(html).toContain('tita-card');
      expect(html).toContain('Supino Reto');
      expect(html).toContain('Peitoral Maior');
      expect(html).toContain('<p>4 séries de 8-10 reps</p>');
      expect(html).toContain('Editar');
    });
  });

  describe('Dialog', () => {
    it('renders accessible modal dialog when open', () => {
      const html = renderToStaticMarkup(
        <Dialog
          isOpen={true}
          title="Descartar Treino?"
          onClose={() => {}}
          footer={<button type="button">Confirmar</button>}
        >
          <p>Seus dados não salvos serão perdidos.</p>
        </Dialog>,
      );
      expect(html).toContain('role="dialog"');
      expect(html).toContain('aria-modal="true"');
      expect(html).toContain('Descartar Treino?');
      expect(html).toContain('aria-label="Fechar janela"');
    });

    it('does not render content when closed', () => {
      const html = renderToStaticMarkup(
        <Dialog isOpen={false} title="Janela Oculta" onClose={() => {}}>
          <p>Conteúdo</p>
        </Dialog>,
      );
      expect(html).toBe('');
    });
  });

  describe('BottomSheet', () => {
    it('renders bottom sheet modal with drag handle and accessible title', () => {
      const html = renderToStaticMarkup(
        <BottomSheet isOpen={true} title="Opções da Série" onClose={() => {}}>
          <p>Drop set / Warmup</p>
        </BottomSheet>,
      );
      expect(html).toContain('tita-bottom-sheet');
      expect(html).toContain('tita-bottom-sheet__handle');
      expect(html).toContain('Opções da Série');
      expect(html).toContain('Drop set / Warmup');
    });
  });

  describe('Timer', () => {
    it('formats MM:SS and displays quick add time buttons', () => {
      const html = renderToStaticMarkup(
        <Timer remainingSeconds={90} isRunning={true} onToggle={() => {}} />,
      );
      expect(html).toContain('01:30');
      expect(html).toContain('+30s');
      expect(html).toContain('+1m');
      expect(html).toContain('Pausar');
    });

    it('displays Iniciar button when paused', () => {
      const html = renderToStaticMarkup(
        <Timer remainingSeconds={60} isRunning={false} onToggle={() => {}} />,
      );
      expect(html).toContain('01:00');
      expect(html).toContain('Iniciar');
    });
  });

  describe('StatusBanner', () => {
    it('renders status message with appropriate role', () => {
      const htmlInfo = renderToStaticMarkup(
        <StatusBanner variant="info">Modo Offline ativado</StatusBanner>,
      );
      expect(htmlInfo).toContain('role="status"');
      expect(htmlInfo).toContain('tita-status-banner--info');

      const htmlError = renderToStaticMarkup(
        <StatusBanner variant="error">Falha ao salvar treino</StatusBanner>,
      );
      expect(htmlError).toContain('role="alert"');
      expect(htmlError).toContain('tita-status-banner--error');
    });
  });

  describe('EmptyState', () => {
    it('renders icon, title, description, and action button', () => {
      const html = renderToStaticMarkup(
        <EmptyState
          title="Nenhum treino registrado"
          description="Comece seu primeiro treino hoje para registrar suas marcas!"
          actionLabel="Iniciar Treino"
          onAction={() => {}}
        />,
      );
      expect(html).toContain('tita-empty-state');
      expect(html).toContain('Nenhum treino registrado');
      expect(html).toContain('Comece seu primeiro treino hoje');
      expect(html).toContain('Iniciar Treino');
    });
  });
});

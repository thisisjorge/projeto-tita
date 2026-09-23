import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { OnboardingView } from '../../src/features/onboarding/OnboardingView.js';

describe('Onboarding Flow (REQ-2)', () => {
  const originalLocalStorage = globalThis.localStorage;

  beforeEach(() => {
    // Mock minimal localStorage for Node environment
    const store: Record<string, string> = {};
    const mockStorage = {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        for (const k of Object.keys(store)) delete store[k];
      },
      get length() {
        return Object.keys(store).length;
      },
      key: (i: number) => Object.keys(store)[i] ?? null,
    };
    Object.defineProperty(globalThis, 'localStorage', {
      value: mockStorage,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: originalLocalStorage,
      writable: true,
      configurable: true,
    });
  });

  it('renders all 4 onboarding path choices', () => {
    const html = renderToStaticMarkup(<OnboardingView />);

    expect(html).toContain('Importar Dados');
    expect(html).toContain('Criar do Zero');
    expect(html).toContain('Explorar Modelos');
    expect(html).toContain('Me Ajude a Escolher');
  });

  it('always provides an explicit and visible "Pular por enquanto" action', () => {
    const html = renderToStaticMarkup(<OnboardingView />);

    expect(html).toContain('Pular por enquanto');
  });

  it('detects legacy localStorage data and displays migration banner', () => {
    localStorage.setItem('tita_app_v1', JSON.stringify({ version: '1.0', history: [] }));

    const html = renderToStaticMarkup(<OnboardingView />);

    expect(html).toContain('Dados da versão anterior encontrados');
    expect(html).toContain('Migrar Dados Legados Agora');
  });

  it('does not display migration banner when no legacy data exists', () => {
    const html = renderToStaticMarkup(<OnboardingView />);

    expect(html).not.toContain('Dados da versão anterior encontrados');
  });

  it('renders sample routine quick-starter card (Phase 16)', () => {
    const html = renderToStaticMarkup(<OnboardingView />);

    expect(html).toContain('Corpo inteiro');
    expect(html).toContain('Começar com corpo inteiro 3x');
    expect(html).toContain('onboarding-load-sample-btn');
  });

  it('renders local-first architecture and privacy disclosure (Phase 16)', () => {
    const html = renderToStaticMarkup(<OnboardingView />);

    expect(html).toContain('Seus treinos ficam com você.');
    expect(html).toContain('Local-first');
    expect(html).toContain('Sem rastreadores, anúncios ou cadastro obrigatório');
  });
});

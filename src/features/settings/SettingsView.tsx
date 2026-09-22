import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { IntelligenceSettings } from '../intelligence/IntelligenceSettings.js';
import { HelpAction } from '../intelligence/HelpAction.js';
import {
  Card,
  Button,
  StatusBanner,
  ShieldCheckIcon,
  DownloadIcon,
  UploadIcon,
  BoltIcon,
  TimerIcon,
  ChartIcon,
} from '../../ui/components/index.js';
import { IndexedDBTitaDatabase } from '../../repositories/indexeddb/tita-database.js';
import { exportBackup } from '../../backup/backup-exporter.js';
import { preflightImport, type ImportPreflightResult } from '../../backup/backup-importer.js';
import { ImportBackupDialog } from './ImportBackupDialog.js';
import { SettingsService } from '../../services/settings-service.js';

import {
  type AdvancedTrackingSettings,
  DEFAULT_ADVANCED_TRACKING_SETTINGS,
  RECOMMENDED_ADVANCED_SETTINGS,
} from '../../domain/settings/advanced-tracking-settings.js';
import { fileShareAdapter } from '../../platform/index.js';

export const SettingsView: React.FC = () => {
  const navigate = useNavigate();
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [settingsService, setSettingsService] = useState<SettingsService | null>(null);
  const [advancedSettings, setAdvancedSettings] = useState<AdvancedTrackingSettings>(
    DEFAULT_ADVANCED_TRACKING_SETTINGS,
  );
  const [settingsNotice, setSettingsNotice] = useState<string | null>(null);
  const [hasLegacyData, setHasLegacyData] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importPreflight, setImportPreflight] = useState<ImportPreflightResult | null>(null);
  const [importFileName, setImportFileName] = useState('');

  useEffect(() => {
    async function initSettings() {
      const db = new IndexedDBTitaDatabase();
      try {
        await db.open();
        const service = new SettingsService(db);
        setSettingsService(service);
        const current = await service.getAdvancedTrackingSettings();
        setAdvancedSettings(current);
      } catch {
        const service = new SettingsService();
        setSettingsService(service);
        const current = await service.getAdvancedTrackingSettings();
        setAdvancedSettings(current);
      }

      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = localStorage.getItem('tita_state');
        if (raw && raw.length > 20) {
          setHasLegacyData(true);
        }
      }
    }
    initSettings();
  }, []);

  const handleUpdateAdvancedSetting = async (
    key: keyof AdvancedTrackingSettings,
    value: boolean,
  ) => {
    const updated: AdvancedTrackingSettings = {
      ...advancedSettings,
      [key]: value,
    };
    setAdvancedSettings(updated);

    if (settingsService) {
      await settingsService.saveAdvancedTrackingSettings(updated);
      setSettingsNotice('Preferências salvas localmente.');
    }
  };

  const handleApplyPreset = async (preset: AdvancedTrackingSettings) => {
    setAdvancedSettings(preset);
    if (settingsService) {
      await settingsService.saveAdvancedTrackingSettings(preset);
      setSettingsNotice('Predefinição aplicada e salva localmente.');
    }
  };

  const handleExport = async () => {
    try {
      const db = new IndexedDBTitaDatabase();
      await db.open();
      const { json, backup } = await exportBackup(db);
      db.close();

      const blob = new Blob([json], { type: 'application/json' });
      const fileName = `tita-backup-${backup.manifest.exportedAt.slice(0, 10)}.json`;

      const result = await fileShareAdapter.shareFile({
        fileName,
        blob,
        text: 'Backup Projeto Titã',
      });

      if (result.method === 'native-share' || result.method === 'web-share') {
        setExportMessage('Backup exportado e compartilhado com sucesso (SHA-256 verificado).');
      } else {
        setExportMessage('Backup exportado com sucesso com integridade SHA-256.');
      }
    } catch (err) {
      setExportMessage(`Erro ao exportar: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const db = new IndexedDBTitaDatabase();
      await db.open();
      const preflight = await preflightImport(db, text);
      db.close();

      setImportPreflight(preflight);
      setImportFileName(file.name);
      setIsImportModalOpen(true);
    } catch (err) {
      setExportMessage(`Erro ao ler arquivo: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      e.target.value = '';
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
      <div>
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
          Ajustes &amp; Dados
        </h2>
        <p
          style={{
            fontSize: 'var(--tita-text-sm)',
            color: 'var(--tita-text-muted)',
            margin: 'var(--tita-space-1) 0 0 0',
          }}
        >
          Controle total sobre seus dados, registro de treino e preferências do dispositivo.
        </p>
      </div>

      {exportMessage && (
        <StatusBanner
          type={exportMessage.includes('Erro') ? 'error' : 'success'}
          message={exportMessage}
          onDismiss={() => setExportMessage(null)}
        />
      )}

      {settingsNotice && (
        <StatusBanner
          type="info"
          message={settingsNotice}
          onDismiss={() => setSettingsNotice(null)}
        />
      )}

      {/* Auto-detected Legacy Data Banner (Guardrail 10) */}
      {hasLegacyData && (
        <div
          style={{
            backgroundColor: 'var(--tita-surface-2)',
            border: '1px solid var(--tita-border)',
            borderRadius: 'var(--tita-radius-md)',
            padding: 'var(--tita-space-3) var(--tita-space-4)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 'var(--tita-space-3)',
          }}
          data-testid="legacy-data-banner"
        >
          <div>
            <div
              style={{
                fontWeight: 'bold',
                color: 'var(--tita-accent)',
                fontSize: 'var(--tita-text-sm)',
              }}
            >
              Dados da versão legada (V1) detectados
            </div>
            <div style={{ fontSize: 'var(--tita-text-xs)', color: 'var(--tita-text-muted)' }}>
              Identificamos histórico e treinos da versão anterior salvos neste navegador.
            </div>
          </div>
          <Button
            size="sm"
            variant="primary"
            onClick={() => navigate('/legacy')}
            data-testid="migrate-legacy-banner-btn"
          >
            Migrar Dados V1
          </Button>
        </div>
      )}

      {/* Advanced Tracking Card (REQ-10 Progressive Disclosure) */}
      <Card
        title="Tracking Avançado &amp; Métricas de Série"
        subtitle="Habilite campos avançados para registro detalhado. Por padrão, campos avançados ficam ocultos para máxima rapidez."
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--tita-space-3)' }}>
          {/* Master Toggle */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 'var(--tita-space-3)',
              backgroundColor: 'var(--tita-surface-2)',
              borderRadius: 'var(--tita-radius-md)',
              border: advancedSettings.enabled
                ? '1px solid var(--tita-primary)'
                : '1px solid var(--tita-border)',
            }}
          >
            <div>
              <div
                style={{
                  fontWeight: 'var(--tita-weight-bold)',
                  fontSize: 'var(--tita-text-base)',
                  color: 'var(--tita-text)',
                }}
              >
                Ativar Tracking Avançado
              </div>
              <div
                style={{
                  fontSize: 'var(--tita-text-xs)',
                  color: 'var(--tita-text-muted)',
                  marginTop: '2px',
                }}
              >
                Permite registrar RPE, RIR, tipo de série, tempo de execução e notas
              </div>
            </div>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '44px',
                minHeight: '44px',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={advancedSettings.enabled}
                onChange={(e) => handleUpdateAdvancedSetting('enabled', e.target.checked)}
                data-testid="toggle-advanced-tracking-master"
                style={{
                  width: '24px',
                  height: '24px',
                  accentColor: 'var(--tita-primary)',
                  cursor: 'pointer',
                }}
                aria-label="Ativar tracking avançado"
              />
            </label>
          </div>

          {/* Sub-toggles when Master is active */}
          {advancedSettings.enabled && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: 'var(--tita-space-2)',
                padding: 'var(--tita-space-3)',
                backgroundColor: 'var(--tita-surface-2)',
                borderRadius: 'var(--tita-radius-md)',
                border: '1px dashed var(--tita-border)',
              }}
              data-testid="advanced-settings-subfields"
            >
              {[
                {
                  key: 'showSetType',
                  label: 'Tipo de Série',
                  desc: 'Aquecimento, Top Set, Backoff, Drop Set',
                },
                { key: 'showRpe', label: 'RPE (Esforço Percebido)', desc: 'Escala 6.0 a 10.0' },
                { key: 'showRir', label: 'RIR (Reps em Reserva)', desc: '0 a 5 reps em reserva' },
                { key: 'showTempo', label: 'Tempo / Cadência', desc: 'Ex: 3-1-1-0' },
                {
                  key: 'showRest',
                  label: 'Descanso Alvo por Série',
                  desc: 'Temporizador customizado',
                },
                { key: 'showNotes', label: 'Notas por Série', desc: 'Cues técnicas e sensações' },
                {
                  key: 'showDuration',
                  label: 'Duração da Série (s)',
                  desc: 'Para isometrias e pranchas',
                },
                { key: 'showDistance', label: 'Distância (m)', desc: 'Para trenó e caminhadas' },
              ].map((item) => (
                <label
                  key={item.key}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    padding: '10px',
                    borderRadius: 'var(--tita-radius-sm)',
                    backgroundColor: 'var(--tita-surface-1)',
                    border: '1px solid var(--tita-border)',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={Boolean(advancedSettings[item.key as keyof AdvancedTrackingSettings])}
                    onChange={(e) =>
                      handleUpdateAdvancedSetting(
                        item.key as keyof AdvancedTrackingSettings,
                        e.target.checked,
                      )
                    }
                    data-testid={`toggle-setting-${item.key}`}
                    style={{
                      marginTop: '3px',
                      width: '18px',
                      height: '18px',
                      accentColor: 'var(--tita-primary)',
                      cursor: 'pointer',
                    }}
                  />
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '13px', color: 'var(--tita-text)' }}>
                      {item.label}
                    </div>
                    <div
                      style={{
                        fontSize: '11px',
                        color: 'var(--tita-text-muted)',
                        marginTop: '2px',
                      }}
                    >
                      {item.desc}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}

          {/* Quick Preset Buttons */}
          <div
            style={{
              display: 'flex',
              gap: 'var(--tita-space-2)',
              flexWrap: 'wrap',
              paddingTop: 'var(--tita-space-1)',
            }}
          >
            <Button
              size="sm"
              variant="secondary"
              onClick={() => handleApplyPreset(RECOMMENDED_ADVANCED_SETTINGS)}
              data-testid="preset-recommended-btn"
              style={{ minHeight: '40px' }}
            >
              Aplicar Predefinição Recomendada
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleApplyPreset(DEFAULT_ADVANCED_TRACKING_SETTINGS)}
              data-testid="preset-default-btn"
              style={{ minHeight: '40px' }}
            >
              Restaurar Modo Básico
            </Button>
          </div>
        </div>
      </Card>

      {/* Backup & Portability Card */}
      <Card
        title="Backup &amp; Portabilidade"
        subtitle="Exporte ou importe seus dados locais em formato JSON aberto com integridade SHA-256"
      >
        <div
          style={{
            display: 'flex',
            gap: 'var(--tita-space-3)',
            flexWrap: 'wrap',
            marginTop: 'var(--tita-space-3)',
          }}
        >
          <Button
            variant="primary"
            onClick={handleExport}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 'var(--tita-space-2)',
              minHeight: '44px',
            }}
          >
            <DownloadIcon size={18} color="var(--tita-primary-contrast)" />
            <span>Exportar Backup JSON</span>
          </Button>
          <Button
            variant="secondary"
            onClick={() => fileInputRef.current?.click()}
            data-testid="import-backup-btn"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 'var(--tita-space-2)',
              minHeight: '44px',
            }}
          >
            <UploadIcon size={18} color="var(--tita-text)" />
            <span>Importar Arquivo</span>
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            style={{ display: 'none' }}
            onChange={handleFileSelected}
            data-testid="import-file-input"
          />
        </div>
      </Card>

      {/* Advanced / Secondary Legacy Data Migration (Guardrail 10) */}
      <Card
        title="Migração &amp; Dados Legados"
        subtitle="Ferramentas avançadas para importar treinos e rotinas de versões anteriores do Projeto Titã"
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 'var(--tita-space-3)',
            paddingTop: 'var(--tita-space-1)',
          }}
        >
          <p
            style={{
              fontSize: 'var(--tita-text-xs)',
              color: 'var(--tita-text-muted)',
              margin: 0,
              maxWidth: '520px',
              lineHeight: 1.5,
            }}
          >
            Se você utilizava a versão anterior do Projeto Titã neste navegador, o motor de migração
            converterá suas rotinas e histórico com integridade referencial sem sobrescrever seus
            dados atuais.
          </p>
          <Button
            variant="secondary"
            onClick={() => navigate('/legacy')}
            data-testid="open-legacy-migration-btn"
            style={{ minHeight: '44px' }}
          >
            Acessar Migração Legada
          </Button>
        </div>
      </Card>

      {/* Identity & Principles Card */}
      <Card title="Sobre o Projeto Titã" subtitle="Versão 2.0 • Local-First &amp; Código Aberto">
        <ul
          style={{
            listStyle: 'none',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--tita-space-3)',
            fontSize: 'var(--tita-text-sm)',
            color: 'var(--tita-text-muted)',
            padding: 0,
            margin: 0,
          }}
        >
          <li style={{ display: 'flex', alignItems: 'center', gap: 'var(--tita-space-2)' }}>
            <ShieldCheckIcon size={18} color="var(--tita-primary)" />
            <span>
              <strong style={{ color: 'var(--tita-text)' }}>Privacidade Total:</strong> Nenhum dado
              sai do seu aparelho sem sua autorização explícita.
            </span>
          </li>
          <li style={{ display: 'flex', alignItems: 'center', gap: 'var(--tita-space-2)' }}>
            <BoltIcon size={18} color="var(--tita-primary)" />
            <span>
              <strong style={{ color: 'var(--tita-text)' }}>100% Offline:</strong> Funciona
              plenamente em modo avião ou sem conexão.
            </span>
          </li>
          <li style={{ display: 'flex', alignItems: 'center', gap: 'var(--tita-space-2)' }}>
            <TimerIcon size={18} color="var(--tita-primary)" />
            <span>
              <strong style={{ color: 'var(--tita-text)' }}>Velocidade no Treino:</strong> Operação
              rápida entre séries sem distrações.
            </span>
          </li>
          <li style={{ display: 'flex', alignItems: 'center', gap: 'var(--tita-space-2)' }}>
            <ChartIcon size={18} color="var(--tita-primary)" />
            <span>
              <strong style={{ color: 'var(--tita-text)' }}>Progressão Transparente:</strong>{' '}
              Sugestões calculadas localmente, sem dependência de nuvem.
            </span>
          </li>
        </ul>
        <div
          style={{
            marginTop: 'var(--tita-space-4)',
            paddingTop: 'var(--tita-space-3)',
            borderTop: '1px solid var(--tita-border-subtle)',
            display: 'flex',
            justifyContent: 'flex-start',
          }}
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/onboarding')}
            data-testid="revisit-onboarding-btn"
          >
            Rever Boas-Vindas &amp; Modelos Iniciais →
          </Button>
        </div>
      </Card>

      <HelpAction screen="settings" />
      <IntelligenceSettings />
      <ImportBackupDialog
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        preflight={importPreflight}
        fileName={importFileName}
        onImportComplete={(summary) => setExportMessage(summary)}
      />
    </div>
  );
};

import React, { useState } from 'react';
import { Dialog, Button, StatusBanner } from '../../ui/components/index.js';
import type { ImportPreflightResult, ImportMode } from '../../backup/backup-importer.js';
import { executeImport } from '../../backup/backup-importer.js';
import { IndexedDBTitaDatabase } from '../../repositories/indexeddb/tita-database.js';

export interface ImportBackupDialogProps {
  isOpen: boolean;
  onClose: () => void;
  preflight: ImportPreflightResult | null;
  fileName: string;
  onImportComplete: (summary: string) => void;
}

export const ImportBackupDialog: React.FC<ImportBackupDialogProps> = ({
  isOpen,
  onClose,
  preflight,
  fileName,
  onImportComplete,
}) => {
  const [mode, setMode] = useState<ImportMode>('merge');
  const [isImporting, setIsImporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!preflight) return null;

  const handleConfirm = async () => {
    if (!preflight.backup) return;

    setIsImporting(true);
    setErrorMessage(null);

    const db = new IndexedDBTitaDatabase();
    try {
      await db.open();
      const result = await executeImport(db, preflight.backup, { mode });
      db.close();

      if (result.success) {
        const totalItems = Object.values(result.importedCounts).reduce((acc, n) => acc + n, 0);
        onImportComplete(
          `Importação concluída com sucesso! ${totalItems} itens importados. Snapshot de segurança criado (${result.snapshotId}).`,
        );
        onClose();
      } else {
        setErrorMessage(result.error ?? 'Falha desconhecida durante a importação.');
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setIsImporting(false);
    }
  };

  const footer = (
    <div style={{ display: 'flex', gap: 'var(--tita-space-2)', justifyContent: 'flex-end' }}>
      <Button variant="ghost" onClick={onClose} disabled={isImporting}>
        Cancelar
      </Button>
      <Button
        variant="primary"
        onClick={handleConfirm}
        disabled={isImporting || !preflight.valid}
        data-testid="confirm-import-btn"
      >
        {isImporting ? 'Importando...' : 'Confirmar Importação'}
      </Button>
    </div>
  );

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Visualizar e Confirmar Importação"
      description={`Arquivo: ${fileName}`}
      footer={footer}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--tita-space-3)' }}>
        {errorMessage && (
          <StatusBanner
            type="error"
            message={errorMessage}
            onDismiss={() => setErrorMessage(null)}
          />
        )}

        {!preflight.valid ? (
          <div
            style={{
              padding: 'var(--tita-space-3)',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid var(--tita-danger, #ef4444)',
              borderRadius: 'var(--tita-radius-md)',
              color: 'var(--tita-danger, #ef4444)',
            }}
          >
            <strong>Arquivo Inválido:</strong>
            <ul style={{ marginTop: 'var(--tita-space-1)', paddingLeft: '20px' }}>
              {preflight.errors.map((e, idx) => (
                <li key={idx}>{e}</li>
              ))}
            </ul>
          </div>
        ) : (
          <>
            {/* Counts breakdown */}
            <div
              style={{
                backgroundColor: 'var(--tita-surface-2)',
                padding: 'var(--tita-space-3)',
                borderRadius: 'var(--tita-radius-md)',
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 'var(--tita-space-2)',
              }}
            >
              <div>
                <span style={{ fontSize: 'var(--tita-text-xs)', color: 'var(--tita-text-muted)' }}>
                  Treinos Salvos
                </span>
                <div style={{ fontSize: 'var(--tita-text-lg)', fontWeight: 'bold' }}>
                  {preflight.counts['workoutSnapshots'] ?? 0}
                </div>
              </div>
              <div>
                <span style={{ fontSize: 'var(--tita-text-xs)', color: 'var(--tita-text-muted)' }}>
                  Rotinas Planejadas
                </span>
                <div style={{ fontSize: 'var(--tita-text-lg)', fontWeight: 'bold' }}>
                  {preflight.counts['routines'] ?? 0}
                </div>
              </div>
              <div>
                <span style={{ fontSize: 'var(--tita-text-xs)', color: 'var(--tita-text-muted)' }}>
                  Exercícios Customizados
                </span>
                <div style={{ fontSize: 'var(--tita-text-lg)', fontWeight: 'bold' }}>
                  {preflight.counts['exercises'] ?? 0}
                </div>
              </div>
              <div>
                <span style={{ fontSize: 'var(--tita-text-xs)', color: 'var(--tita-text-muted)' }}>
                  Medições Corporais
                </span>
                <div style={{ fontSize: 'var(--tita-text-lg)', fontWeight: 'bold' }}>
                  {preflight.counts['measurements'] ?? 0}
                </div>
              </div>
            </div>

            {/* Date Range if workouts exist */}
            {preflight.dateRange && (
              <div style={{ fontSize: 'var(--tita-text-xs)', color: 'var(--tita-text-muted)' }}>
                Período coberto: {preflight.dateRange.earliest.slice(0, 10)} até{' '}
                {preflight.dateRange.latest.slice(0, 10)}
              </div>
            )}

            {/* Integrity status */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--tita-space-2)',
                fontSize: 'var(--tita-text-xs)',
                color: 'var(--tita-success, #10b981)',
              }}
            >
              <span>✓ Checksum SHA-256 verificado com sucesso</span>
            </div>

            {/* Mode selection */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--tita-space-2)' }}>
              <span
                style={{ fontWeight: 'var(--tita-weight-bold)', fontSize: 'var(--tita-text-sm)' }}
              >
                Modo de Importação:
              </span>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                  padding: '8px',
                  borderRadius: 'var(--tita-radius-sm)',
                  backgroundColor: mode === 'merge' ? 'var(--tita-surface-2)' : 'transparent',
                  border: '1px solid var(--tita-border)',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="radio"
                  name="import-mode"
                  value="merge"
                  checked={mode === 'merge'}
                  onChange={() => setMode('merge')}
                  style={{ marginTop: '2px' }}
                />
                <div>
                  <div style={{ fontWeight: '600', fontSize: '13px' }}>
                    Mesclar com dados existentes (Recomendado)
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--tita-text-muted)' }}>
                    Adiciona os registros do backup preservando os treinos que já estão no seu
                    aparelho.
                  </div>
                </div>
              </label>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                  padding: '8px',
                  borderRadius: 'var(--tita-radius-sm)',
                  backgroundColor:
                    mode === 'replace_selected' ? 'var(--tita-surface-2)' : 'transparent',
                  border: '1px solid var(--tita-border)',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="radio"
                  name="import-mode"
                  value="replace_selected"
                  checked={mode === 'replace_selected'}
                  onChange={() => setMode('replace_selected')}
                  style={{ marginTop: '2px' }}
                />
                <div>
                  <div style={{ fontWeight: '600', fontSize: '13px' }}>Substituir categorias</div>
                  <div style={{ fontSize: '11px', color: 'var(--tita-text-muted)' }}>
                    Limpa as categorias presentes no backup antes de inserir os novos dados (um
                    snapshot de segurança é criado automaticamente).
                  </div>
                </div>
              </label>
            </div>
          </>
        )}
      </div>
    </Dialog>
  );
};

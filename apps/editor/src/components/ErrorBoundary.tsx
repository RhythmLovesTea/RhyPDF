import { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@rhypdf/ui';
import { i18n } from '@rhypdf/i18n';
import { logger } from '../lib/logger';
import { saveRecoveryMetadata } from '../lib/recovery';
import { useDocStore } from '../stores/docStore';
import { useUIStore } from '../stores/uiStore';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  copied: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
    copied: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, copied: false };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    logger.error('ErrorBoundary', error.message, {
      stack: error.stack,
      componentStack: errorInfo.componentStack
    });

    // Save recovery metadata with current document and UI state so work is preserved
    const docState = useDocStore.getState();
    const uiState = useUIStore.getState();
    saveRecoveryMetadata({
      documentId: docState.currentDocId ?? undefined,
      filename: docState.filename ?? undefined,
      activePageIndex: uiState.currentPage,
      isDirty: docState.isDirty,
      errorReason: error.message
    });
  }

  private handleCopyDiagnostic = () => {
    const report = {
      error: this.state.error?.message,
      stack: this.state.error?.stack,
      recentLogs: logger.getRecentLogs(),
      timestamp: new Date().toISOString()
    };
    navigator.clipboard?.writeText(JSON.stringify(report, null, 2));
    this.setState({ copied: true });
    setTimeout(() => this.setState({ copied: false }), 2000);
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleRecover = () => {
    this.setState({ hasError: false, error: null });
    window.location.hash = '#/';
  };

  public override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          data-testid="error-boundary-fallback"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: 32,
            backgroundColor: 'var(--bg-background)',
            color: 'var(--bg-foreground)',
            fontFamily: 'system-ui, -apple-system, sans-serif'
          }}
        >
          <div
            style={{
              maxWidth: 540,
              width: '100%',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--bg-border)',
              borderRadius: 'var(--radius-lg)',
              padding: 32,
              boxShadow: 'var(--shadow-lg)',
              textAlign: 'center'
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 'var(--radius-full)',
                backgroundColor: '#fee2e2',
                color: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 24,
                fontWeight: 700,
                marginInline: 'auto',
                marginBottom: 16
              }}
            >
              !
            </div>

            <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 8px' }}>
              {i18n.t('errorBoundary.title')}
            </h1>

            <p style={{ color: 'var(--bg-muted-foreground)', fontSize: 14, margin: '0 0 16px' }}>
              {i18n.t('errorBoundary.subtitle')}
            </p>

            <div
              data-testid="error-message-text"
              style={{
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: '#fef2f2',
                color: '#991b1b',
                border: '1px solid #fecaca',
                fontSize: 13,
                fontFamily: 'monospace',
                textAlign: 'start',
                marginBottom: 20,
                overflowX: 'auto'
              }}
            >
              {this.state.error?.message || 'Unknown runtime error'}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
              <Button
                data-testid="btn-recover-session"
                variant="primary"
                onClick={this.handleRecover}
              >
                {i18n.t('errorBoundary.recover')}
              </Button>
              <Button data-testid="btn-reload-app" variant="secondary" onClick={this.handleReload}>
                {i18n.t('errorBoundary.reload')}
              </Button>
              <Button
                data-testid="btn-copy-diagnostic"
                variant="ghost"
                onClick={this.handleCopyDiagnostic}
              >
                {this.state.copied
                  ? i18n.t('errorBoundary.copied')
                  : i18n.t('errorBoundary.copyDiagnostics')}
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

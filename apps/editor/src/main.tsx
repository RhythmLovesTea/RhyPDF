import React from 'react';
import ReactDOM from 'react-dom/client';
import { initI18n } from '@rhypdf/i18n';
import { App } from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { setupGlobalErrorHandlers } from './lib/recovery';

// Initialize i18n engine and document direction
initI18n();

// Initialize global error and unhandled rejection listeners
setupGlobalErrorHandlers();

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
}

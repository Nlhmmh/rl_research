import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './app/styles/index.css';
import './shared/i18n/i18n';
import App from './app/App.tsx';
import { initializePolicyStorage } from './modules/reinforcement-learning/infrastructure/persistence/migrate-policies';

void initializePolicyStorage()
  .catch((error: unknown) => console.error('Could not initialize policy storage', error))
  .finally(() => {
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  });

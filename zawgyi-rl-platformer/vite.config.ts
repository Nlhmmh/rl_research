import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { policyStorage } from './server/policy-storage.ts';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), policyStorage()],
});

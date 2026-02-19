import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Auth state file paths for test users.
 * Used by both auth.setup.ts (to write) and tests (to read).
 */
export const AUTH_DIR = path.resolve(__dirname, '../.auth');
export const ALICE_AUTH_STATE = path.join(AUTH_DIR, 'alice.json');
export const BOB_AUTH_STATE = path.join(AUTH_DIR, 'bob.json');

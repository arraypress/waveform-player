/**
 * Type definitions for `@arraypress/waveform-player/no-autoinit`.
 *
 * The entry point's *types* are identical to the default one's — same class,
 * same options, same events. Only its runtime behaviour differs: importing it
 * never scans the document for `[data-waveform-player]` markup. So this file
 * re-exports `index.d.ts` rather than duplicating a surface that would drift
 * from it; `index.d.ts` stays the single hand-authored source of truth.
 *
 * The `.js` extension is required, not stylistic: under `moduleResolution:
 * node16` / `nodenext` an extensionless relative import is an error (TS2834),
 * and the whole re-export silently collapses to the default export only. It
 * typechecks fine under `bundler`, which is why `npm run test:pack` checks both.
 */

export * from './index.js';
export { default } from './index.js';

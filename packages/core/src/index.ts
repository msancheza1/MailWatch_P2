export * from './types.js';
export {
  analyzeEmail,
  analyzeBatch,
  scoreToLevel,
  type AnalyzeOptions,
  type DomainPolicy,
} from './engine.js';
export { buildSummary, recommendedAction } from './explain.js';
export { folderFor, auditFor, auditEntry } from './quarantine.js';
export {
  evaluate,
  metricsOf,
  isPositive,
  FRAMING_LABEL,
  type Framing,
  type ConfusionMatrix,
  type Metrics,
  type Mistake,
  type Evaluation,
} from './evaluate.js';
export { BRANDS, type Brand } from './rules/brands.js';

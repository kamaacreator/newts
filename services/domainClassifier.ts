import type { ScientificDomain } from '../types.ts';

/**
 * Shared deterministic request classifier used by both API routing and the
 * calculation service. Specific domain terms are checked before broad terms.
 * Unknown requests retain the caller's explicit fallback domain; callers
 * should label such results as domain-assumed rather than silently verified.
 */
export function classifyScientificDomain(
  command: string,
  fallback: ScientificDomain = 'BIOLOGY',
): ScientificDomain {
  const text = command.toLowerCase();
  if (/^\s*sequence\s*:/i.test(command) ||
      /\b(crispr|cas9|pam|gene|r-loop|hdr|nhej|chromatin|dna|protein|p53|folding|trp-cage|biology)\b/.test(text)) {
    return 'BIOLOGY';
  }
  if (/\b(fea|cantilever|beam|structural|geotechnical|soil|stress|topology|simp|engineering)\b/.test(text)) {
    return 'ENGINEERING';
  }
  if (/\b(plasma|tokamak|magnetic|fusion|confinement|troyon|physics|grad-shafranov)\b/.test(text)) {
    return 'PHYSICS';
  }
  if (/\b(neural|gradient|loss|learning|transformer|attention|nats|qubit|entropy|machine learning|artificial intelligence|ai model)\b/.test(text)) {
    return 'AI';
  }
  return fallback;
}

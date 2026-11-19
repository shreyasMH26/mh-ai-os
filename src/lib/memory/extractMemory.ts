/**
 * Memory Trigger Detection
 *
 * Extracts a storable fact from a user message when the message matches
 * an explicit "remember this" trigger pattern.
 *
 * ONLY matches deliberate save commands. Does NOT match every message.
 *
 * Examples that match:
 *   "Remember that I am a CSE student."       → "I am a CSE student."
 *   "Please remember I prefer dark mode."     → "I prefer dark mode."
 *   "/remember My name is MH."                → "My name is MH."
 *   "Don't forget that I use TypeScript."     → "I use TypeScript."
 *   "Keep in mind that I work at night."      → "I work at night."
 *
 * Examples that do NOT match:
 *   "What's the best framework?"              → null
 *   "I think React is great."                 → null
 *   "Remember that scene from the movie?"     → null (too short after extraction)
 */

const TRIGGERS: RegExp[] = [
  /^(?:please\s+)?remember\s+that\s+(.+)/i,
  /^(?:please\s+)?remember\s+(.+)/i,
  /^\/remember\s+(.+)/i,
  /^(?:don't|dont|do not)\s+forget\s+(?:that\s+)?(.+)/i,
  /^keep\s+in\s+mind\s+(?:that\s+)?(.+)/i,
  /^note\s+(?:that\s+)?(.+)/i,
  /^save\s+(?:to\s+memory\s*[:\-]?\s*)?(?:that\s+)?(.+)/i,
];

/** Minimum fact length to be worth saving (characters). */
const MIN_FACT_LENGTH = 8;

/**
 * Try to extract a storable memory fact from a user message.
 *
 * @returns The extracted fact string (without the trigger phrase), or null if
 *          the message is not a memory trigger.
 */
export function extractMemoryFact(message: string): string | null {
  const trimmed = message.trim();

  for (const pattern of TRIGGERS) {
    const match = trimmed.match(pattern);
    if (match?.[1]) {
      const fact = match[1].trim().replace(/[.!?]+$/, '').trim(); // strip trailing punctuation
      if (fact.length >= MIN_FACT_LENGTH) {
        return fact;
      }
    }
  }
  return null;
}

/**
 * Infer an optional category from the fact text.
 * Very simple keyword-based heuristic — not required to be exhaustive.
 */
export function inferCategory(fact: string): string | undefined {
  const f = fact.toLowerCase();
  if (/\bname\b|\bcall me\b|\bi am\b|\bknown as\b/.test(f)) return 'identity';
  if (/\bstudent\b|\bschool\b|\buniversity\b|\bcollege\b|\bcourse\b|\bdegree\b/.test(f)) return 'education';
  if (/\bwork\b|\bjob\b|\bcompany\b|\bstartup\b|\bfoundr\b|\brole\b/.test(f)) return 'work';
  if (/\bprefer\b|\blike\b|\blove\b|\bfavor\b|\bstyle\b|\btheme\b|\bdesign\b/.test(f)) return 'preferences';
  if (/\bproject\b|\bbuilding\b|\bapp\b|\bwebsite\b|\bxtich\b/.test(f)) return 'projects';
  return undefined;
}

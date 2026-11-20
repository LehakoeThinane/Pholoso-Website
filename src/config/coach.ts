/**
 * Pholoso Parent Coach (brief v4 §7b). Pages: src/pages/parent-coach/.
 * Strategy library: src/content/coach-strategies/<topic>/*.md.
 *
 * Mode decides what the coach does on this build:
 * - 'off':  production default. The landing page says the coach is not open yet and points
 *           to the written Parent Guide. Stays off until the Foundation approves the
 *           strategies, the helplines, the privacy notice and a budget.
 * - 'mock': preview builds (ALLOW_TODO=1) and tests. Replies come from a practice script in
 *           the browser (src/scripts/coach/mock.ts), never from AI, and are labelled so.
 * - 'live': Stage 2. Replies come from /api/coach/ (PHP), which calls the AI provider.
 * Set COACH_MODE to override.
 */
type Mode = 'off' | 'mock' | 'live';
const envMode = process.env.COACH_MODE as Mode | undefined;

export const coach = {
  /** Working name; the Foundation confirms it. Never use Understood's name or branding. */
  name: 'Pholoso Parent Coach',
  mode: (envMode ?? (process.env.ALLOW_TODO === '1' ? 'mock' : 'off')) as Mode,
  /** The topic at launch, and who it is designed for. */
  topic: { id: 'screen-time', label: 'screen-time transitions', ages: '5–10' },
  /** sessionStorage keys (practice mode keeps everything in this browser tab only). */
  storage: { profile: 'pholoso-coach-profile', session: 'pholoso-coach-session-' },

  /** Onboarding step 3: "Does {child} have any learning and thinking differences?" */
  differences: [
    { value: 'autism', label: 'Autism' },
    { value: 'adhd', label: 'ADHD' },
    { value: 'dyslexia', label: 'Dyslexia' },
    { value: 'dyscalculia', label: 'Dyscalculia' },
    { value: 'dysgraphia', label: 'Dysgraphia' },
    { value: 'other', label: 'Another difference not listed here' },
    { value: 'suspected', label: 'I think so, but there has not been an assessment yet' },
    { value: 'none', label: 'None that I know of' },
  ],

  /** "What went wrong?" after "Bad response". */
  feedbackReasons: [
    'It was not accurate',
    'It did not fit my child',
    'It was hard to understand',
    'It felt judgemental',
    'Something else',
  ],

  /** Under the message box, always visible. */
  aiNote: 'Replies are written by AI. They are not professional or medical advice.',
  practiceNote: 'Practice mode: replies come from a fixed practice script, not from AI.',
} as const;

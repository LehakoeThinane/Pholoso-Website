/**
 * The Parent Coach's message format. The practice engine (mock.ts) returns it now; in Stage 2
 * the PHP API returns the same shape from the AI, after checking it against this format and
 * the approved strategy library.
 */

export type Stage =
  | 'pick_child'
  | 'ask'
  | 'validate'
  | 'offer'
  | 'interests'
  | 'logistics'
  | 'plan'
  | 'pushback'
  | 'close'
  | 'done';

export type Block =
  | { type: 'validation'; icon: 'struggle' | 'heart'; text: string }
  | { type: 'text'; text: string }
  | { type: 'strategy'; id: string; title: string; text: string }
  | { type: 'say_this'; text: string }
  | { type: 'how_to_introduce'; text: string }
  | { type: 'plan'; title: string; steps: { label: string; text: string }[] }
  | { type: 'tip'; title: string; text: string }
  | { type: 'account_prompt' }
  | { type: 'closing'; title: string; text: string };

export interface Reply {
  blocks: Block[];
  /** Suggested answers. The first question shows them as big buttons, later ones as chips. */
  choices: string[];
  /** The message box's placeholder for the next answer. */
  placeholder: string;
  next_stage: Stage;
  safety_flag: 'none' | 'concern' | 'emergency';
}

export interface Child {
  name: string;
  age: string;
  differences: string[];
}

export interface Profile {
  parent: string;
  children: Child[];
}

export interface Message {
  role: 'coach' | 'parent';
  /** Coach messages */
  blocks?: Block[];
  /** Parent messages */
  text?: string;
  /** "Need help now?" (danger words): coaching stopped */
  help?: boolean;
}

export interface Session {
  id: string;
  profile: Profile;
  /** Which child this session is about (index into profile.children). */
  child: number;
  stage: Stage;
  /** What the parent chose along the way, used to personalise the plan. */
  memory: { reaction?: string; activity?: string; place?: string };
  messages: Message[];
  choices: string[];
  placeholder: string;
  ended: boolean;
  rating?: number;
}

export interface Strategy {
  id: string;
  title: string;
  summary: string;
  why: string;
  sayThis: string;
  introduce: string;
  plan: { calm: string; ends: string; after: string };
  consistency: string;
  obstacles: { title: string; tip: string }[];
  status: 'draft' | 'approved';
}

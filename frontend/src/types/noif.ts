export type VentureType = 'SIDE_HUSTLE' | 'STORE' | 'STARTUP_C' | 'STARTUP_B';

export type DiagnosisDimension =
  | 'funding'
  | 'market'
  | 'compliance'
  | 'customer'
  | 'execution';

export type InteractionMode = 'TEXT' | 'VOICE';

export interface SelectOption {
  label: string;
  value: string;
  hint?: string;
}

export interface ProfileField {
  id: string;
  label: string;
  type: 'select' | 'multiselect' | 'text';
  placeholder?: string;
  maxSelect?: number;
  options?: SelectOption[];
}

export interface OnboardingProfile {
  ventureType: VentureType;
  city: string;
  familyStatus: string;
  occupationStatus: string;
  experience: string;
  skills: string[];
  budgetRange: string;
  industry: string;
  projectSummary: string;
  targetCustomer?: string;
  channelOrLocation?: string;
  timeCommitment?: string;
  sideHustlePolicy?: string;
  franchisePreference?: string;
  seedUsers?: string;
  interactionMode: InteractionMode;
  resourcePrefs: string[];
  industries: string[];
}

export interface DiagnosisOption {
  label: string;
  value: string;
  score: number;
  insight: string;
}

export interface DiagnosisQuestion {
  id: string;
  dimension: DiagnosisDimension;
  prompt: string;
  detail: string;
  ventureTypes: VentureType[];
  options: DiagnosisOption[];
}

export interface DiagnosisAnswer {
  questionId: string;
  dimension: DiagnosisDimension;
  answer: string;
  value: string;
  score: number;
  insight: string;
}

export interface ChatCitation {
  title: string;
  url: string;
  snippet: string;
  source?: string;
}

export interface DiagnosisMessage {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  createdAt?: string;
  quickReplies?: string[];
  citations?: ChatCitation[];
  modelLabel?: string;
}

export interface ReportDimensionScore {
  key: DiagnosisDimension;
  label: string;
  score: number;
  weight: number;
  summary: string;
}

export interface NoifReport {
  id: string;
  createdAt: string;
  ventureType: VentureType;
  ventureLabel: string;
  projectName: string;
  city: string;
  readinessScore: number;
  verdict: string;
  summary: string;
  ifQuote: string;
  dimensionScores: ReportDimensionScore[];
  topWarnings: string[];
  nextMoves: string[];
  actionPlan: {
    week: string;
    title: string;
    detail: string;
  }[];
}

export interface CaseStudy {
  id: string;
  title: string;
  background: string[];
  analysis: string[];
  evidence?: string;
}

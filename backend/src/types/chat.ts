export type ChatModelProvider = 'mock' | 'openai' | 'anthropic' | 'kimi';

export interface NoifOnboardingProfile {
  ventureType: 'SIDE_HUSTLE' | 'STORE' | 'STARTUP_C' | 'STARTUP_B';
  city: string;
  familyStatus?: string;
  occupationStatus?: string;
  experience?: string;
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
  interactionMode?: 'TEXT' | 'VOICE';
  resourcePrefs?: string[];
  industries?: string[];
}

export interface DiagnosisOption {
  label: string;
  value: string;
  score: number;
  insight: string;
}

export interface DiagnosisQuestion {
  id: string;
  dimension: 'funding' | 'market' | 'compliance' | 'customer' | 'execution';
  prompt: string;
  detail: string;
  ventureTypes: NoifOnboardingProfile['ventureType'][];
  options: DiagnosisOption[];
}

export interface DiagnosisAnswer {
  questionId: string;
  dimension: DiagnosisQuestion['dimension'];
  answer: string;
  value: string;
  score: number;
  insight: string;
}

export interface ChatModelConfig {
  id: string;
  provider: ChatModelProvider;
  model: string;
  label: string;
  enabled: boolean;
  isDefault?: boolean;
}

export interface NoifReportDimensionScore {
  key: DiagnosisQuestion['dimension'];
  label: string;
  score: number;
  weight: number;
  summary: string;
}

export interface NoifReport {
  id: string;
  createdAt: string;
  ventureType: NoifOnboardingProfile['ventureType'];
  ventureLabel: string;
  projectName: string;
  city: string;
  readinessScore: number;
  verdict: string;
  summary: string;
  ifQuote: string;
  dimensionScores: NoifReportDimensionScore[];
  topWarnings: string[];
  nextMoves: string[];
  actionPlan: Array<{
    week: string;
    title: string;
    detail: string;
  }>;
}

import { Prisma } from '@prisma/client';
import { DiagnosisAnswer, NoifReport } from '../types/chat';

type DiagnosisMessage = {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  createdAt?: string;
  quickReplies?: string[];
  citations?: Array<{ title: string; url: string; snippet: string; source?: string }>;
  modelLabel?: string;
};

function ensureArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export function parseStoredReports(value: unknown): NoifReport[] {
  return ensureArray<NoifReport>(value);
}

export function parseStoredDiagnosisAnswers(value: unknown): DiagnosisAnswer[] {
  return ensureArray<DiagnosisAnswer>(value);
}

export function parseStoredDiagnosisMessages(value: unknown): DiagnosisMessage[] {
  return ensureArray<DiagnosisMessage>(value);
}

export function buildStoredReports(existing: unknown, nextReport: NoifReport) {
  const previous = parseStoredReports(existing).filter((item) => item.id !== nextReport.id);
  return [nextReport, ...previous].slice(0, 20);
}

export function asJsonValue<T>(value: T) {
  return value as Prisma.InputJsonValue;
}

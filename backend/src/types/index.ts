import { Request } from 'express';
import { UserRole, SubscriptionPlan } from '@prisma/client';

export interface AuthPayload {
  userId: string;
  email: string;
  role: UserRole;
}

export interface AuthRequest extends Request {
  user?: AuthPayload;
}

export interface PaginationQuery {
  page?: string;
  limit?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const PLAN_PRICES: Record<SubscriptionPlan, number> = {
  FREE: 0,
  BASIC: 4999,     // ¥49.99 in cents
  ADVANCED: 9999,  // ¥99.99 in cents
};

export const FREE_COUPON_CODE = 'ZY85CJ';

export const SUPPORTED_CITIES = [
  '北京', '上海', '广州', '深圳', '重庆', '杭州', '南京'
];

export const INDUSTRIES = [
  '电商', '知识付费', '教育', '金融', '开发类产品', '其他'
];

export const RESOURCE_TYPES = [
  '政府补贴政策', 'AI工具使用', '行业落地方法论', '产品开发技术', '获客与运营'
];

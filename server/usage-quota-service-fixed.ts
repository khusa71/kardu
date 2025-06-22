import { db } from './db';
import { userProfiles } from '../shared/schema';
import { eq } from 'drizzle-orm';

export interface UsageQuota {
  uploadsThisMonth: number;
  maxMonthlyUploads: number;
  needsReset: boolean;
}

export interface QuotaLimits {
  maxPagesPerFile: number;
  monthlyUploadLimit: number;
}

/**
 * Get quota limits based on user tier
 */
export function getQuotaLimits(isPremium: boolean): QuotaLimits {
  return {
    maxPagesPerFile: isPremium ? 100 : 20,
    monthlyUploadLimit: isPremium ? 100 : 3
  };
}

/**
 * Get current usage quota for a user using actual database columns
 */
export async function getUserQuota(userId: string): Promise<UsageQuota> {
  const user = await db.query.userProfiles.findFirst({
    where: eq(userProfiles.id, userId)
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Check if it's a new month and reset if needed
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const lastUpdate = user.updatedAt ? new Date(user.updatedAt) : new Date(0); // Use epoch if no update date
  const lastUpdateMonth = lastUpdate.getMonth();
  const lastUpdateYear = lastUpdate.getFullYear();
  
  // Only reset if we're in a different month AND year, or if it's been more than 30 days
  const needsReset = (lastUpdateYear < currentYear) || 
                     (lastUpdateYear === currentYear && lastUpdateMonth < currentMonth) ||
                     (user.uploadsThisMonth === null); // First time user

  const currentUploads = needsReset ? 0 : (user.uploadsThisMonth || 0);
  const maxUploads = user.maxMonthlyUploads || (user.isPremium ? 100 : 3);
  
  console.log(`DEBUG: getUserQuota for ${userId}:`, {
    currentUploads,
    maxUploads,
    isPremium: user.isPremium,
    needsReset,
    lastUpdate: user.updatedAt,
    currentMonth,
    currentYear
  });

  return {
    uploadsThisMonth: currentUploads,
    maxMonthlyUploads: maxUploads,
    needsReset
  };
}

/**
 * Reset user quota (typically called monthly)
 */
export async function resetUserQuota(userId: string): Promise<void> {
  await db.update(userProfiles)
    .set({
      uploadsThisMonth: 0,
      updatedAt: new Date()
    })
    .where(eq(userProfiles.id, userId));
}

/**
 * Increment upload count for a user
 */
export async function incrementUploadCount(userId: string, pagesProcessed: number): Promise<void> {
  const quota = await getUserQuota(userId);
  
  if (quota.needsReset) {
    await resetUserQuota(userId);
  }

  await db.update(userProfiles)
    .set({
      uploadsThisMonth: (quota.needsReset ? 0 : quota.uploadsThisMonth) + 1,
      updatedAt: new Date()
    })
    .where(eq(userProfiles.id, userId));
}

/**
 * Check if user can upload a file with given page count
 */
export async function canUserUpload(
  userId: string, 
  pageCount: number
): Promise<{
  canUpload: boolean;
  reason?: string;
  quotaInfo: UsageQuota;
  limits: QuotaLimits;
  pagesWillProcess?: number;
  upgradeAvailable?: boolean;
  resetDate?: string;
  daysUntilReset?: number;
}> {
  const user = await db.query.userProfiles.findFirst({
    where: eq(userProfiles.id, userId)
  });

  if (!user) {
    throw new Error('User not found');
  }

  const quota = await getUserQuota(userId);
  const limits = getQuotaLimits(user.isPremium || false);

  // Check upload limit with debugging
  console.log(`DEBUG: Quota check for user ${userId}:`, {
    uploadsThisMonth: quota.uploadsThisMonth,
    monthlyUploadLimit: limits.monthlyUploadLimit,
    isPremium: user.isPremium,
    needsReset: quota.needsReset
  });

  if (quota.uploadsThisMonth >= limits.monthlyUploadLimit) {
    console.log(`DEBUG: Upload blocked - limit reached`);
    
    const nextResetDate = new Date();
    nextResetDate.setMonth(nextResetDate.getMonth() + 1, 1);
    nextResetDate.setHours(0, 0, 0, 0);
    
    const daysUntilReset = Math.ceil((nextResetDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    
    return {
      canUpload: false,
      reason: user.isPremium 
        ? `You've reached your premium monthly limit of ${limits.monthlyUploadLimit} uploads. Your quota will reset in ${daysUntilReset} days on ${nextResetDate.toLocaleDateString()}.`
        : `You've reached your free tier limit of ${limits.monthlyUploadLimit} uploads this month. Upgrade to Premium for ${getQuotaLimits(true).monthlyUploadLimit} uploads per month, or wait ${daysUntilReset} days until ${nextResetDate.toLocaleDateString()} for your quota to reset.`,
      quotaInfo: quota,
      limits,
      upgradeAvailable: !user.isPremium,
      resetDate: nextResetDate.toISOString(),
      daysUntilReset
    };
  }

  // Calculate pages that will be processed
  let pagesWillProcess = Math.min(pageCount, limits.maxPagesPerFile);

  return {
    canUpload: true,
    quotaInfo: quota,
    limits,
    pagesWillProcess
  };
}

/**
 * Get quota status for UI display
 */
export async function getQuotaStatus(userId: string): Promise<{
  uploads: { used: number; limit: number; percentage: number };
  isPremium: boolean;
  needsReset: boolean;
}> {
  const user = await db.query.userProfiles.findFirst({
    where: eq(userProfiles.id, userId)
  });

  if (!user) {
    throw new Error('User not found');
  }

  const quota = await getUserQuota(userId);
  const limits = getQuotaLimits(user.isPremium || false);

  return {
    uploads: {
      used: quota.uploadsThisMonth,
      limit: limits.monthlyUploadLimit,
      percentage: Math.round((quota.uploadsThisMonth / limits.monthlyUploadLimit) * 100)
    },
    isPremium: user.isPremium || false,
    needsReset: quota.needsReset
  };
}
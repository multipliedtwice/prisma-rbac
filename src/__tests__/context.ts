import { PrismaClient } from "@prisma/client";

import { AccessRules, applyRBAC } from "../index";

export type MockContext = {
  prisma: PrismaClient;
};

export const createMockContext = (
  permissions: AccessRules | null,
  allowedActions?: string[],
  restrictedModels?: string[],
  synonyms?: Record<string, string[]>,
  mismatchHandler?: (mismatch: string[]) => void,
): MockContext => {
  const rbacPrisma = applyRBAC({
    prismaClient: new PrismaClient(),
    restrictedModels,
    mismatchHandler,
    allowedActions,
    permissions,
    synonyms,
  });

  return {
    prisma: rbacPrisma,
  };
};

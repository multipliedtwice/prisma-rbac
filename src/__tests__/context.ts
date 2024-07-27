import { PrismaClient } from "@prisma/client";

import { applyRBAC } from "../index";
import { ResourcePermissions } from "../types";

export type MockContext = {
  prisma: PrismaClient;
};

export const createMockContext = (
  permissions: ResourcePermissions | null,
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

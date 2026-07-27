import { PrismaClient } from "@prisma/client";
import { ResourcePermissions } from "../types";
export type MockContext = {
    prisma: PrismaClient;
};
export declare const createMockContext: (permissions: ResourcePermissions | null, allowedActions?: string[], restrictedModels?: string[], synonyms?: Record<string, string[]>, mismatchHandler?: (mismatch: string[]) => void) => MockContext;

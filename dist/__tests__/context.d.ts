import { PrismaClient } from "@prisma/client";
import { AccessRules } from "../index";
export type MockContext = {
    prisma: PrismaClient;
};
export declare const createMockContext: (permissions: AccessRules | null, allowedOperations?: string[], restrictedModels?: string[], synonyms?: Record<string, string[]>, mismatchHandler?: (mismatch: string[]) => void, debug?: any) => MockContext;

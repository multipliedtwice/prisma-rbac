"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMockContext = void 0;
const client_1 = require("@prisma/client");
const index_1 = require("../index");
const createMockContext = (permissions, allowedActions, restrictedModels, synonyms, mismatchHandler) => {
    const rbacPrisma = (0, index_1.applyRBAC)({
        prismaClient: new client_1.PrismaClient(),
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
exports.createMockContext = createMockContext;

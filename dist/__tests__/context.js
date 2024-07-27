"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMockContext = void 0;
const client_1 = require("@prisma/client");
const index_1 = require("../index"); // Adjust the import path as needed
const createMockContext = (permissions, allowedOperations, restrictedModels, synonyms, mismatchHandler, debug = true) => {
    const rbacPrisma = (0, index_1.applyRBAC)({
        permissions,
        allowedOperations,
        restrictedModels,
        prismaClient: new client_1.PrismaClient(),
        debug,
        synonyms,
        mismatchHandler,
    });
    return {
        prisma: rbacPrisma,
    };
};
exports.createMockContext = createMockContext;

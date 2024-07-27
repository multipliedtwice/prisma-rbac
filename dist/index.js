"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isActionAllowed = isActionAllowed;
exports.applyRBAC = applyRBAC;
exports.rbacQuery = rbacQuery;
exports.validateNestedPermissions = validateNestedPermissions;
exports.resolveModelAlias = resolveModelAlias;
function isActionAllowed(permissions, action, model) {
    if (!permissions || !model)
        return false;
    return !!permissions[model]?.[action];
}
const operationsMap = {
    createManyAndReturn: "create",
    findUniqueOrThrow: "read",
    findFirstOrThrow: "read",
    createMany: "create",
    updateMany: "update",
    deleteMany: "delete",
    findUnique: "read",
    findFirst: "read",
    aggregate: "read",
    findMany: "read",
    create: "create",
    update: "update",
    upsert: "update",
    delete: "delete",
    groupBy: "read",
    count: "read",
};
function applyRBAC({ allowedOperations = [], restrictedModels = [], debug, prismaClient, synonyms = {}, permissions, mismatchHandler, }) {
    const checkPermissionMismatch = () => {
        const mismatch = Array.isArray(restrictedModels)
            ? restrictedModels.filter((model) => !permissions || !permissions[model])
            : [];
        if (mismatch.length > 0 && typeof mismatchHandler === "function") {
            mismatchHandler(mismatch);
        }
    };
    checkPermissionMismatch();
    return prismaClient.$extends({
        query: {
            $allModels: {
                $allOperations: (params) => rbacQuery({
                    ...params,
                    allowedOperations,
                    restrictedModels,
                    debug,
                    permissions,
                    synonyms,
                }),
            },
        },
    });
}
function rbacQuery({ operation, model, query, args, allowedOperations, restrictedModels, debug, permissions, synonyms, }) {
    if (debug)
        console.log("RBAC Check", { operation, model, args });
    const action = operationsMap[operation];
    const operationKey = `${model}:${action}`;
    if (!restrictedModels.includes(model) || allowedOperations.includes(operationKey)) {
        return query(args);
    }
    if (!isActionAllowed(permissions, action, model)) {
        throw new Error("No permission");
    }
    if (!validateNestedPermissions({ permissions, synonyms, model, debug, args })) {
        throw new Error("No permission");
    }
    return query(args);
}
function validateNestedPermissions({ permissions, synonyms, model, debug, args, }) {
    return !Object.entries(args).some(([key, value]) => {
        if (typeof value === "object") {
            const operationType = operationsMap[key];
            if (operationType) {
                return !isActionAllowed(permissions, operationType, resolveModelAlias(model, synonyms));
            }
            else {
                return !validateNestedPermissions({
                    permissions,
                    synonyms,
                    model: key.toLowerCase(),
                    debug,
                    args: value,
                });
            }
        }
        return false;
    });
}
function resolveModelAlias(model, synonyms) {
    if (!synonyms || !model)
        return model;
    for (const [synonym, models] of Object.entries(synonyms)) {
        if (models.includes(model)) {
            return synonym;
        }
    }
    return model;
}

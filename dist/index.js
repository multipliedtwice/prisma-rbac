"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RBACError = void 0;
exports.isPermissionGranted = isPermissionGranted;
exports.applyRBAC = applyRBAC;
exports.isActionAllowed = isActionAllowed;
exports.validateNestedPermissions = validateNestedPermissions;
exports.mapModelAlias = mapModelAlias;
function isPermissionGranted(permissions, action, resource) {
    if (!permissions || !resource)
        return false;
    return !!permissions[resource]?.[action];
}
const operationMappings = {
    read: [
        "findUniqueOrThrow",
        "findFirstOrThrow",
        "findUnique",
        "findFirst",
        "aggregate",
        "findMany",
        "groupBy",
        "count",
    ],
    create: ["createManyAndReturn", "createMany", "create"],
    update: ["updateMany", "update", "upsert"],
    delete: ["deleteMany", "delete"],
};
const operationToActionMap = Object.fromEntries(Object.entries(operationMappings).flatMap(([action, operations]) => operations.map((operation) => [operation, action])));
function applyRBAC({ translate = (key, options) => key, restrictedModels = [], allowedActions = [], mismatchHandler, synonyms = {}, prismaClient, permissions, }) {
    const verifyPermissions = () => {
        if (!Array.isArray(restrictedModels)) {
            return;
        }
        const missingModels = restrictedModels.filter((model) => !permissions || !permissions[model]);
        const redundantModels = permissions
            ? Object.keys(permissions).filter((model) => !restrictedModels.includes(model))
            : [];
        if (typeof mismatchHandler === "function" && missingModels.length > 0) {
            mismatchHandler(missingModels, redundantModels);
        }
    };
    verifyPermissions();
    return prismaClient.$extends({
        query: {
            $allModels: {
                $allOperations: (params) => processRBAC({
                    ...params,
                    restrictedModels,
                    allowedActions,
                    permissions,
                    translate,
                    synonyms,
                }),
            },
        },
    });
}
function processRBAC({ restrictedModels, allowedActions, permissions, operation, translate, synonyms, model, query, args, }) {
    const action = operationToActionMap[operation];
    const actionKey = `${model}:${action}`;
    if (isActionAllowed({ restrictedModels, allowedActions, actionKey, model })) {
        return query(args);
    }
    if (!isPermissionGranted(permissions, action, model)) {
        throw new RBACError(action, model, translate);
    }
    if (!validateNestedPermissions({ permissions, synonyms, model, args })) {
        throw new RBACError(action, model, translate);
    }
    return query(args);
}
function isActionAllowed({ restrictedModels, allowedActions, actionKey, model, }) {
    return !restrictedModels?.includes(model) || allowedActions.includes(actionKey);
}
function validateNestedPermissions({ permissions, synonyms, model, args, }) {
    if (!args)
        return true;
    return !Object.entries(args).some(([key, value]) => {
        return checkPermissionForNested({ permissions, synonyms, value, model, key });
    });
}
function checkPermissionForNested({ permissions, synonyms, value, model, key, }) {
    if (typeof value === "object") {
        const operationType = key in operationToActionMap ? operationToActionMap[key] : undefined;
        if (operationType) {
            return !isPermissionGranted(permissions, operationType, mapModelAlias(model, synonyms));
        }
        return !validateNestedPermissions({
            model: key.toLowerCase(),
            permissions,
            args: value,
            synonyms,
        });
    }
    return false;
}
function mapModelAlias(model, synonyms) {
    if (!synonyms || !model)
        return model;
    for (const [alias, models] of Object.entries(synonyms)) {
        if (models.includes(model)) {
            return alias;
        }
    }
    return model;
}
// error
class RBACError extends Error {
    constructor(operation, model, translate) {
        super();
        this.operation = operation;
        this.model = model;
        this.status = 403;
        this.type = "RBACError";
        this.name = "RBACError";
        const translateFn = translate || ((key) => key);
        const translatedOperation = translateFn(`operations.${operation}`);
        const translatedModel = translateFn(`models.${model}`);
        this.message = translateFn("errors.noPermission", {
            operation: translatedOperation,
            model: translatedModel,
            status: this.status,
        });
    }
    toJSON() {
        return {
            operation: this.operation,
            message: this.message,
            status: this.status,
            model: this.model,
            error: this.name,
            type: this.type,
        };
    }
}
exports.RBACError = RBACError;

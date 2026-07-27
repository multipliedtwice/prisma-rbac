import { CheckNestedPermissionsParams, IsActionAllowedParams, ResourcePermissions, CRUDOperations, RBACOptions } from "./types";
export declare function isPermissionGranted(permissions: ResourcePermissions | undefined | null, action: CRUDOperations, resource: undefined | string): boolean;
export declare function applyRBAC<T>({ translate, restrictedModels, allowedActions, mismatchHandler, synonyms, prismaClient, permissions, }: RBACOptions<T>): any;
export declare function isActionAllowed({ restrictedModels, allowedActions, actionKey, model, }: IsActionAllowedParams): boolean;
export declare function validateNestedPermissions({ permissions, synonyms, model, args, }: CheckNestedPermissionsParams): boolean;
export declare function mapModelAlias(model: undefined | string, synonyms: Record<string, string[]> | undefined): undefined | string;
export declare class RBACError extends Error {
    operation: string;
    status: number;
    model: string;
    type: string;
    constructor(operation: string, model: string, translate?: (key: string, options?: Record<string, unknown>) => string);
    toJSON(): {
        operation: string;
        message: string;
        status: number;
        model: string;
        error: string;
        type: string;
    };
}

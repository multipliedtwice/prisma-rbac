type AccessControlActions = "create" | "update" | "delete" | "read";
export interface AccessRules {
    [resource: string]: {
        [action in AccessControlActions]?: boolean;
    };
}
export declare function isActionAllowed(permissions: AccessRules | null | undefined, action: AccessControlActions, model: string | undefined): boolean;
export declare function applyRBAC<T>({ allowedOperations, restrictedModels, debug, prismaClient, synonyms, permissions, mismatchHandler, }: {
    restrictedModels?: (string | undefined | any)[];
    permissions: AccessRules | null | undefined;
    synonyms?: Record<string, string[]>;
    allowedOperations?: string[];
    prismaClient: any | T;
    debug?: boolean;
    mismatchHandler?: (mismatch: string[]) => void;
}): any;
export declare function rbacQuery({ operation, model, query, args, allowedOperations, restrictedModels, debug, permissions, synonyms, }: {
    operation: string;
    model: string;
    query: any;
    args: any;
    allowedOperations: string[];
    restrictedModels: (string | undefined | any)[];
    debug?: boolean;
    permissions: AccessRules | null | undefined;
    synonyms?: Record<string, string[]>;
}): any;
export declare function validateNestedPermissions({ permissions, synonyms, model, debug, args, }: {
    permissions: AccessRules | null | undefined;
    synonyms?: Record<string, string[]>;
    debug?: boolean;
    model: string;
    args: any;
}): boolean;
export declare function resolveModelAlias(model: string | undefined, synonyms: Record<string, string[]> | undefined): string | undefined;
export {};

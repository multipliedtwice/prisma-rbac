import { RBACError } from ".";

export type CRUDOperations = "create" | "update" | "delete" | "read";

export interface ResourcePermissions {
  [resource: string]: Partial<Record<CRUDOperations, boolean>>;
}

export interface RBACOptions<T> {
  translate?: (key: string, options?: Record<string, unknown>) => string;
  mismatchHandler?: (missing: string[], redundant: string[]) => void;
  permissions: ResourcePermissions | undefined | null;
  restrictedModels?: (undefined | string | any)[];
  synonyms?: Record<string, string[]>;
  allowedActions?: string[];
  prismaClient: any | T;
}

export interface CheckPermissionForNestedParams {
  permissions: ResourcePermissions | undefined | null;
  synonyms?: Record<string, string[]>;
  model: string;
  key: string;
  value: any;
}

export interface IsActionAllowedParams {
  restrictedModels: (undefined | string | any)[];
  allowedActions: string[];
  actionKey: string;
  model: string;
}

export interface CheckNestedPermissionsParams {
  permissions: ResourcePermissions | undefined | null;
  synonyms?: Record<string, string[]>;
  model: string;
  args: any;
}

export interface ExecuteRBACParams {
  translate?: (key: string, options?: Record<string, unknown>) => string;
  permissions: ResourcePermissions | undefined | null;
  restrictedModels: (undefined | string | any)[];
  synonyms?: Record<string, string[]>;
  allowedActions: string[];
  operation: string;
  model: string;
  query: any;
  args: any;
}

export type RBACErrorType = InstanceType<typeof RBACError>;

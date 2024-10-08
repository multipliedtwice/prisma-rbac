import {
  CheckPermissionForNestedParams,
  CheckNestedPermissionsParams,
  IsActionAllowedParams,
  ResourcePermissions,
  ExecuteRBACParams,
  CRUDOperations,
  RBACOptions,
} from "./types";

export function isPermissionGranted(
  permissions: ResourcePermissions | undefined | null,
  action: CRUDOperations,
  resource: undefined | string,
): boolean {
  if (!permissions || !resource) return false;
  return !!permissions[resource]?.[action];
}

const operationMappings: Record<CRUDOperations, string[]> = {
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

const operationToActionMap: Record<string, CRUDOperations> = Object.fromEntries(
  Object.entries(operationMappings).flatMap(([action, operations]) =>
    operations.map((operation) => [operation, action as CRUDOperations]),
  ),
);

export function applyRBAC<T>({
  translate = (key, options) => key,
  restrictedModels = [],
  allowedActions = [],
  mismatchHandler,
  synonyms = {},
  prismaClient,
  permissions,
}: RBACOptions<T>) {
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
        $allOperations: (params: any) =>
          processRBAC({
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

function processRBAC({
  restrictedModels,
  allowedActions,
  permissions,
  operation,
  translate,
  synonyms,
  model,
  query,
  args,
}: ExecuteRBACParams) {
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

export function isActionAllowed({
  restrictedModels,
  allowedActions,
  actionKey,
  model,
}: IsActionAllowedParams): boolean {
  return !restrictedModels?.includes(model) || allowedActions.includes(actionKey);
}

export function validateNestedPermissions({
  permissions,
  synonyms,
  model,
  args,
}: CheckNestedPermissionsParams): boolean {
  if (!args) return true;
  return !Object.entries(args).some(([key, value]) => {
    return checkPermissionForNested({ permissions, synonyms, value, model, key });
  });
}

function checkPermissionForNested({
  permissions,
  synonyms,
  value,
  model,
  key,
}: CheckPermissionForNestedParams): boolean {
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

export function mapModelAlias(
  model: undefined | string,
  synonyms: Record<string, string[]> | undefined,
): undefined | string {
  if (!synonyms || !model) return model;

  for (const [alias, models] of Object.entries(synonyms)) {
    if (models.includes(model)) {
      return alias;
    }
  }

  return model;
}

// error
export class RBACError extends Error {
  operation: string;
  status: number;
  model: string;
  type: string;

  constructor(
    operation: string,
    model: string,
    translate?: (key: string, options?: Record<string, unknown>) => string,
  ) {
    super();
    this.operation = operation;
    this.model = model;
    this.status = 403;
    this.type = "RBACError";
    this.name = "RBACError";

    const translateFn = translate || ((key: string) => key);
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

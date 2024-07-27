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
  restrictedModels = [],
  allowedActions = [],
  mismatchHandler,
  synonyms = {},
  prismaClient,
  permissions,
}: RBACOptions<T>) {
  const verifyPermissions = () => {
    const mismatch = Array.isArray(restrictedModels)
      ? restrictedModels.filter((model) => !permissions || !permissions[model])
      : [];
    if (mismatch.length > 0 && typeof mismatchHandler === "function") {
      mismatchHandler(mismatch);
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
    throw new Error("No permission");
  }

  if (!validateNestedPermissions({ permissions, synonyms, model, args })) {
    throw new Error("No permission");
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

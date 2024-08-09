[![npm](https://img.shields.io/npm/l/prisma-rbac.svg)](LICENSE)
[![npm](https://img.shields.io/npm/dt/prisma-rbac.svg)](https://www.npmjs.com/package/prisma-rbac)
[![HitCount](https://hits.dwyl.com/multipliedtwice/prisma-rbac.svg?style=flat)](http://hits.dwyl.com/multipliedtwice/prisma-rbac)
![NPM Version](https://img.shields.io/npm/v/prisma-rbac)
[![codecov](https://codecov.io/gh/multipliedtwice/prisma-rbac/graph/badge.svg?token=3U7V712V70)](https://codecov.io/gh/multipliedtwice/prisma-rbac)

# Prisma-RBAC
**Prisma-RBAC is a role-based access control (RBAC) library** designed to integrate with Prisma, providing a **tool to manage user permissions**. This library enforces access control policies at a granular level for each model and action. 

It also allows defining permissions on a per-user basis. This makes it suitable for building applications that require detailed security. With customizable configurations and support for model synonyms, it ensures that your application's data access policies are consistently enforced.

## Features
- **Easy Integration**: You can add this library to your Prisma client without much hassle, making it easy to start using role-based access control in your application.
- **Fine-Grained Control**: This feature lets you set up detailed permissions for different actions on different models. For example, you can allow some users to read data but not update it, while others can do both.
- **Mismatch Handler**: If the permissions in your application don't match the current settings (maybe because of changes in production), this feature helps identify and fix those issues, making maintenance easier.
- **Support for Synonyms**: In Prisma schemas, relationships between models can have different names. For example, you might have a model note that is referred to as notes in another model's relationship. This feature manages permissions for these synonyms.
- **I18n**: Pass translation function to get human readable error messages.


## Installation
To install Prisma-RBAC, use your preferred package manager:

```sh
npm install prisma-rbac
# or
yarn add prisma-rbac
```

## Usage
1. **Authenticate User**: When a user token is authenticated, retrieve the user from the database along with their permissions.
2. **Extend Prisma Client**: Enhance the Prisma client with role-based access control for the current request.

```ts
import { PrismaClient } from '@prisma/client';
import { applyRBAC } from 'prisma-rbac';

// Define your role-based permissions
const permissions = {
  user: {
    create: true,
    read: true,
    update: false,
    delete: false,
  },
  note: {
    create: true,
    read: true,
    update: true,
    delete: false,
  },
};

// Mock function to simulate fetching a user with permissions from the database
async function getUserWithPermissions(userId: number) {
  // Simulate a user with specific permissions
  return {
    id: userId,
    email: 'user@example.com',
    permissions,
  };
}

// Initialize Prisma Client
const prisma = new PrismaClient();

// Middleware to enhance Prisma with RBAC
async function addRBACToRequest(req, res, next) {
  const user = await getUserWithPermissions(req.userId);
  req.prisma = applyRBAC({
    prisma,
    permissions: user.permissions,
    restrictedModels: ['user', 'note'],
    allowedActions: ['note:read'],
    synonyms: { note: ['notes'] },
    mismatchHandler: (mismatch) => console.warn('Mismatched permissions:', mismatch),
  });
  next();
}

// Example usage in an Express route
app.use(addRBACToRequest);

app.get('/notes', async (req, res) => {
  try {
    const notes = await req.prisma.note.findMany();
    res.json(notes);
  } catch (error) {
    res.status(403).json({ error: error.message });
  }
});

app.post('/notes', async (req, res) => {
  try {
    const note = await req.prisma.note.create({
      data: {
        title: 'New Note',
        body: 'Note content',
        userId: req.userId,
      },
    });
    res.json(note);
  } catch (error) {
    res.status(403).json({ error: error.message });
  }
});
```

### Configuration Options
| Option             | Type                          | Description                                                                                      |
|--------------------|-------------------------------|--------------------------------------------------------------------------------------------------|
| `permissions`      | `ResourcePermissions \| null \| undefined` | Defines the role-based permissions for models and actions.                                       |
| `restrictedModels`  | `Array<string>`               | Specifies the models that require RBAC checks.                                                   |
| `allowedActions` | `Array<string>`               | Lists the operations that are publicly accessible without RBAC checks.                           |
| `synonyms`          | `Record<string, string[]>`    | Maps model synonyms to their actual model names, useful for handling schema relation mismatches.  |
| `mismatchHandler`  | `(mismatch: string[]) => void`| Handles cases where users don't have permissions or permission models have changed, simplifying maintenance and fixing discrepancies. |
| `translate`        | `(key: TranslationKeys, options?: Record<string, unknown>) => string` | Optional i18next function to return access errors in human language. |

### i18n
The i18n should have structure similar to this to work:

```json
{
  "errors": {
    "noPermission": "คุณไม่มีสิทธิ์ในการดำเนินการ {{operation}} บน {{model}}."
  },
  "operations": {
    "read": "อ่าน",
    "create": "สร้าง",
    "update": "อัปเดต",
    "delete": "ลบ"
  },
  "models": {
    "User": "ผู้ใช้",
    "Post": "โพสต์",
    "Comment": "ความคิดเห็น"
  }
}
```


### Performance
Prisma-RBAC is optimized for performance, ensuring minimal overhead on your application's data access operations. Internal functions have been benchmarked to execute quickly (~0.003 ms on local test), even under heavy load.

### Contributing
If you have suggestions, bug reports, or feature requests, please open an issue or submit a pull request on our GitHub repository.

### License
Prisma-RBAC is licensed under the MIT License. See the LICENSE file for more information.

### Keywords
Prisma, RBAC, role-based access control, permissions, access control, security, Node.js, TypeScript


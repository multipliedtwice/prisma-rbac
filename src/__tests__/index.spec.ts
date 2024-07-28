import { isPermissionGranted, mapModelAlias } from "..";
import { createMockContext, MockContext } from "./context";

describe("Prisma Middleware Access Control Tests", () => {
  let mockCtx: MockContext;
  const restrictedModels: string[] = ["user"];

  test("Should be able to create a user with appropriate permissions", async () => {
    mockCtx = createMockContext(
      {
        user: { create: true, update: true, delete: true, read: true },
      },
      [],
      restrictedModels,
    );

    const userEmail = `admin-${Date.now()}@example.com`;
    const userData = { email: userEmail };
    const result = await mockCtx.prisma.user.create({ data: userData });
    expect(result).toMatchObject(userData);
  });

  test("Should not be able to create a user without create permission", async () => {
    mockCtx = createMockContext(
      {
        user: { create: false },
      },
      [],
      restrictedModels,
    );

    const userEmail = `user-${Date.now()}@example.com`;
    const userData = { email: userEmail };
    await expect(mockCtx.prisma.user.create({ data: userData })).rejects.toThrow(
      "errors.noPermission",
    );
  });

  test("Should be able to read user information with read permission", async () => {
    mockCtx = createMockContext(
      {
        user: { read: true },
      },
      [],
      restrictedModels,
    );

    await expect(mockCtx.prisma.user.findMany()).resolves.toBeDefined();
  });

  test("Should reject operation without permissions", async () => {
    mockCtx = createMockContext({}, [], restrictedModels);
    await expect(mockCtx.prisma.user.findMany()).rejects.toThrow("errors.noPermission");
  });

  test("Should allow operation with full permissions", async () => {
    mockCtx = createMockContext(
      {
        user: { create: true, update: true, delete: true, read: true },
      },
      [],
      restrictedModels,
    );

    await expect(mockCtx.prisma.user.findMany()).resolves.toBeDefined();
  });

  test("Should respect specific permissions", async () => {
    mockCtx = createMockContext(
      {
        user: { create: true, update: true, read: true },
      },
      [],
      restrictedModels,
    );

    const createdUser = await mockCtx.prisma.user.create({
      data: { email: "original@example.com" },
    });

    await expect(
      mockCtx.prisma.user.update({
        data: { email: "updated@example.com" },
        where: { id: createdUser.id },
      }),
    ).resolves.toBeDefined();

    await expect(mockCtx.prisma.user.delete({ where: { id: createdUser.id } })).rejects.toThrow(
      "errors.noPermission",
    );
  });

  test("Public operation on protected model", async () => {
    mockCtx = createMockContext({}, ["user:read"], restrictedModels);
    await expect(mockCtx.prisma.user.findMany()).resolves.toBeDefined();
  });

  test("Access to unprotected model", async () => {
    mockCtx = createMockContext({}, ["note"], []);
    await expect(mockCtx.prisma.note.findMany()).resolves.toBeDefined();
  });

  test("Should allow nested create on related models with appropriate permissions", async () => {
    mockCtx = createMockContext(
      {
        user: { create: true },
        note: { create: true },
      },
      [],
      restrictedModels,
      {
        note: ["notes"],
      },
    );

    const newUserWithNote = {
      notes: {
        create: { body: "Note content", title: "New Note" },
      },
      email: `user-${Date.now()}@example.com`,
    };

    await expect(mockCtx.prisma.user.create({ data: newUserWithNote })).resolves.toMatchObject({
      email: newUserWithNote.email,
    });
  });

  test("Should deny nested create on related models without appropriate permissions", async () => {
    mockCtx = createMockContext(
      {
        note: { create: false },
        user: { create: true },
      },
      [],
      restrictedModels,
    );

    const newUserWithNote = {
      notes: {
        create: { body: "Note content", title: "New Note" },
      },
      email: `user-${Date.now()}@example.com`,
    };

    await expect(mockCtx.prisma.user.create({ data: newUserWithNote })).rejects.toThrow(
      "errors.noPermission",
    );
  });

  test("User should be able to create a note with nested content", async () => {
    const permissions = {
      user: { create: true },
      note: { create: true },
    };

    mockCtx = createMockContext(permissions, [], ["user", "note"], {
      user: ["author"],
      note: ["notes"],
    });

    const newUser = await mockCtx.prisma.user.create({
      data: {
        email: "john@example.com",
      },
    });

    await expect(
      mockCtx.prisma.note.create({
        data: {
          user: { connect: { id: newUser.id } },
          body: "Note content",
          title: "New Note",
        },
      }),
    ).resolves.toBeDefined();
  });

  test("User should not be able to delete a note if not the author", async () => {
    const permissions = {
      note: { delete: false, create: true },
      user: { create: true },
    };

    mockCtx = createMockContext(permissions, [], ["user", "note"]);

    const user = await mockCtx.prisma.user.create({
      data: { email: "original@example.com" },
    });

    const note = await mockCtx.prisma.note.create({
      data: { body: "Content", userId: user.id, title: "Note" },
    });

    await expect(
      mockCtx.prisma.note.delete({
        where: { id: note.id },
      }),
    ).rejects.toThrow("errors.noPermission");
  });

  test("Admin should be able to update any note's content in a nested operation", async () => {
    const permissions = {
      note: { create: true, update: true },
      user: { create: true },
    };

    mockCtx = createMockContext(permissions, [], ["user", "note"]);

    const user = await mockCtx.prisma.user.create({
      data: { email: "original@example.com" },
    });

    const note = await mockCtx.prisma.note.create({
      data: { body: "Content", userId: user.id, title: "Note" },
    });

    const updateData = {
      body: "Updated Note content",
      title: "Updated Note Title",
    };

    await expect(
      mockCtx.prisma.note.update({
        where: { id: note.id },
        data: updateData,
      }),
    ).resolves.toBeDefined();
  });

  test("User should be able to read notes with read permission", async () => {
    const permissions = {
      user: { create: true, read: true },
      note: { read: true },
    };

    mockCtx = createMockContext(permissions, [], ["user", "note"], {
      note: ["notes"],
    });

    await mockCtx.prisma.user.create({
      data: { email: "john@example.com" },
    });

    await expect(
      mockCtx.prisma.user.findMany({
        include: {
          notes: true,
        },
        where: { email: "john@example.com" },
      }),
    ).resolves.toBeDefined();
  });

  test("Should allow reading a note with nested user information", async () => {
    mockCtx = createMockContext({}, ["note:read"], ["note"]);

    jest.spyOn(mockCtx.prisma.note, "findMany").mockResolvedValueOnce([
      {
        user: {
          email: "john.doe@example.com",
          id: 1,
        },
        body: "This is a test note",
        title: "Test Note",
        id: 1,
      } as any,
    ]);

    const notes = await mockCtx.prisma.note.findMany({
      include: {
        user: true,
      },
    });

    expect(notes).toBeDefined();
    expect(notes[0]).toHaveProperty("title", "Test Note");
    expect(notes[0].user).toBeDefined();
    expect(notes[0].user.email).toEqual("john.doe@example.com");
  });
});

describe("RBAC Helper Functions", () => {
  test("Should return false if permissions or model is undefined", () => {
    expect(isPermissionGranted(undefined, "create", "user")).toBe(false);
    expect(isPermissionGranted({}, "create", undefined)).toBe(false);
  });

  test("Should handle permission mismatch", () => {
    const mismatchHandler = jest.fn();

    createMockContext({ user: { create: true } }, [], ["note"], {}, mismatchHandler);

    expect(mismatchHandler).toHaveBeenCalledWith(["note"]);
  });

  test("Should handle permission mismatch with null permissions", () => {
    const mismatchHandler = jest.fn();

    createMockContext(null, [], ["note"], {}, mismatchHandler);

    expect(mismatchHandler).toHaveBeenCalledWith(["note"]);
  });

  test("Should use default parameters", () => {
    const mismatchHandler = jest.fn();

    const mockCtx = createMockContext(
      { user: { create: true } },
      undefined,
      undefined,
      undefined,
      mismatchHandler,
    );

    expect(mockCtx.prisma).toBeDefined();
  });

  test("Should override default parameters", () => {
    const mismatchHandler = jest.fn();

    const mockCtx = createMockContext(
      { user: { create: true } },
      ["note:read"],
      ["user", "note"],
      { user: ["creator"] },
      mismatchHandler,
    );

    expect(mockCtx.prisma).toBeDefined();
  });
});

describe("mapModelAlias Function", () => {
  test("should return synonym if model is in the synonyms list", () => {
    const synonyms = {
      user: ["author", "creator"],
      note: ["comment"],
    };

    expect(mapModelAlias("author", synonyms)).toBe("user");
    expect(mapModelAlias("comment", synonyms)).toBe("note");
  });

  test("should return original model if no synonym is defined", () => {
    const synonyms = {
      user: ["author", "creator"],
      note: ["comment"],
    };

    expect(mapModelAlias("unknown", synonyms)).toBe("unknown");
    expect(mapModelAlias("note", synonyms)).toBe("note");
  });

  test("should return original model if synonyms are not defined", () => {
    expect(mapModelAlias("user", undefined)).toBe("user");
    expect(mapModelAlias("note", undefined)).toBe("note");
  });

  test("should return undefined if model is undefined", () => {
    const synonyms = {
      user: ["author", "creator"],
    };

    expect(mapModelAlias(undefined, synonyms)).toBe(undefined);
  });
});

const valuePool = [
  "stringValue",
  42,
  true,
  false,
  null,
  undefined,
  ["array", "with", "strings"],
  [1, 2, 3, 4, 5],
  { key: "value" },
  { nested: { key: "nestedValue" } },
  function () {
    return "functionResult";
  },
  Symbol("symbol"),
  BigInt(12345),
];

function getRandomValue() {
  // eslint-disable-next-line security-node/detect-insecure-randomness
  return valuePool[Math.floor(Math.random() * valuePool.length)];
}

describe("Fuzzing RBAC Helper Functions", () => {
  test("Fuzzing createMockContext with random inputs", () => {
    for (let i = 0; i < 15; i++) {
      const permissions = getRandomValue();
      const allowedOperations = getRandomValue();
      const restrictedModels = getRandomValue();
      const synonyms = getRandomValue();
      const mismatchHandler = getRandomValue();

      const mockCtx = createMockContext(
        permissions as any,
        allowedOperations as any,
        restrictedModels as any,
        synonyms as any,
        mismatchHandler as any,
      );
      expect(mockCtx.prisma).toBeDefined();
    }
  });
});

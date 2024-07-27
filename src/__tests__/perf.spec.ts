import { performance } from "perf_hooks";

import { validateNestedPermissions, isActionAllowed, mapModelAlias } from "..";

const measureExecutionTime = (func: Function, ...args: any[]) => {
  const start = performance.now();
  func(...args);
  return performance.now() - start;
};

const runPerformanceTest = (iterations: number, func: Function, ...args: any[]) => {
  const times: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const execTime = measureExecutionTime(func, ...args);
    times.push(execTime);
  }

  times.sort((a, b) => a - b);
  const median = times[Math.floor(times.length / 2)];

  // eslint-disable-next-line security-node/detect-crlf
  console.log(`Median time for ${iterations} iterations of ${func.name}: ${median} ms`);
};

describe("Internal Function Performance Test", () => {
  // eslint-disable-next-line jest/expect-expect
  it("should measure the performance of isActionAllowed function", () => {
    const iterations = 10000;
    const permissions = {
      user: { update: false, delete: false, create: true, read: true },
    };
    const action = "read";
    const model = "user";
    runPerformanceTest(iterations, isActionAllowed, permissions, action, model);
  });

  // eslint-disable-next-line jest/expect-expect
  it("should measure the performance of mapModelAlias function", () => {
    const iterations = 10000;
    const model = "user";
    const synonyms = { user: ["member", "participant"] };
    runPerformanceTest(iterations, mapModelAlias, model, synonyms);
  });

  // eslint-disable-next-line jest/expect-expect
  it("should measure the performance of validateNestedPermissions function", () => {
    const iterations = 10000;
    const permissions = {
      user: { update: false, delete: false, create: true, read: true },
    };
    const synonyms = { user: ["member", "participant"] };
    const model = "user";
    const args = { create: { data: { name: "John" } } };
    runPerformanceTest(iterations, validateNestedPermissions, {
      permissions,
      synonyms,
      model,
      args,
    });
  });
});

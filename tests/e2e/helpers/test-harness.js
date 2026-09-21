/**
 * TataDana E2E Test Harness & Assertion Engine
 * Zero-dependency, deterministic test framework for standalone E2E execution.
 */

const results = {
  suites: [],
  currentSuite: null,
  total: 0,
  passed: 0,
  failed: 0,
  skipped: 0,
  startTime: Date.now(),
  endTime: null,
};

function describe(suiteName, fn) {
  const suite = {
    name: suiteName,
    tests: [],
    passed: 0,
    failed: 0,
    skipped: 0,
    durationMs: 0,
  };
  results.suites.push(suite);
  results.currentSuite = suite;

  const suiteStart = Date.now();
  try {
    fn();
  } catch (err) {
    console.error(`Error in test suite definition "${suiteName}":`, err);
  }
  suite.durationMs = Date.now() - suiteStart;
  results.currentSuite = null;
}

function it(testName, fn) {
  if (!results.currentSuite) {
    describe("Default Suite", () => it(testName, fn));
    return;
  }

  results.total++;
  const testRecord = {
    name: testName,
    passed: false,
    durationMs: 0,
    error: null,
  };
  results.currentSuite.tests.push(testRecord);

  const start = Date.now();
  try {
    const res = fn();
    if (res && typeof res.then === "function") {
      throw new Error(
        `Async test "${testName}" must be run synchronously or handled in runner.`
      );
    }
    testRecord.passed = true;
    results.passed++;
    results.currentSuite.passed++;
  } catch (err) {
    testRecord.passed = false;
    testRecord.error = err;
    results.failed++;
    results.currentSuite.failed++;
  }
  testRecord.durationMs = Date.now() - start;
}

async function itAsync(testName, asyncFn) {
  if (!results.currentSuite) {
    describe("Default Suite", () => {});
  }
  results.total++;
  const testRecord = {
    name: testName,
    passed: false,
    durationMs: 0,
    error: null,
  };
  results.currentSuite.tests.push(testRecord);

  const start = Date.now();
  try {
    await asyncFn();
    testRecord.passed = true;
    results.passed++;
    results.currentSuite.passed++;
  } catch (err) {
    testRecord.passed = false;
    testRecord.error = err;
    results.failed++;
    results.currentSuite.failed++;
  }
  testRecord.durationMs = Date.now() - start;
}

function expect(actual) {
  return {
    toBe(expected) {
      if (actual !== expected) {
        throw new Error(
          `Expected ${JSON.stringify(expected)} (${typeof expected}), but received ${JSON.stringify(
            actual
          )} (${typeof actual})`
        );
      }
    },
    toEqual(expected) {
      const a = JSON.stringify(actual);
      const e = JSON.stringify(expected);
      if (a !== e) {
        throw new Error(`Expected deep equality:\nExpected: ${e}\nActual:   ${a}`);
      }
    },
    toBeGreaterThan(expected) {
      if (!(actual > expected)) {
        throw new Error(`Expected ${actual} to be > ${expected}`);
      }
    },
    toBeGreaterThanOrEqual(expected) {
      if (!(actual >= expected)) {
        throw new Error(`Expected ${actual} to be >= ${expected}`);
      }
    },
    toBeLessThan(expected) {
      if (!(actual < expected)) {
        throw new Error(`Expected ${actual} to be < ${expected}`);
      }
    },
    toBeLessThanOrEqual(expected) {
      if (!(actual <= expected)) {
        throw new Error(`Expected ${actual} to be <= ${expected}`);
      }
    },
    toContain(expected) {
      if (typeof actual === "string" || Array.isArray(actual)) {
        if (!actual.includes(expected)) {
          throw new Error(
            `Expected ${JSON.stringify(actual)} to contain ${JSON.stringify(expected)}`
          );
        }
      } else {
        throw new Error(`actual is not a string or array`);
      }
    },
    toMatch(regex) {
      if (!regex.test(String(actual))) {
        throw new Error(
          `Expected "${actual}" to match regular expression ${regex}`
        );
      }
    },
    toBeTruthy() {
      if (!actual) {
        throw new Error(`Expected truthy value, but received: ${actual}`);
      }
    },
    toBeFalsy() {
      if (actual) {
        throw new Error(`Expected falsy value, but received: ${actual}`);
      }
    },
    toBeNull() {
      if (actual !== null) {
        throw new Error(`Expected null, but received: ${actual}`);
      }
    },
    toBeDefined() {
      if (actual === undefined) {
        throw new Error(`Expected defined value, but received undefined`);
      }
    },
    toBeUndefined() {
      if (actual !== undefined) {
        throw new Error(`Expected undefined, but received ${actual}`);
      }
    },
    toBeCloseTo(expected, numDigits = 2) {
      const diff = Math.abs(actual - expected);
      const tolerance = Math.pow(10, -numDigits) / 2;
      if (diff > tolerance) {
        throw new Error(
          `Expected ${actual} to be close to ${expected} within ${tolerance}, difference was ${diff}`
        );
      }
    },
    toThrow(expectedMessagePattern) {
      if (typeof actual !== "function") {
        throw new Error(`Actual must be a function to test if it throws`);
      }
      let threw = false;
      let error = null;
      try {
        actual();
      } catch (e) {
        threw = true;
        error = e;
      }
      if (!threw) {
        throw new Error(`Expected function to throw, but it succeeded.`);
      }
      if (expectedMessagePattern && error) {
        const msg = error.message || String(error);
        if (expectedMessagePattern instanceof RegExp) {
          if (!expectedMessagePattern.test(msg)) {
            throw new Error(
              `Function threw error "${msg}", but did not match ${expectedMessagePattern}`
            );
          }
        } else if (!msg.includes(expectedMessagePattern)) {
          throw new Error(
            `Function threw error "${msg}", but did not contain "${expectedMessagePattern}"`
          );
        }
      }
    },
  };
}

function getResults() {
  results.endTime = Date.now();
  return results;
}

function resetResults() {
  results.suites = [];
  results.currentSuite = null;
  results.total = 0;
  results.passed = 0;
  results.failed = 0;
  results.skipped = 0;
  results.startTime = Date.now();
  results.endTime = null;
}

module.exports = {
  describe,
  it,
  itAsync,
  expect,
  getResults,
  resetResults,
};

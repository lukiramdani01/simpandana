#!/usr/bin/env node
/**
 * TataDana E2E Test Suite Standalone Runner
 * Supports --tier=1|2|3|4|all, --verbose, and exit code convention (0 on pass, 1 on fail).
 */

const path = require("path");
const harness = require("./helpers/test-harness");

// ANSI color helpers
const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
  blue: "\x1b[34m",
};

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    tier: "all",
    verbose: false,
    feature: null,
  };

  for (const arg of args) {
    if (arg.startsWith("--tier=")) {
      options.tier = arg.split("=")[1].trim().toLowerCase();
    } else if (arg === "-t" || arg === "--tier") {
      const idx = args.indexOf(arg);
      if (idx !== -1 && args[idx + 1]) {
        options.tier = args[idx + 1].trim().toLowerCase();
      }
    } else if (arg === "--verbose" || arg === "-v") {
      options.verbose = true;
    } else if (arg.startsWith("--feature=")) {
      options.feature = arg.split("=")[1].trim();
    }
  }

  return options;
}

const TIER_FILES = {
  1: {
    name: "Tier 1: Feature Coverage (Category Partition)",
    file: "./tier1-feature-coverage.test.js",
  },
  2: {
    name: "Tier 2: Boundary & Corner Cases",
    file: "./tier2-boundary-corner.test.js",
  },
  3: {
    name: "Tier 3: Cross-Feature Combinations",
    file: "./tier3-cross-feature.test.js",
  },
  4: {
    name: "Tier 4: Realistic Application Scenarios",
    file: "./tier4-application-scenarios.test.js",
  },
};

function main() {
  const options = parseArgs();
  console.log(`\n${colors.bold}${colors.cyan}====================================================${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}   TataDana SaaS — E2E Test Suite Runner ($5M Grade) ${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}====================================================${colors.reset}`);
  console.log(`${colors.dim}Timestamp: ${new Date().toISOString()}${colors.reset}`);
  console.log(`${colors.dim}Selected Tier: ${colors.bold}${options.tier.toUpperCase()}${colors.reset}\n`);

  let targetTiers = [];
  if (options.tier === "all" || options.tier === "all-tiers") {
    targetTiers = [1, 2, 3, 4];
  } else if (["1", "2", "3", "4"].includes(options.tier)) {
    targetTiers = [parseInt(options.tier, 10)];
  } else if (options.tier.startsWith("tier")) {
    const num = parseInt(options.tier.replace("tier", ""), 10);
    if ([1, 2, 3, 4].includes(num)) {
      targetTiers = [num];
    } else {
      console.error(`${colors.red}Error: Unknown tier "${options.tier}". Allowed: 1, 2, 3, 4, all${colors.reset}`);
      process.exit(1);
    }
  } else {
    console.error(`${colors.red}Error: Invalid --tier option "${options.tier}". Allowed: 1, 2, 3, 4, all${colors.reset}`);
    process.exit(1);
  }

  const overallResults = {
    total: 0,
    passed: 0,
    failed: 0,
    tierBreakdown: {},
    failures: [],
    startTime: Date.now(),
  };

  for (const tierNum of targetTiers) {
    const tierMeta = TIER_FILES[tierNum];
    console.log(`${colors.bold}${colors.blue}▶ Running ${tierMeta.name}...${colors.reset}`);

    harness.resetResults();
    const tierStart = Date.now();

    try {
      const fullPath = path.resolve(__dirname, tierMeta.file);
      // Clear require cache to ensure fresh run if invoked repeatedly
      delete require.cache[fullPath];
      require(fullPath);
    } catch (err) {
      console.error(`${colors.red}Fatal execution error in ${tierMeta.name}:${colors.reset}`, err);
      overallResults.failed++;
      overallResults.failures.push({
        tier: tierNum,
        suite: "Module Load Error",
        test: tierMeta.file,
        error: err,
      });
      continue;
    }

    const tierResults = harness.getResults();
    const tierDuration = Date.now() - tierStart;

    overallResults.total += tierResults.total;
    overallResults.passed += tierResults.passed;
    overallResults.failed += tierResults.failed;
    overallResults.tierBreakdown[tierNum] = {
      name: tierMeta.name,
      total: tierResults.total,
      passed: tierResults.passed,
      failed: tierResults.failed,
      durationMs: tierDuration,
    };

    // Print suite-level status
    for (const suite of tierResults.suites) {
      const suiteStatus = suite.failed === 0 ? `${colors.green}PASS${colors.reset}` : `${colors.red}FAIL${colors.reset}`;
      console.log(`  [${suiteStatus}] ${colors.bold}${suite.name}${colors.reset} (${suite.passed}/${suite.tests.length} passed, ${suite.durationMs}ms)`);

      for (const t of suite.tests) {
        if (!t.passed) {
          overallResults.failures.push({
            tier: tierNum,
            suite: suite.name,
            test: t.name,
            error: t.error,
          });
          console.log(`    ${colors.red}✗ ${t.name}${colors.reset}`);
          if (t.error && t.error.message) {
            console.log(`      ${colors.dim}${t.error.message.split("\n")[0]}${colors.reset}`);
          }
        } else if (options.verbose) {
          console.log(`    ${colors.green}✓ ${t.name}${colors.reset}`);
        }
      }
    }
    console.log(
      `  ${colors.dim}Tier ${tierNum} complete: ${tierResults.passed} passed, ${tierResults.failed} failed in ${tierDuration}ms${colors.reset}\n`
    );
  }

  const totalDuration = Date.now() - overallResults.startTime;

  // Print Summary Table
  console.log(`${colors.bold}${colors.cyan}====================================================${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}                 TEST RUN SUMMARY                   ${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}====================================================${colors.reset}`);

  for (const tierNum of targetTiers) {
    const breakdown = overallResults.tierBreakdown[tierNum];
    if (breakdown) {
      const statusColor = breakdown.failed === 0 ? colors.green : colors.red;
      console.log(
        `Tier ${tierNum} (${breakdown.name.split(":")[1].trim()}): ${statusColor}${breakdown.passed} passed, ${
          breakdown.failed
        } failed${colors.reset} (Total: ${breakdown.total}, ${breakdown.durationMs}ms)`
      );
    }
  }

  console.log("----------------------------------------------------");
  const finalStatus =
    overallResults.failed === 0
      ? `${colors.bold}${colors.green}ALL TESTS PASSED${colors.reset}`
      : `${colors.bold}${colors.red}TESTS FAILED${colors.reset}`;

  console.log(`Status:        ${finalStatus}`);
  console.log(`Total Tests:   ${overallResults.total}`);
  console.log(`Passed:        ${colors.green}${overallResults.passed}${colors.reset}`);
  console.log(`Failed:        ${overallResults.failed > 0 ? colors.red : colors.dim}${overallResults.failed}${colors.reset}`);
  console.log(`Duration:      ${totalDuration}ms`);
  console.log(`${colors.bold}${colors.cyan}====================================================${colors.reset}\n`);

  // Print failure details if any
  if (overallResults.failures.length > 0) {
    console.log(`${colors.bold}${colors.red}Failures (${overallResults.failures.length}):${colors.reset}\n`);
    overallResults.failures.forEach((f, idx) => {
      console.log(`${colors.bold}${idx + 1}) [Tier ${f.tier}] ${f.suite} > ${f.test}${colors.reset}`);
      if (f.error && f.error.stack) {
        console.log(`${colors.red}${f.error.stack}${colors.reset}\n`);
      } else {
        console.log(`${colors.red}${f.error}${colors.reset}\n`);
      }
    });
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main();

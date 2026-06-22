// Compact Jest test output: show only test file summaries and failures
export function jestTest(text) {
  const lines = text.split("\n");
  const result = [];
  let pass = 0, fail = 0, totalSuites = 0;
  let inSummary = false;
  let inFailures = false;
  let failuresWritten = [];
  
  for (const line of lines) {
    // Test suite result: PASS/FALL src/file.test.js
    const testMatch = line.match(/^(PASS|FAIL)\s+(.+\.test\.\w+)/);
    if (testMatch) {
      totalSuites++;
      if (testMatch[1] === "PASS") pass++;
      else fail++;
      result.push(line);
      continue;
    }
    
    // Snapshot summary
    if (line.startsWith("Snapshot Summary")) {
      result.push(line);
      inSummary = true;
      continue;
    }
    
    // Test results summary
    if (line.match(/^Tests:\s+/) || line.startsWith("Test Suites:")) {
      result.push(line);
      inSummary = true;
      continue;
    }
    
    // Failure details: only keep first 3 failures
    if (line.startsWith("  ●")) {
      if (failuresWritten.length < 3) {
        result.push(line);
        failuresWritten.push(line);
      }
      inFailures = true;
      continue;
    }
    
    // At failure details: only keep lines for first 3 failures
    if (inFailures) {
      if (failuresWritten.length <= 3) {
        result.push(line);
      }
      if (line.trim() === "") inFailures = false;
      continue;
    }
    
    // In summary section: include all lines
    if (inSummary) {
      result.push(line);
    }
  }
  
  if (result.length === 0) return text;
  
  // Add header if we split
  if (pass + fail > 0) {
    result.unshift(`[jest] Suites: ${pass} passed, ${fail} failed (${totalSuites} total)`);
  }
  
  return result.join("\n");
}

jestTest.filterName = "jest-test";
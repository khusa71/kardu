// Button Redirection Test Script
// This script tests all button redirections and logs results

const TEST_RESULTS = {
  passed: 0,
  failed: 0,
  errors: []
};

// Test configuration
const BASE_URL = 'http://localhost:5000';
const TIMEOUT = 5000;

// Helper function to log test results
function logTest(testName, status, error = null) {
  const timestamp = new Date().toISOString();
  const result = {
    test: testName,
    status: status,
    timestamp: timestamp,
    error: error
  };
  
  if (status === 'PASS') {
    TEST_RESULTS.passed++;
    console.log(`✅ ${testName} - PASSED`);
  } else {
    TEST_RESULTS.failed++;
    TEST_RESULTS.errors.push(result);
    console.log(`❌ ${testName} - FAILED: ${error}`);
  }
}

// Test 1: Check if server is running
async function testServerStatus() {
  try {
    const response = await fetch(BASE_URL);
    if (response.ok) {
      logTest('Server Status', 'PASS');
      return true;
    } else {
      logTest('Server Status', 'FAIL', `HTTP ${response.status}`);
      return false;
    }
  } catch (error) {
    logTest('Server Status', 'FAIL', error.message);
    return false;
  }
}

// Test 2: Check API endpoints
async function testApiEndpoints() {
  const endpoints = [
    '/api/auth/user',
    '/api/history',
    '/api/jobs/1',
    '/api/decks'
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(BASE_URL + endpoint);
      // API endpoints may return 401 without auth, which is expected
      if (response.status === 401 || response.status === 200) {
        logTest(`API Endpoint ${endpoint}`, 'PASS');
      } else {
        logTest(`API Endpoint ${endpoint}`, 'FAIL', `HTTP ${response.status}`);
      }
    } catch (error) {
      logTest(`API Endpoint ${endpoint}`, 'FAIL', error.message);
    }
  }
}

// Test 3: Check route accessibility
async function testRouteAccessibility() {
  const routes = [
    '/',
    '/dashboard',
    '/upload',
    '/history',
    '/study',
    '/admin',
    '/auth/callback',
    '/reset-password'
  ];
  
  for (const route of routes) {
    try {
      const response = await fetch(BASE_URL + route);
      if (response.ok) {
        logTest(`Route ${route}`, 'PASS');
      } else {
        logTest(`Route ${route}`, 'FAIL', `HTTP ${response.status}`);
      }
    } catch (error) {
      logTest(`Route ${route}`, 'FAIL', error.message);
    }
  }
}

// Test 4: Check for JavaScript errors in HTML
async function testJavaScriptErrors() {
  try {
    const response = await fetch(BASE_URL);
    const html = await response.text();
    
    // Check for common error patterns
    const errorPatterns = [
      /Error:/i,
      /Failed to/i,
      /Cannot find/i,
      /Uncaught/i,
      /TypeError/i,
      /ReferenceError/i
    ];
    
    const hasErrors = errorPatterns.some(pattern => pattern.test(html));
    
    if (!hasErrors) {
      logTest('JavaScript Errors Check', 'PASS');
    } else {
      logTest('JavaScript Errors Check', 'FAIL', 'JavaScript errors found in HTML');
    }
  } catch (error) {
    logTest('JavaScript Errors Check', 'FAIL', error.message);
  }
}

// Test 5: Check static assets
async function testStaticAssets() {
  const assets = [
    '/favicon.ico',
    '/vite.svg'
  ];
  
  for (const asset of assets) {
    try {
      const response = await fetch(BASE_URL + asset);
      if (response.ok) {
        logTest(`Static Asset ${asset}`, 'PASS');
      } else {
        logTest(`Static Asset ${asset}`, 'FAIL', `HTTP ${response.status}`);
      }
    } catch (error) {
      logTest(`Static Asset ${asset}`, 'FAIL', error.message);
    }
  }
}

// Main test execution
async function runAllTests() {
  console.log('🚀 Starting Button Redirection Tests...');
  console.log('=====================================');
  
  const serverRunning = await testServerStatus();
  
  if (serverRunning) {
    await testApiEndpoints();
    await testRouteAccessibility();
    await testJavaScriptErrors();
    await testStaticAssets();
  }
  
  console.log('\n📊 Test Results Summary:');
  console.log('========================');
  console.log(`✅ Passed: ${TEST_RESULTS.passed}`);
  console.log(`❌ Failed: ${TEST_RESULTS.failed}`);
  console.log(`📈 Total: ${TEST_RESULTS.passed + TEST_RESULTS.failed}`);
  
  if (TEST_RESULTS.errors.length > 0) {
    console.log('\n🔍 Failed Tests Details:');
    console.log('========================');
    TEST_RESULTS.errors.forEach(error => {
      console.log(`- ${error.test}: ${error.error}`);
    });
  }
  
  return TEST_RESULTS;
}

// Export for use in browser console
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runAllTests, logTest, TEST_RESULTS };
}

// Auto-run if in Node.js environment
if (typeof window === 'undefined') {
  runAllTests();
}
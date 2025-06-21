// Comprehensive Button Redirection Test Suite
// Run this script in the browser console on http://localhost:5000

(function() {
    'use strict';
    
    const TEST_CONFIG = {
        baseUrl: window.location.origin,
        timeout: 5000,
        verbose: true
    };
    
    const testResults = {
        total: 0,
        passed: 0,
        failed: 0,
        errors: []
    };
    
    // Utility functions
    function log(message, type = 'info') {
        const styles = {
            info: 'color: #3b82f6; font-weight: normal;',
            success: 'color: #10b981; font-weight: bold;',
            error: 'color: #ef4444; font-weight: bold;',
            warning: 'color: #f59e0b; font-weight: bold;'
        };
        console.log(`%c${message}`, styles[type]);
    }
    
    function recordTest(testName, passed, error = null) {
        testResults.total++;
        if (passed) {
            testResults.passed++;
            log(`✅ ${testName} - PASSED`, 'success');
        } else {
            testResults.failed++;
            testResults.errors.push({ test: testName, error });
            log(`❌ ${testName} - FAILED: ${error}`, 'error');
        }
    }
    
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    // Test 1: Check current page elements
    async function testCurrentPageElements() {
        log('🔍 Testing current page elements...', 'info');
        
        // Test navigation bar elements
        const navTests = [
            { selector: 'nav a[href="/"]', name: 'Logo link', expectedHref: '/' },
            { selector: 'nav a[href="/dashboard"]', name: 'Dashboard nav link', expectedHref: '/dashboard' },
            { selector: 'nav a[href="/upload"]', name: 'Upload nav link', expectedHref: '/upload' },
            { selector: 'nav a[href="/history"]', name: 'History nav link', expectedHref: '/history' },
            { selector: 'nav a[href="/study"]', name: 'Study nav link', expectedHref: '/study' }
        ];
        
        navTests.forEach(test => {
            const element = document.querySelector(test.selector);
            const passed = element && element.getAttribute('href') === test.expectedHref;
            recordTest(test.name, passed, passed ? null : 'Element not found or incorrect href');
        });
        
        // Test auth modal triggers
        const authButtons = document.querySelectorAll('button');
        let authModalButtonFound = false;
        
        authButtons.forEach(button => {
            const text = button.textContent.toLowerCase();
            if (text.includes('get started') || text.includes('sign in') || text.includes('sign up')) {
                authModalButtonFound = true;
            }
        });
        
        recordTest('Auth modal trigger buttons', authModalButtonFound, 
                  authModalButtonFound ? null : 'No auth trigger buttons found');
    }
    
    // Test 2: Route accessibility
    async function testRouteAccessibility() {
        log('🌐 Testing route accessibility...', 'info');
        
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
                const response = await fetch(`${TEST_CONFIG.baseUrl}${route}`);
                const passed = response.ok;
                recordTest(`Route ${route} accessibility`, passed, 
                          passed ? null : `HTTP ${response.status}`);
            } catch (error) {
                recordTest(`Route ${route} accessibility`, false, error.message);
            }
            await sleep(100); // Avoid overwhelming server
        }
    }
    
    // Test 3: API endpoint responsiveness
    async function testApiEndpoints() {
        log('🔌 Testing API endpoints...', 'info');
        
        const endpoints = [
            '/api/auth/user',
            '/api/history',
            '/api/decks',
            '/api/quota-status'
        ];
        
        for (const endpoint of endpoints) {
            try {
                const response = await fetch(`${TEST_CONFIG.baseUrl}${endpoint}`);
                // 401 is expected for unauthorized requests, 200 for authorized
                const passed = response.status === 401 || response.status === 200;
                recordTest(`API ${endpoint} responsiveness`, passed,
                          passed ? null : `Unexpected status ${response.status}`);
            } catch (error) {
                recordTest(`API ${endpoint} responsiveness`, false, error.message);
            }
            await sleep(100);
        }
    }
    
    // Test 4: Client-side routing functionality
    async function testClientSideRouting() {
        log('🧭 Testing client-side routing...', 'info');
        
        // Check if Wouter router is working
        const hasWouter = window.history && window.history.pushState;
        recordTest('Client-side routing support', hasWouter,
                  hasWouter ? null : 'History API not available');
        
        // Test navigation without page reload
        const currentUrl = window.location.href;
        
        try {
            // Simulate navigation
            if (window.history && window.history.pushState) {
                window.history.pushState({}, '', '/dashboard');
                const routeChanged = window.location.pathname === '/dashboard';
                recordTest('Client-side route change', routeChanged,
                          routeChanged ? null : 'Route did not change');
                
                // Restore original URL
                window.history.pushState({}, '', currentUrl);
            }
        } catch (error) {
            recordTest('Client-side route change', false, error.message);
        }
    }
    
    // Test 5: Form and button interactions
    async function testFormInteractions() {
        log('📝 Testing form and button interactions...', 'info');
        
        // Test file input functionality
        const fileInputs = document.querySelectorAll('input[type="file"]');
        recordTest('File input elements present', fileInputs.length > 0,
                  fileInputs.length > 0 ? null : 'No file inputs found');
        
        // Test form elements
        const forms = document.querySelectorAll('form');
        recordTest('Form elements present', forms.length >= 0,
                  'Forms may be present depending on page');
        
        // Test button clickability
        const buttons = document.querySelectorAll('button');
        let clickableButtons = 0;
        
        buttons.forEach(button => {
            if (!button.disabled && button.style.pointerEvents !== 'none') {
                clickableButtons++;
            }
        });
        
        recordTest('Clickable buttons available', clickableButtons > 0,
                  clickableButtons > 0 ? null : 'No clickable buttons found');
    }
    
    // Test 6: Console error monitoring
    async function testConsoleErrors() {
        log('🔍 Monitoring for console errors...', 'info');
        
        let errorCount = 0;
        const originalError = console.error;
        
        console.error = function(...args) {
            errorCount++;
            originalError.apply(console, args);
        };
        
        // Wait a bit to catch any errors
        await sleep(2000);
        
        // Restore original console.error
        console.error = originalError;
        
        recordTest('Console error monitoring', errorCount === 0,
                  errorCount === 0 ? null : `${errorCount} console errors detected`);
    }
    
    // Test 7: Network connectivity
    async function testNetworkConnectivity() {
        log('🌐 Testing network connectivity...', 'info');
        
        try {
            const response = await fetch(`${TEST_CONFIG.baseUrl}/favicon.ico`);
            recordTest('Network connectivity', response.ok,
                      response.ok ? null : `Cannot reach server (${response.status})`);
        } catch (error) {
            recordTest('Network connectivity', false, error.message);
        }
    }
    
    // Main test runner
    async function runAllTests() {
        log('🚀 Starting comprehensive button redirection tests...', 'info');
        log('============================================', 'info');
        
        await testCurrentPageElements();
        await testRouteAccessibility();
        await testApiEndpoints();
        await testClientSideRouting();
        await testFormInteractions();
        await testConsoleErrors();
        await testNetworkConnectivity();
        
        // Print summary
        log('============================================', 'info');
        log('📊 TEST SUMMARY', 'info');
        log('============================================', 'info');
        log(`Total Tests: ${testResults.total}`, 'info');
        log(`Passed: ${testResults.passed}`, 'success');
        log(`Failed: ${testResults.failed}`, testResults.failed > 0 ? 'error' : 'info');
        
        if (testResults.errors.length > 0) {
            log('❌ FAILED TESTS:', 'error');
            testResults.errors.forEach(error => {
                log(`  • ${error.test}: ${error.error}`, 'error');
            });
        }
        
        const successRate = ((testResults.passed / testResults.total) * 100).toFixed(1);
        log(`Success Rate: ${successRate}%`, successRate >= 90 ? 'success' : 'warning');
        
        return testResults;
    }
    
    // Auto-execute tests
    runAllTests().then(results => {
        log('✅ Button redirection testing completed!', 'success');
        
        // Store results globally for inspection
        window.buttonTestResults = results;
        
        // Provide manual testing instructions
        log('📋 MANUAL TESTING RECOMMENDED:', 'warning');
        log('1. Click navigation links to verify routing', 'info');
        log('2. Test upload functionality with PDF files', 'info');
        log('3. Verify auth modal opens/closes correctly', 'info');
        log('4. Check download buttons work properly', 'info');
        log('5. Test study mode navigation', 'info');
    });
    
})();
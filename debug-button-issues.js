// Debug script to test button redirections and response handling
// Run this in the browser console to debug the specific issues

console.log('🔍 Debugging button redirection issues...');

// Test 1: Check upload response format
async function testUploadResponseFormat() {
    console.log('📤 Testing upload endpoint response format...');
    
    try {
        // Check if we can access the API structure
        const testResponse = await fetch('/api/history');
        console.log('API accessible:', testResponse.status);
        
        // Log current job data if available
        if (window.location.pathname.includes('upload')) {
            console.log('Current page: Upload page');
            
            // Check for any React state or context
            const uploadButtons = document.querySelectorAll('button');
            console.log('Upload page buttons found:', uploadButtons.length);
            
            uploadButtons.forEach((btn, index) => {
                const text = btn.textContent?.toLowerCase() || '';
                if (text.includes('study') || text.includes('generate') || text.includes('start')) {
                    console.log(`Button ${index + 1}: "${btn.textContent}" - ${btn.onclick ? 'Has onclick' : 'No onclick'}`);
                }
            });
        }
        
        return { success: true };
    } catch (error) {
        console.error('Upload test failed:', error);
        return { success: false, error: error.message };
    }
}

// Test 2: Check study page routing
async function testStudyPageRouting() {
    console.log('🎯 Testing study page routing...');
    
    try {
        // Test study routes
        const routes = ['/study', '/study/23'];
        
        for (const route of routes) {
            const response = await fetch(route);
            console.log(`Route ${route}: ${response.status}`);
        }
        
        // Check if wouter routing is working
        const hasWouter = typeof window.history?.pushState === 'function';
        console.log('Client-side routing available:', hasWouter);
        
        return { success: true };
    } catch (error) {
        console.error('Study routing test failed:', error);
        return { success: false, error: error.message };
    }
}

// Test 3: Check for JavaScript errors
function testJavaScriptErrors() {
    console.log('🐛 Monitoring for JavaScript errors...');
    
    let errorCount = 0;
    const originalError = console.error;
    const errors = [];
    
    console.error = function(...args) {
        errorCount++;
        errors.push(args.join(' '));
        originalError.apply(console, args);
    };
    
    // Wait for any pending errors
    setTimeout(() => {
        console.error = originalError;
        console.log(`JavaScript errors detected: ${errorCount}`);
        if (errors.length > 0) {
            console.log('Error details:', errors);
        }
    }, 3000);
    
    return { errorCount, errors };
}

// Test 4: Check API response structure
async function testApiResponseStructure() {
    console.log('📊 Testing API response structure...');
    
    try {
        // Test job endpoint (will get 401 but we can check structure)
        const jobResponse = await fetch('/api/jobs/23');
        const jobData = await jobResponse.text();
        
        console.log('Job API response status:', jobResponse.status);
        console.log('Job API content-type:', jobResponse.headers.get('content-type'));
        
        try {
            const parsed = JSON.parse(jobData);
            console.log('Job response structure:', Object.keys(parsed));
        } catch {
            console.log('Job response (raw):', jobData.substring(0, 200));
        }
        
        return { success: true };
    } catch (error) {
        console.error('API structure test failed:', error);
        return { success: false, error: error.message };
    }
}

// Test 5: Check button click handlers
function testButtonClickHandlers() {
    console.log('🖱️ Testing button click handlers...');
    
    const results = [];
    const buttons = document.querySelectorAll('button');
    
    buttons.forEach((button, index) => {
        const text = button.textContent?.toLowerCase() || '';
        const hasOnClick = !!button.onclick;
        const hasEventListeners = !!button.getAttribute('data-event-listeners');
        const isDisabled = button.disabled;
        
        if (text.includes('study') || text.includes('start') || text.includes('generate')) {
            results.push({
                index: index + 1,
                text: button.textContent,
                hasOnClick,
                hasEventListeners,
                isDisabled,
                parentElement: button.parentElement?.tagName
            });
        }
    });
    
    console.log('Study-related buttons:', results);
    return results;
}

// Run all tests
async function runAllDebugTests() {
    console.log('🚀 Running comprehensive debug tests...');
    console.log('=====================================');
    
    const uploadTest = await testUploadResponseFormat();
    const routingTest = await testStudyPageRouting();
    const jsErrorTest = testJavaScriptErrors();
    const apiTest = await testApiResponseStructure();
    const buttonTest = testButtonClickHandlers();
    
    console.log('=====================================');
    console.log('📋 Debug Test Summary:');
    console.log('Upload response test:', uploadTest.success ? '✅ PASS' : '❌ FAIL');
    console.log('Study routing test:', routingTest.success ? '✅ PASS' : '❌ FAIL');
    console.log('API structure test:', apiTest.success ? '✅ PASS' : '❌ FAIL');
    console.log('Button handlers found:', buttonTest.length);
    
    // Store results globally for inspection
    window.debugResults = {
        upload: uploadTest,
        routing: routingTest,
        jsErrors: jsErrorTest,
        api: apiTest,
        buttons: buttonTest
    };
    
    console.log('Results stored in window.debugResults');
    return window.debugResults;
}

// Auto-run if this script is executed
runAllDebugTests();

// Export functions for manual testing
window.debugTests = {
    testUploadResponseFormat,
    testStudyPageRouting,
    testJavaScriptErrors,
    testApiResponseStructure,
    testButtonClickHandlers,
    runAllDebugTests
};

console.log('Debug functions available at window.debugTests');
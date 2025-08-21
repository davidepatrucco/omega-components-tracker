#!/bin/bash
set -e

# Configuration
BASE_URL="http://localhost:4000"
ADMIN_USER="admin"
ADMIN_PASS="changeme"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counters
TESTS_TOTAL=0
TESTS_PASSED=0
TESTS_FAILED=0

# Utility functions
log_info() {
    echo -e "${YELLOW}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((TESTS_PASSED++))
}

log_error() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((TESTS_FAILED++))
}

run_test() {
    ((TESTS_TOTAL++))
    local test_name="$1"
    local expected_status="$2"
    local curl_command="$3"
    
    log_info "Testing: $test_name"
    
    # Execute curl command and capture response
    response=$(eval "$curl_command" 2>/dev/null)
    status_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n -1)
    
    if [ "$status_code" = "$expected_status" ]; then
        log_success "$test_name (Status: $status_code)"
        echo "   Response: $body" | head -c 100
        echo ""
    else
        log_error "$test_name (Expected: $expected_status, Got: $status_code)"
        echo "   Response: $body"
    fi
}

# Wait for server to be ready
wait_for_server() {
    log_info "Waiting for server to be ready..."
    for i in {1..30}; do
        if curl -s "$BASE_URL/health" > /dev/null; then
            log_success "Server is ready"
            return 0
        fi
        sleep 1
    done
    log_error "Server failed to start within 30 seconds"
    exit 1
}

# Setup function
setup() {
    log_info "Setting up test environment..."
    rm -f cookies.txt test-*.txt
    
    # Create admin user if not exists (ignore errors if already exists)
    curl -s -X POST "$BASE_URL/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"username\": \"$ADMIN_USER\", \"password\": \"$ADMIN_PASS\"}" \
        -c cookies.txt > /dev/null 2>&1 || true
}

# Cleanup function
cleanup() {
    log_info "Cleaning up test environment..."
    rm -f cookies.txt test-*.txt test-*.xlsx
}

# Trap cleanup on exit
trap cleanup EXIT

# Main execution
main() {
    log_info "Starting Omega Components Tracker API Tests"
    echo "============================================="
    
    wait_for_server
    setup
    
    # Run test suites
    ./test-auth.sh
    ./test-users.sh  
    ./test-commesse.sh
    ./test-components.sh
    ./test-status-changes.sh
    ./test-stats.sh
    
    # Final report
    echo ""
    echo "============================================="
    log_info "Test Execution Summary"
    echo "Total Tests: $TESTS_TOTAL"
    echo "Passed: $TESTS_PASSED"
    echo "Failed: $TESTS_FAILED"
    
    if [ $TESTS_FAILED -eq 0 ]; then
        log_success "All tests passed!"
        exit 0
    else
        log_error "$TESTS_FAILED tests failed"
        exit 1
    fi
}

# Export functions for use in other test scripts
export -f log_info log_success log_error run_test
export BASE_URL ADMIN_USER ADMIN_PASS
export TESTS_TOTAL TESTS_PASSED TESTS_FAILED

# Run main function if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
#!/bin/bash
# Validation script for Omega Components Tracker testing framework

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="http://localhost:4000"
FRONTEND_URL="http://localhost:5173"

log_info() {
    echo -e "${BLUE}[VALIDATION]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if servers are running
check_servers() {
    log_info "Checking server availability..."
    
    # Check backend
    if curl -s "$BASE_URL/health" > /dev/null; then
        log_success "Backend server is running ($BASE_URL)"
    else
        log_error "Backend server is not running ($BASE_URL)"
        log_info "Please start the backend server:"
        log_info "  cd omega-app/backend && npm run dev"
        return 1
    fi
    
    # Check frontend (optional for unit tests)
    if nc -z localhost 5173 2>/dev/null; then
        log_success "Frontend server is running ($FRONTEND_URL)"
    else
        log_warning "Frontend server is not running ($FRONTEND_URL)"
        log_info "Frontend is optional for unit tests but required for full E2E tests"
        log_info "To start frontend: cd omega-app/frontend && npm run dev"
    fi
}

# Validate test framework structure
check_test_structure() {
    log_info "Validating test framework structure..."
    
    # Check directories
    required_dirs=(
        "tests/unit"
        "tests/e2e"
        "docs"
    )
    
    for dir in "${required_dirs[@]}"; do
        if [ -d "$dir" ]; then
            log_success "Directory exists: $dir"
        else
            log_error "Missing directory: $dir"
            return 1
        fi
    done
    
    # Check unit test files
    unit_tests=(
        "tests/unit/run-tests.sh"
        "tests/unit/test-auth.sh"
        "tests/unit/test-users.sh"
        "tests/unit/test-commesse.sh"
        "tests/unit/test-components.sh"
        "tests/unit/test-status-changes.sh"
        "tests/unit/test-stats.sh"
    )
    
    for test_file in "${unit_tests[@]}"; do
        if [ -f "$test_file" ] && [ -x "$test_file" ]; then
            log_success "Unit test exists and is executable: $test_file"
        else
            log_error "Unit test missing or not executable: $test_file"
            return 1
        fi
    done
    
    # Check E2E test files
    e2e_tests=(
        "tests/e2e/run-e2e-tests.sh"
        "tests/e2e/config.env"
    )
    
    for test_file in "${e2e_tests[@]}"; do
        if [ -f "$test_file" ]; then
            log_success "E2E test file exists: $test_file"
        else
            log_error "E2E test file missing: $test_file"
            return 1
        fi
    done
    
    # Check documentation
    docs=(
        "docs/system_functionalities.md"
        "docs/test_plan.md"
        "tests/README.md"
    )
    
    for doc in "${docs[@]}"; do
        if [ -f "$doc" ]; then
            log_success "Documentation exists: $doc"
        else
            log_error "Documentation missing: $doc"
            return 1
        fi
    done
}

# Test admin authentication
test_admin_login() {
    log_info "Testing admin authentication..."
    
    ADMIN_TOKEN=$(curl -s -X POST "$BASE_URL/auth/login" \
        -H "Content-Type: application/json" \
        -d '{"username": "admin", "password": "changeme"}' | \
        grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
    
    if [ -n "$ADMIN_TOKEN" ]; then
        log_success "Admin authentication successful"
        echo "$ADMIN_TOKEN" > /tmp/validation_token.txt
        return 0
    else
        log_error "Admin authentication failed"
        log_info "Please ensure the admin user exists with username: admin, password: changeme"
        return 1
    fi
}

# Test basic API endpoints
test_basic_endpoints() {
    log_info "Testing basic API endpoints..."
    
    if [ ! -f "/tmp/validation_token.txt" ]; then
        log_error "No authentication token available"
        return 1
    fi
    
    TOKEN=$(cat /tmp/validation_token.txt)
    
    # Test endpoints
    endpoints=(
        "/api/commesse"
        "/api/components"
        "/api/stats"
        "/api/utenti"
    )
    
    for endpoint in "${endpoints[@]}"; do
        status=$(curl -s -w '%{http_code}' -o /dev/null -X GET "$BASE_URL$endpoint" \
            -H "Authorization: Bearer $TOKEN")
        
        if [ "$status" = "200" ] || [ "$status" = "403" ]; then
            log_success "Endpoint accessible: $endpoint (Status: $status)"
        else
            log_error "Endpoint failed: $endpoint (Status: $status)"
            return 1
        fi
    done
}

# Run a subset of unit tests
run_sample_tests() {
    log_info "Running sample unit tests..."
    
    cd tests/unit || return 1
    
    # Run auth tests only for validation
    if ./test-auth.sh > /tmp/validation_test_output.txt 2>&1; then
        log_success "Sample unit tests passed"
        # Show summary
        grep -E "\[PASS\]|\[FAIL\]" /tmp/validation_test_output.txt | tail -5
    else
        log_error "Sample unit tests failed"
        log_info "Full output in /tmp/validation_test_output.txt"
        tail -10 /tmp/validation_test_output.txt
        return 1
    fi
    
    cd - > /dev/null
}

# Validate documentation completeness
check_documentation() {
    log_info "Validating documentation completeness..."
    
    # Check system functionalities doc
    if grep -q "Sistema Omega Components Tracker" docs/system_functionalities.md; then
        log_success "System functionalities documentation looks complete"
    else
        log_error "System functionalities documentation appears incomplete"
        return 1
    fi
    
    # Check test plan doc
    if grep -q "Piano di Test" docs/test_plan.md; then
        log_success "Test plan documentation looks complete"
    else
        log_error "Test plan documentation appears incomplete"
        return 1
    fi
    
    # Check file sizes (basic completeness check)
    system_doc_size=$(wc -c < docs/system_functionalities.md)
    test_doc_size=$(wc -c < docs/test_plan.md)
    
    if [ "$system_doc_size" -gt 15000 ]; then
        log_success "System documentation is substantial ($system_doc_size bytes)"
    else
        log_warning "System documentation seems short ($system_doc_size bytes)"
    fi
    
    if [ "$test_doc_size" -gt 20000 ]; then
        log_success "Test plan documentation is substantial ($test_doc_size bytes)"
    else
        log_warning "Test plan documentation seems short ($test_doc_size bytes)"
    fi
}

# Cleanup function
cleanup() {
    rm -f /tmp/validation_token.txt /tmp/validation_test_output.txt
}

# Main validation function
main() {
    log_info "Starting Omega Components Tracker validation..."
    echo "================================================="
    
    local validation_failed=0
    
    # Run validation checks
    check_servers || ((validation_failed++))
    echo ""
    
    check_test_structure || ((validation_failed++))
    echo ""
    
    test_admin_login || ((validation_failed++))
    echo ""
    
    test_basic_endpoints || ((validation_failed++))
    echo ""
    
    run_sample_tests || ((validation_failed++))
    echo ""
    
    check_documentation || ((validation_failed++))
    echo ""
    
    # Final report
    echo "================================================="
    log_info "Validation Summary"
    
    if [ $validation_failed -eq 0 ]; then
        log_success "All validation checks passed!"
        echo ""
        log_info "You can now run the full test suite:"
        log_info "  Unit tests: cd tests/unit && ./run-tests.sh"
        log_info "  E2E tests:  cd tests/e2e && ./run-e2e-tests.sh"
        echo ""
        log_info "Documentation available:"
        log_info "  System overview: docs/system_functionalities.md"
        log_info "  Test plan: docs/test_plan.md"
        log_info "  Test guide: tests/README.md"
        
        cleanup
        exit 0
    else
        log_error "$validation_failed validation checks failed"
        log_info "Please address the issues above before running tests"
        
        cleanup
        exit 1
    fi
}

# Trap cleanup on exit
trap cleanup EXIT

# Run main function
main "$@"
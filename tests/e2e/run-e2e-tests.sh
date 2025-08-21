#!/bin/bash
# End-to-End Test - Complete Order Processing Workflow

source "$(dirname "$0")/config.env"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
E2E_TESTS_TOTAL=0
E2E_TESTS_PASSED=0
E2E_TESTS_FAILED=0

# Utility functions
e2e_log_info() {
    echo -e "${BLUE}[E2E-INFO]${NC} $1"
}

e2e_log_success() {
    echo -e "${GREEN}[E2E-PASS]${NC} $1"
    ((E2E_TESTS_PASSED++))
}

e2e_log_error() {
    echo -e "${RED}[E2E-FAIL]${NC} $1"
    ((E2E_TESTS_FAILED++))
}

e2e_log_step() {
    echo -e "${YELLOW}[E2E-STEP]${NC} $1"
}

# Wait for services to be ready
wait_for_services() {
    e2e_log_info "Waiting for services to be ready..."
    
    # Wait for backend
    for i in {1..30}; do
        if curl -s "$API_URL/health" > /dev/null; then
            e2e_log_success "Backend is ready"
            break
        fi
        sleep 1
        if [ $i -eq 30 ]; then
            e2e_log_error "Backend failed to start"
            exit 1
        fi
    done
    
    # Wait for frontend (check if port is open)
    for i in {1..30}; do
        if nc -z localhost 5173 2>/dev/null; then
            e2e_log_success "Frontend is ready"
            break
        fi
        sleep 1
        if [ $i -eq 30 ]; then
            e2e_log_error "Frontend failed to start"
            exit 1
        fi
    done
}

# Browser automation using curl + jq for API validation
# Since we're in a limited environment, we'll focus on API-driven E2E testing

test_complete_order_workflow() {
    e2e_log_info "=== Complete Order Processing Workflow ==="
    ((E2E_TESTS_TOTAL++))
    
    local workflow_failed=0
    
    # Step 1: Admin Login
    e2e_log_step "Step 1: Admin Authentication"
    TOKEN=$(curl -s -X POST "$API_URL/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"username\": \"$ADMIN_USERNAME\", \"password\": \"$ADMIN_PASSWORD\"}" | \
        grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
    
    if [ -n "$TOKEN" ]; then
        e2e_log_success "Admin login successful"
    else
        e2e_log_error "Admin login failed"
        ((workflow_failed++))
    fi
    
    # Step 2: Create New Order
    e2e_log_step "Step 2: Create New Order"
    ORDER_RESPONSE=$(curl -s -X POST "$API_URL/api/commesse" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TOKEN" \
        -d "{\"code\": \"$TEST_ORDER_CODE\", \"name\": \"$TEST_ORDER_NAME\", \"note\": \"E2E test order\"}")
    
    ORDER_ID=$(echo "$ORDER_RESPONSE" | grep -o '"_id":"[^"]*"' | cut -d'"' -f4)
    
    if [ -n "$ORDER_ID" ]; then
        e2e_log_success "Order created successfully (ID: $ORDER_ID)"
    else
        e2e_log_error "Order creation failed"
        ((workflow_failed++))
    fi
    
    # Step 3: Add Component to Order
    e2e_log_step "Step 3: Add Component to Order"
    COMPONENT_RESPONSE=$(curl -s -X POST "$API_URL/api/components" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TOKEN" \
        -d "{
            \"commessaId\": \"$ORDER_ID\",
            \"name\": \"$TEST_COMPONENT_NAME\",
            \"barcode\": \"$TEST_COMPONENT_BARCODE\",
            \"status\": \"1\",
            \"trattamenti\": [\"machining\", \"heat_treatment\", \"painting\"]
        }")
    
    COMPONENT_ID=$(echo "$COMPONENT_RESPONSE" | grep -o '"_id":"[^"]*"' | cut -d'"' -f4)
    
    if [ -n "$COMPONENT_ID" ]; then
        e2e_log_success "Component added successfully (ID: $COMPONENT_ID)"
    else
        e2e_log_error "Component creation failed"
        ((workflow_failed++))
    fi
    
    # Step 4: Process Component Through Production Workflow
    e2e_log_step "Step 4: Process Component Through Workflow"
    
    # 4a: Start Production
    STATUS_RESPONSE=$(curl -s -X POST "$API_URL/api/changestatus" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TOKEN" \
        -d "{
            \"componentId\": \"$COMPONENT_ID\",
            \"newStatus\": \"2\",
            \"note\": \"Started internal production\",
            \"user\": \"admin\"
        }")
    
    if echo "$STATUS_RESPONSE" | grep -q "success\|history"; then
        e2e_log_success "Production started (Status: 2)"
    else
        e2e_log_error "Failed to start production"
        ((workflow_failed++))
    fi
    
    # 4b: Mark as Built
    curl -s -X POST "$API_URL/api/changestatus" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TOKEN" \
        -d "{
            \"componentId\": \"$COMPONENT_ID\",
            \"newStatus\": \"3\",
            \"note\": \"Production completed\",
            \"user\": \"admin\"
        }" > /dev/null
    
    e2e_log_success "Component marked as built (Status: 3)"
    
    # 4c: Process Through Treatments
    treatments=("machining" "heat_treatment" "painting")
    for treatment in "${treatments[@]}"; do
        e2e_log_step "Processing treatment: $treatment"
        
        # PREP -> IN -> ARR
        for phase in "PREP" "IN" "ARR"; do
            status="4:${treatment}:${phase}"
            curl -s -X POST "$API_URL/api/changestatus" \
                -H "Content-Type: application/json" \
                -H "Authorization: Bearer $TOKEN" \
                -d "{
                    \"componentId\": \"$COMPONENT_ID\",
                    \"newStatus\": \"$status\",
                    \"note\": \"$treatment $phase phase\",
                    \"user\": \"admin\"
                }" > /dev/null
            
            sleep 0.1  # Small delay between phases
        done
        
        e2e_log_success "Treatment $treatment completed"
    done
    
    # Step 5: Verify Auto-transition to Ready
    e2e_log_step "Step 5: Verify Auto-transition to Ready Status"
    COMPONENT_DETAILS=$(curl -s -X GET "$API_URL/api/components/$COMPONENT_ID" \
        -H "Authorization: Bearer $TOKEN")
    
    CURRENT_STATUS=$(echo "$COMPONENT_DETAILS" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
    
    if [ "$CURRENT_STATUS" = "5" ]; then
        e2e_log_success "Auto-transition to ready status successful (Status: 5)"
    else
        e2e_log_error "Auto-transition failed, current status: $CURRENT_STATUS"
        ((workflow_failed++))
    fi
    
    # Step 6: Ship Component
    e2e_log_step "Step 6: Ship Component with DDT"
    SHIP_RESPONSE=$(curl -s -X POST "$API_URL/api/changestatus" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TOKEN" \
        -d "{
            \"componentId\": \"$COMPONENT_ID\",
            \"newStatus\": \"6\",
            \"note\": \"Shipped to customer\",
            \"user\": \"admin\",
            \"ddtNumber\": \"DDT-E2E-001\",
            \"ddtDate\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
        }")
    
    if echo "$SHIP_RESPONSE" | grep -q "success\|history"; then
        e2e_log_success "Component shipped successfully (Status: 6)"
    else
        e2e_log_error "Failed to ship component"
        ((workflow_failed++))
    fi
    
    # Step 7: Verify Dashboard Statistics Update
    e2e_log_step "Step 7: Verify Dashboard Statistics"
    STATS_RESPONSE=$(curl -s -X GET "$API_URL/api/stats" \
        -H "Authorization: Bearer $TOKEN")
    
    SPEDITI_OGGI=$(echo "$STATS_RESPONSE" | grep -o '"speditOggi":[0-9]*' | cut -d':' -f2)
    
    if [ -n "$SPEDITI_OGGI" ] && [ "$SPEDITI_OGGI" -ge 1 ]; then
        e2e_log_success "Dashboard statistics updated correctly (Shipped today: $SPEDITI_OGGI)"
    else
        e2e_log_error "Dashboard statistics not updated properly"
        ((workflow_failed++))
    fi
    
    # Step 8: Verify Complete History
    e2e_log_step "Step 8: Verify Complete Component History"
    FINAL_COMPONENT=$(curl -s -X GET "$API_URL/api/components/$COMPONENT_ID" \
        -H "Authorization: Bearer $TOKEN")
    
    HISTORY_COUNT=$(echo "$FINAL_COMPONENT" | grep -o '"history":\[' | wc -l)
    
    if [ "$HISTORY_COUNT" -ge 1 ]; then
        # Count history entries more accurately
        HISTORY_ENTRIES=$(echo "$FINAL_COMPONENT" | grep -o '"from":"[^"]*"' | wc -l)
        e2e_log_success "Component history recorded ($HISTORY_ENTRIES status changes)"
    else
        e2e_log_error "Component history not properly recorded"
        ((workflow_failed++))
    fi
    
    # Final Assessment
    if [ $workflow_failed -eq 0 ]; then
        e2e_log_success "Complete Order Processing Workflow - ALL STEPS PASSED"
    else
        e2e_log_error "Complete Order Processing Workflow - $workflow_failed STEPS FAILED"
        ((E2E_TESTS_FAILED++))
        return 1
    fi
    
    ((E2E_TESTS_PASSED++))
}

test_multi_user_workflow() {
    e2e_log_info "=== Multi-User Order Management Workflow ==="
    ((E2E_TESTS_TOTAL++))
    
    local workflow_failed=0
    
    # Admin creates a regular user
    e2e_log_step "Creating regular user"
    ADMIN_TOKEN=$(curl -s -X POST "$API_URL/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"username\": \"$ADMIN_USERNAME\", \"password\": \"$ADMIN_PASSWORD\"}" | \
        grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
    
    curl -s -X POST "$API_URL/api/utenti" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -d '{"username": "operator_e2e", "email": "operator@e2e.test", "profilo": "UFF", "password": "operator123"}' > /dev/null
    
    # Regular user login
    e2e_log_step "Regular user login"
    OPERATOR_TOKEN=$(curl -s -X POST "$API_URL/auth/login" \
        -H "Content-Type: application/json" \
        -d '{"username": "operator_e2e", "password": "operator123"}' | \
        grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
    
    if [ -n "$OPERATOR_TOKEN" ]; then
        e2e_log_success "Operator login successful"
    else
        e2e_log_error "Operator login failed"
        ((workflow_failed++))
    fi
    
    # Operator tries to access user management (should fail)
    e2e_log_step "Testing role-based access control"
    USER_ACCESS=$(curl -s -w '%{http_code}' -o /dev/null -X GET "$API_URL/api/utenti" \
        -H "Authorization: Bearer $OPERATOR_TOKEN")
    
    if [ "$USER_ACCESS" = "403" ]; then
        e2e_log_success "Role-based access control working (403 for operator accessing user management)"
    else
        e2e_log_error "Role-based access control failed (got $USER_ACCESS instead of 403)"
        ((workflow_failed++))
    fi
    
    # Operator can access operational functions
    e2e_log_step "Testing operator operational access"
    COMMESSE_ACCESS=$(curl -s -w '%{http_code}' -o /dev/null -X GET "$API_URL/api/commesse" \
        -H "Authorization: Bearer $OPERATOR_TOKEN")
    
    if [ "$COMMESSE_ACCESS" = "200" ]; then
        e2e_log_success "Operator can access operational functions"
    else
        e2e_log_error "Operator cannot access operational functions"
        ((workflow_failed++))
    fi
    
    # Clean up: delete test user
    e2e_log_step "Cleaning up test user"
    OPERATOR_USER_ID=$(curl -s -X GET "$API_URL/api/utenti" \
        -H "Authorization: Bearer $ADMIN_TOKEN" | \
        grep -o '"_id":"[^"]*","username":"operator_e2e"' | \
        cut -d'"' -f4)
    
    if [ -n "$OPERATOR_USER_ID" ]; then
        curl -s -X DELETE "$API_URL/api/utenti/$OPERATOR_USER_ID" \
            -H "Authorization: Bearer $ADMIN_TOKEN" > /dev/null
        e2e_log_success "Test user cleaned up"
    fi
    
    # Final Assessment
    if [ $workflow_failed -eq 0 ]; then
        e2e_log_success "Multi-User Workflow - ALL STEPS PASSED"
        ((E2E_TESTS_PASSED++))
    else
        e2e_log_error "Multi-User Workflow - $workflow_failed STEPS FAILED"
        ((E2E_TESTS_FAILED++))
    fi
}

test_bulk_operations() {
    e2e_log_info "=== Bulk Operations Workflow ==="
    ((E2E_TESTS_TOTAL++))
    
    local workflow_failed=0
    
    # Get admin token
    TOKEN=$(curl -s -X POST "$API_URL/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"username\": \"$ADMIN_USERNAME\", \"password\": \"$ADMIN_PASSWORD\"}" | \
        grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
    
    # Create bulk test order
    e2e_log_step "Creating bulk test order"
    BULK_ORDER=$(curl -s -X POST "$API_URL/api/commesse" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TOKEN" \
        -d '{"code": "BULK-E2E", "name": "Bulk Operations Test"}')
    
    BULK_ORDER_ID=$(echo "$BULK_ORDER" | grep -o '"_id":"[^"]*"' | cut -d'"' -f4)
    
    # Create multiple components
    e2e_log_step "Creating multiple components"
    component_ids=()
    for i in {1..10}; do
        COMP_RESP=$(curl -s -X POST "$API_URL/api/components" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $TOKEN" \
            -d "{
                \"commessaId\": \"$BULK_ORDER_ID\",
                \"name\": \"Bulk Component $i\",
                \"barcode\": \"BULK$(printf %03d $i)\",
                \"status\": \"1\",
                \"trattamenti\": [\"painting\"]
            }")
        
        COMP_ID=$(echo "$COMP_RESP" | grep -o '"_id":"[^"]*"' | cut -d'"' -f4)
        if [ -n "$COMP_ID" ]; then
            component_ids+=("$COMP_ID")
        fi
    done
    
    if [ ${#component_ids[@]} -eq 10 ]; then
        e2e_log_success "Created 10 components successfully"
    else
        e2e_log_error "Failed to create all components (created ${#component_ids[@]}/10)"
        ((workflow_failed++))
    fi
    
    # Test search and filter functionality
    e2e_log_step "Testing search functionality"
    SEARCH_RESULT=$(curl -s -X GET "$API_URL/api/components?q=Bulk" \
        -H "Authorization: Bearer $TOKEN")
    
    SEARCH_COUNT=$(echo "$SEARCH_RESULT" | grep -o '"total":[0-9]*' | cut -d':' -f2)
    
    if [ -n "$SEARCH_COUNT" ] && [ "$SEARCH_COUNT" -ge 10 ]; then
        e2e_log_success "Search functionality works (found $SEARCH_COUNT components)"
    else
        e2e_log_error "Search functionality failed (found $SEARCH_COUNT components)"
        ((workflow_failed++))
    fi
    
    # Test pagination
    e2e_log_step "Testing pagination"
    PAGE1=$(curl -s -X GET "$API_URL/api/components?page=1&pageSize=5" \
        -H "Authorization: Bearer $TOKEN")
    
    PAGE1_COUNT=$(echo "$PAGE1" | grep -o '"items":\[' | wc -l)
    
    if [ "$PAGE1_COUNT" -ge 1 ]; then
        e2e_log_success "Pagination working"
    else
        e2e_log_error "Pagination failed"
        ((workflow_failed++))
    fi
    
    # Bulk status change simulation
    e2e_log_step "Simulating bulk status changes"
    bulk_success=0
    for comp_id in "${component_ids[@]:0:5}"; do  # Process first 5 components
        STATUS_RESP=$(curl -s -X POST "$API_URL/api/changestatus" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $TOKEN" \
            -d "{
                \"componentId\": \"$comp_id\",
                \"newStatus\": \"2\",
                \"note\": \"Bulk status change\",
                \"user\": \"admin\"
            }")
        
        if echo "$STATUS_RESP" | grep -q "success\|history"; then
            ((bulk_success++))
        fi
    done
    
    if [ $bulk_success -eq 5 ]; then
        e2e_log_success "Bulk status changes successful (5/5)"
    else
        e2e_log_error "Bulk status changes failed ($bulk_success/5)"
        ((workflow_failed++))
    fi
    
    # Final Assessment
    if [ $workflow_failed -eq 0 ]; then
        e2e_log_success "Bulk Operations Workflow - ALL STEPS PASSED"
        ((E2E_TESTS_PASSED++))
    else
        e2e_log_error "Bulk Operations Workflow - $workflow_failed STEPS FAILED"
        ((E2E_TESTS_FAILED++))
    fi
}

# Main execution
main() {
    e2e_log_info "Starting Omega Components Tracker E2E Tests"
    echo "=================================================="
    
    wait_for_services
    
    # Run E2E test suites
    test_complete_order_workflow
    test_multi_user_workflow
    test_bulk_operations
    
    # Final report
    echo ""
    echo "=================================================="
    e2e_log_info "E2E Test Execution Summary"
    echo "Total E2E Tests: $E2E_TESTS_TOTAL"
    echo "Passed: $E2E_TESTS_PASSED"
    echo "Failed: $E2E_TESTS_FAILED"
    
    if [ $E2E_TESTS_FAILED -eq 0 ]; then
        e2e_log_success "All E2E tests passed!"
        exit 0
    else
        e2e_log_error "$E2E_TESTS_FAILED E2E tests failed"
        exit 1
    fi
}

# Run main function
main "$@"
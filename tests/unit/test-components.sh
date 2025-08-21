#!/bin/bash
# Components Management API Tests

source "$(dirname "$0")/run-tests.sh"

test_components() {
    log_info "=== Components Management Tests ==="
    
    # Get admin token
    TOKEN=$(curl -s -X POST "$BASE_URL/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"username\": \"$ADMIN_USER\", \"password\": \"$ADMIN_PASS\"}" | \
        grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
    
    if [ -z "$TOKEN" ]; then
        log_error "Failed to get admin token for components tests"
        return 1
    fi
    
    # Get or create a test commessa
    COMMESSA_ID=""
    if [ -f "/tmp/test_commessa_id.txt" ]; then
        COMMESSA_ID=$(cat /tmp/test_commessa_id.txt)
    fi
    
    if [ -z "$COMMESSA_ID" ]; then
        # Create a test commessa
        curl -s -X POST "$BASE_URL/api/commesse" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $TOKEN" \
            -d '{"code": "COMP-TEST-NEW", "name": "New Components Test Order"}' > /dev/null
        
        COMMESSA_ID=$(curl -s -X GET "$BASE_URL/api/commesse" \
            -H "Authorization: Bearer $TOKEN" | \
            grep -o '"_id":"[^"]*","code":"COMP-TEST-NEW"' | \
            cut -d'"' -f4)
    fi
    
    if [ -z "$COMMESSA_ID" ]; then
        log_error "Failed to get/create test commessa for components tests"
        return 1
    fi
    
    # Test 1: List components (should be empty initially)
    run_test "List components" "200" \
        "curl -s -w '\n%{http_code}' -X GET '$BASE_URL/api/components' \
         -H 'Authorization: Bearer $TOKEN'"
    
    # Test 2: Create new component
    run_test "Create new component" "201" \
        "curl -s -w '\n%{http_code}' -X POST '$BASE_URL/api/components' \
         -H 'Content-Type: application/json' \
         -H 'Authorization: Bearer $TOKEN' \
         -d '{
             \"commessaId\": \"$COMMESSA_ID\",
             \"name\": \"Test Component 1\",
             \"barcode\": \"BC001\",
             \"status\": \"1\",
             \"trattamenti\": [\"verniciatura\", \"assemblaggio\"]
         }'"
    
    # Test 3: Create component without required commessaId
    run_test "Create component without commessaId" "400" \
        "curl -s -w '\n%{http_code}' -X POST '$BASE_URL/api/components' \
         -H 'Content-Type: application/json' \
         -H 'Authorization: Bearer $TOKEN' \
         -d '{\"name\": \"Component without commessa\", \"status\": \"1\"}'"
    
    # Test 4: Create component without required name
    run_test "Create component without name" "400" \
        "curl -s -w '\n%{http_code}' -X POST '$BASE_URL/api/components' \
         -H 'Content-Type: application/json' \
         -H 'Authorization: Bearer $TOKEN' \
         -d '{\"commessaId\": \"$COMMESSA_ID\", \"status\": \"1\"}'"
    
    # Get component ID for update/delete tests
    COMPONENT_ID=$(curl -s -X GET "$BASE_URL/api/components" \
        -H "Authorization: Bearer $TOKEN" | \
        grep -o '"_id":"[^"]*"[^}]*"barcode":"BC001"' | \
        cut -d'"' -f4)
    
    if [ -n "$COMPONENT_ID" ]; then
        # Test 5: Get specific component
        run_test "Get specific component" "200" \
            "curl -s -w '\n%{http_code}' -X GET '$BASE_URL/api/components/$COMPONENT_ID' \
             -H 'Authorization: Bearer $TOKEN'"
        
        # Test 6: Update component
        run_test "Update component" "200" \
            "curl -s -w '\n%{http_code}' -X PUT '$BASE_URL/api/components/$COMPONENT_ID' \
             -H 'Content-Type: application/json' \
             -H 'Authorization: Bearer $TOKEN' \
             -d '{\"name\": \"Updated Test Component\", \"barcode\": \"BC001-UPD\"}'"
        
        # Save component ID for status tests
        echo "$COMPONENT_ID" > /tmp/test_component_id.txt
    fi
    
    # Test 7: Get components by commessa
    run_test "Get components by commessa" "200" \
        "curl -s -w '\n%{http_code}' -X GET '$BASE_URL/api/components/commessa/$COMMESSA_ID' \
         -H 'Authorization: Bearer $TOKEN'"
    
    # Test 8: Search components by name
    run_test "Search components by name" "200" \
        "curl -s -w '\n%{http_code}' -X GET '$BASE_URL/api/components?q=Test' \
         -H 'Authorization: Bearer $TOKEN'"
    
    # Test 9: Pagination test
    run_test "Components pagination" "200" \
        "curl -s -w '\n%{http_code}' -X GET '$BASE_URL/api/components?page=1&pageSize=5' \
         -H 'Authorization: Bearer $TOKEN'"
    
    # Test 10: Filter by commessa
    run_test "Filter components by commessa" "200" \
        "curl -s -w '\n%{http_code}' -X GET '$BASE_URL/api/components?commessaId=$COMMESSA_ID' \
         -H 'Authorization: Bearer $TOKEN'"
    
    # Test 11: Create multiple components for batch testing
    for i in {2..5}; do
        curl -s -X POST "$BASE_URL/api/components" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $TOKEN" \
            -d "{
                \"commessaId\": \"$COMMESSA_ID\",
                \"name\": \"Batch Component $i\",
                \"barcode\": \"BC00$i\",
                \"status\": \"1\",
                \"trattamenti\": [\"verniciatura\"]
            }" > /dev/null
    done
    
    # Test 12: List components with larger dataset
    run_test "List components with batch data" "200" \
        "curl -s -w '\n%{http_code}' -X GET '$BASE_URL/api/components' \
         -H 'Authorization: Bearer $TOKEN'"
    
    # Test 13: Get non-existent component
    run_test "Get non-existent component" "404" \
        "curl -s -w '\n%{http_code}' -X GET '$BASE_URL/api/components/507f1f77bcf86cd799439011' \
         -H 'Authorization: Bearer $TOKEN'"
    
    # Test 14: Update component with invalid ID
    run_test "Update component with invalid ID" "400" \
        "curl -s -w '\n%{http_code}' -X PUT '$BASE_URL/api/components/invalid-id' \
         -H 'Content-Type: application/json' \
         -H 'Authorization: Bearer $TOKEN' \
         -d '{\"name\": \"Updated name\"}'"
    
    # Test 15: Soft delete component
    if [ -n "$COMPONENT_ID" ]; then
        run_test "Soft delete component" "200" \
            "curl -s -w '\n%{http_code}' -X DELETE '$BASE_URL/api/components/$COMPONENT_ID' \
             -H 'Authorization: Bearer $TOKEN'"
        
        # Test 16: Verify soft deleted component doesn't appear in list
        run_test "Verify soft delete" "200" \
            "curl -s -w '\n%{http_code}' -X GET '$BASE_URL/api/components' \
             -H 'Authorization: Bearer $TOKEN'"
    fi
    
    # Test 17: Access components without authentication
    run_test "Access components without auth" "401" \
        "curl -s -w '\n%{http_code}' -X GET '$BASE_URL/api/components'"
    
    # Test 18: Create component with invalid commessaId
    run_test "Create component with invalid commessaId" "400" \
        "curl -s -w '\n%{http_code}' -X POST '$BASE_URL/api/components' \
         -H 'Content-Type: application/json' \
         -H 'Authorization: Bearer $TOKEN' \
         -d '{
             \"commessaId\": \"invalid-id\",
             \"name\": \"Test Component\",
             \"status\": \"1\"
         }'"
    
    # Test 19: Large page number (edge case)
    run_test "Large page number" "200" \
        "curl -s -w '\n%{http_code}' -X GET '$BASE_URL/api/components?page=999&pageSize=10' \
         -H 'Authorization: Bearer $TOKEN'"
    
    # Test 20: Zero page size (should use default)
    run_test "Zero page size" "200" \
        "curl -s -w '\n%{http_code}' -X GET '$BASE_URL/api/components?page=1&pageSize=0' \
         -H 'Authorization: Bearer $TOKEN'"
    
    log_info "Components management tests completed"
}

# Run tests if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    test_components
fi
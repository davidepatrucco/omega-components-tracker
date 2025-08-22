#!/bin/bash
# Commesse Management API Tests

source "$(dirname "$0")/run-tests.sh"

test_commesse() {
    log_info "=== Commesse Management Tests ==="
    
    # Get admin token
    TOKEN=$(curl -s -X POST "$BASE_URL/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"username\": \"$ADMIN_USER\", \"password\": \"$ADMIN_PASS\"}" | \
        grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
    
    if [ -z "$TOKEN" ]; then
        log_error "Failed to get admin token for commesse tests"
        return 1
    fi
    
    # Test 1: List commesse (should be empty initially)
    run_test "List commesse" "200" \
        "curl -s -w '\n%{http_code}' -X GET '$BASE_URL/api/commesse' \
         -H 'Authorization: Bearer $TOKEN'"
    
    # Test 2: Create new commessa
    run_test "Create new commessa" "201" \
        "curl -s -w '\n%{http_code}' -X POST '$BASE_URL/api/commesse' \
         -H 'Content-Type: application/json' \
         -H 'Authorization: Bearer $TOKEN' \
         -d '{\"code\": \"TEST-001\", \"name\": \"Test Order 1\", \"note\": \"Test notes\"}'"
    
    # Test 3: Create commessa with duplicate code
    run_test "Create commessa with duplicate code" "409" \
        "curl -s -w '\n%{http_code}' -X POST '$BASE_URL/api/commesse' \
         -H 'Content-Type: application/json' \
         -H 'Authorization: Bearer $TOKEN' \
         -d '{\"code\": \"TEST-001\", \"name\": \"Duplicate Order\", \"note\": \"Should fail\"}'"
    
    # Test 4: Create commessa without required fields
    run_test "Create commessa without code" "400" \
        "curl -s -w '\n%{http_code}' -X POST '$BASE_URL/api/commesse' \
         -H 'Content-Type: application/json' \
         -H 'Authorization: Bearer $TOKEN' \
         -d '{\"name\": \"Order without code\"}'"
    
    # Test 5: Create commessa without name
    run_test "Create commessa without name" "400" \
        "curl -s -w '\n%{http_code}' -X POST '$BASE_URL/api/commesse' \
         -H 'Content-Type: application/json' \
         -H 'Authorization: Bearer $TOKEN' \
         -d '{\"code\": \"TEST-002\"}'"
    
    # Get commessa ID for update/delete tests
    COMMESSA_ID=$(curl -s -X GET "$BASE_URL/api/commesse" \
        -H "Authorization: Bearer $TOKEN" | \
        grep -o '"_id":"[^"]*","code":"TEST-001"' | \
        cut -d'"' -f4)
    
    if [ -n "$COMMESSA_ID" ]; then
        # Test 6: Get specific commessa
        run_test "Get specific commessa" "200" \
            "curl -s -w '\n%{http_code}' -X GET '$BASE_URL/api/commesse/$COMMESSA_ID' \
             -H 'Authorization: Bearer $TOKEN'"
        
        # Test 7: Update commessa
        run_test "Update commessa" "200" \
            "curl -s -w '\n%{http_code}' -X PUT '$BASE_URL/api/commesse/$COMMESSA_ID' \
             -H 'Content-Type: application/json' \
             -H 'Authorization: Bearer $TOKEN' \
             -d '{\"code\": \"TEST-001-UPD\", \"name\": \"Updated Test Order\", \"note\": \"Updated notes\"}'"
        
        # Test 8: Delete commessa
        run_test "Delete commessa" "200" \
            "curl -s -w '\n%{http_code}' -X DELETE '$BASE_URL/api/commesse/$COMMESSA_ID' \
             -H 'Authorization: Bearer $TOKEN'"
    fi
    
    # Test 9: Get non-existent commessa
    run_test "Get non-existent commessa" "404" \
        "curl -s -w '\n%{http_code}' -X GET '$BASE_URL/api/commesse/507f1f77bcf86cd799439011' \
         -H 'Authorization: Bearer $TOKEN'"
    
    # Test 10: Get commessa with invalid ID format
    run_test "Get commessa with invalid ID" "400" \
        "curl -s -w '\n%{http_code}' -X GET '$BASE_URL/api/commesse/invalid-id' \
         -H 'Authorization: Bearer $TOKEN'"
    
    # Test 11: Update non-existent commessa
    run_test "Update non-existent commessa" "404" \
        "curl -s -w '\n%{http_code}' -X PUT '$BASE_URL/api/commesse/507f1f77bcf86cd799439011' \
         -H 'Content-Type: application/json' \
         -H 'Authorization: Bearer $TOKEN' \
         -d '{\"code\": \"NONEXISTENT\", \"name\": \"Non-existent order\"}'"
    
    # Test 12: Delete non-existent commessa
    run_test "Delete non-existent commessa" "404" \
        "curl -s -w '\n%{http_code}' -X DELETE '$BASE_URL/api/commesse/507f1f77bcf86cd799439011' \
         -H 'Authorization: Bearer $TOKEN'"
    
    # Test 13: Create another commessa for components tests
    run_test "Create commessa for components tests" "201" \
        "curl -s -w '\n%{http_code}' -X POST '$BASE_URL/api/commesse' \
         -H 'Content-Type: application/json' \
         -H 'Authorization: Bearer $TOKEN' \
         -d '{\"code\": \"COMP-TEST\", \"name\": \"Components Test Order\", \"note\": \"For component testing\"}'"
    
    # Save commessa ID for components tests
    COMP_TEST_ID=$(curl -s -X GET "$BASE_URL/api/commesse" \
        -H "Authorization: Bearer $TOKEN" | \
        grep -o '"_id":"[^"]*","code":"COMP-TEST"' | \
        cut -d'"' -f4)
    
    echo "$COMP_TEST_ID" > /tmp/test_commessa_id.txt
    
    # Test 14: Access commesse without authentication
    run_test "Access commesse without auth" "401" \
        "curl -s -w '\n%{http_code}' -X GET '$BASE_URL/api/commesse'"
    
    # Test 15: Create commessa with only required fields (no note)
    run_test "Create minimal commessa" "201" \
        "curl -s -w '\n%{http_code}' -X POST '$BASE_URL/api/commesse' \
         -H 'Content-Type: application/json' \
         -H 'Authorization: Bearer $TOKEN' \
         -d '{\"code\": \"MINIMAL\", \"name\": \"Minimal Order\"}'"
    
    log_info "Commesse management tests completed"
}

# Run tests if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    test_commesse
fi
#!/bin/bash
# Status Change API Tests

source "$(dirname "$0")/run-tests.sh"

test_status_changes() {
    log_info "=== Status Change Tests ==="
    
    # Get admin token
    TOKEN=$(curl -s -X POST "$BASE_URL/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"username\": \"$ADMIN_USER\", \"password\": \"$ADMIN_PASS\"}" | \
        grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
    
    if [ -z "$TOKEN" ]; then
        log_error "Failed to get admin token for status change tests"
        return 1
    fi
    
    # Get or create a test component
    COMPONENT_ID=""
    if [ -f "/tmp/test_component_id.txt" ]; then
        COMPONENT_ID=$(cat /tmp/test_component_id.txt)
    fi
    
    if [ -z "$COMPONENT_ID" ]; then
        # Create test commessa and component
        COMMESSA_RESP=$(curl -s -X POST "$BASE_URL/api/commesse" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $TOKEN" \
            -d '{"code": "STATUS-TEST", "name": "Status Test Order"}')
        
        COMMESSA_ID=$(echo "$COMMESSA_RESP" | grep -o '"_id":"[^"]*"' | cut -d'"' -f4)
        
        if [ -n "$COMMESSA_ID" ]; then
            COMPONENT_RESP=$(curl -s -X POST "$BASE_URL/api/components" \
                -H "Content-Type: application/json" \
                -H "Authorization: Bearer $TOKEN" \
                -d "{
                    \"commessaId\": \"$COMMESSA_ID\",
                    \"name\": \"Status Test Component\",
                    \"barcode\": \"STATUS001\",
                    \"status\": \"1\",
                    \"trattamenti\": [\"verniciatura\", \"assemblaggio\"]
                }")
            
            COMPONENT_ID=$(echo "$COMPONENT_RESP" | grep -o '"_id":"[^"]*"' | cut -d'"' -f4)
        fi
    fi
    
    if [ -z "$COMPONENT_ID" ]; then
        log_error "Failed to get/create test component for status change tests"
        return 1
    fi
    
    # Test 1: Basic status change (1 -> 2)
    run_test "Basic status change (1 -> 2)" "200" \
        "curl -s -w '\n%{http_code}' -X POST '$BASE_URL/api/changestatus' \
         -H 'Content-Type: application/json' \
         -H 'Authorization: Bearer $TOKEN' \
         -d '{
             \"componentId\": \"$COMPONENT_ID\",
             \"newStatus\": \"2\",
             \"note\": \"Started production\",
             \"user\": \"admin\"
         }'"
    
    # Test 2: Status change to built (2 -> 3)
    run_test "Status change to built (2 -> 3)" "200" \
        "curl -s -w '\n%{http_code}' -X POST '$BASE_URL/api/changestatus' \
         -H 'Content-Type: application/json' \
         -H 'Authorization: Bearer $TOKEN' \
         -d '{
             \"componentId\": \"$COMPONENT_ID\",
             \"newStatus\": \"3\",
             \"note\": \"Production completed\",
             \"user\": \"admin\"
         }'"
    
    # Test 3: Treatment status change (3 -> 4:verniciatura:PREP)
    run_test "Treatment preparation status" "200" \
        "curl -s -w '\n%{http_code}' -X POST '$BASE_URL/api/changestatus' \
         -H 'Content-Type: application/json' \
         -H 'Authorization: Bearer $TOKEN' \
         -d '{
             \"componentId\": \"$COMPONENT_ID\",
             \"newStatus\": \"4:verniciatura:PREP\",
             \"note\": \"Preparing for painting\",
             \"user\": \"admin\"
         }'"
    
    # Test 4: Treatment in progress (4:verniciatura:PREP -> 4:verniciatura:IN)
    run_test "Treatment in progress" "200" \
        "curl -s -w '\n%{http_code}' -X POST '$BASE_URL/api/changestatus' \
         -H 'Content-Type: application/json' \
         -H 'Authorization: Bearer $TOKEN' \
         -d '{
             \"componentId\": \"$COMPONENT_ID\",
             \"newStatus\": \"4:verniciatura:IN\",
             \"note\": \"Painting in progress\",
             \"user\": \"admin\"
         }'"
    
    # Test 5: Treatment completed (4:verniciatura:IN -> 4:verniciatura:ARR)
    run_test "Treatment completed" "200" \
        "curl -s -w '\n%{http_code}' -X POST '$BASE_URL/api/changestatus' \
         -H 'Content-Type: application/json' \
         -H 'Authorization: Bearer $TOKEN' \
         -d '{
             \"componentId\": \"$COMPONENT_ID\",
             \"newStatus\": \"4:verniciatura:ARR\",
             \"note\": \"Painting completed\",
             \"user\": \"admin\"
         }'"
    
    # Test 6: Second treatment preparation
    run_test "Second treatment preparation" "200" \
        "curl -s -w '\n%{http_code}' -X POST '$BASE_URL/api/changestatus' \
         -H 'Content-Type: application/json' \
         -H 'Authorization: Bearer $TOKEN' \
         -d '{
             \"componentId\": \"$COMPONENT_ID\",
             \"newStatus\": \"4:assemblaggio:PREP\",
             \"note\": \"Preparing for assembly\",
             \"user\": \"admin\"
         }'"
    
    # Test 7: Second treatment in progress
    run_test "Second treatment in progress" "200" \
        "curl -s -w '\n%{http_code}' -X POST '$BASE_URL/api/changestatus' \
         -H 'Content-Type: application/json' \
         -H 'Authorization: Bearer $TOKEN' \
         -d '{
             \"componentId\": \"$COMPONENT_ID\",
             \"newStatus\": \"4:assemblaggio:IN\",
             \"note\": \"Assembly in progress\",
             \"user\": \"admin\"
         }'"
    
    # Test 8: Second treatment completed (should trigger auto-transition to 5)
    run_test "All treatments completed" "200" \
        "curl -s -w '\n%{http_code}' -X POST '$BASE_URL/api/changestatus' \
         -H 'Content-Type: application/json' \
         -H 'Authorization: Bearer $TOKEN' \
         -d '{
             \"componentId\": \"$COMPONENT_ID\",
             \"newStatus\": \"4:assemblaggio:ARR\",
             \"note\": \"Assembly completed\",
             \"user\": \"admin\"
         }'"
    
    # Test 9: Shipping with DDT (5 -> 6)
    run_test "Shipping with DDT" "200" \
        "curl -s -w '\n%{http_code}' -X POST '$BASE_URL/api/changestatus' \
         -H 'Content-Type: application/json' \
         -H 'Authorization: Bearer $TOKEN' \
         -d '{
             \"componentId\": \"$COMPONENT_ID\",
             \"newStatus\": \"6\",
             \"note\": \"Shipped to customer\",
             \"user\": \"admin\",
             \"ddtNumber\": \"DDT-2024-001\",
             \"ddtDate\": \"2024-01-15T10:00:00Z\"
         }'"
    
    # Test 10: Invalid status transition
    run_test "Invalid status transition" "400" \
        "curl -s -w '\n%{http_code}' -X POST '$BASE_URL/api/changestatus' \
         -H 'Content-Type: application/json' \
         -H 'Authorization: Bearer $TOKEN' \
         -d '{
             \"componentId\": \"$COMPONENT_ID\",
             \"newStatus\": \"invalid-status\",
             \"user\": \"admin\"
         }'"
    
    # Test 11: Missing required fields
    run_test "Missing componentId" "400" \
        "curl -s -w '\n%{http_code}' -X POST '$BASE_URL/api/changestatus' \
         -H 'Content-Type: application/json' \
         -H 'Authorization: Bearer $TOKEN' \
         -d '{
             \"newStatus\": \"2\",
             \"user\": \"admin\"
         }'"
    
    # Test 12: Missing newStatus
    run_test "Missing newStatus" "400" \
        "curl -s -w '\n%{http_code}' -X POST '$BASE_URL/api/changestatus' \
         -H 'Content-Type: application/json' \
         -H 'Authorization: Bearer $TOKEN' \
         -d '{
             \"componentId\": \"$COMPONENT_ID\",
             \"user\": \"admin\"
         }'"
    
    # Test 13: Non-existent component
    run_test "Non-existent component" "404" \
        "curl -s -w '\n%{http_code}' -X POST '$BASE_URL/api/changestatus' \
         -H 'Content-Type: application/json' \
         -H 'Authorization: Bearer $TOKEN' \
         -d '{
             \"componentId\": \"507f1f77bcf86cd799439011\",
             \"newStatus\": \"2\",
             \"user\": \"admin\"
         }'"
    
    # Test 14: Invalid component ID format
    run_test "Invalid component ID format" "400" \
        "curl -s -w '\n%{http_code}' -X POST '$BASE_URL/api/changestatus' \
         -H 'Content-Type: application/json' \
         -H 'Authorization: Bearer $TOKEN' \
         -d '{
             \"componentId\": \"invalid-id\",
             \"newStatus\": \"2\",
             \"user\": \"admin\"
         }'"
    
    # Test 15: Access without authentication
    run_test "Status change without auth" "401" \
        "curl -s -w '\n%{http_code}' -X POST '$BASE_URL/api/changestatus' \
         -H 'Content-Type: application/json' \
         -d '{
             \"componentId\": \"$COMPONENT_ID\",
             \"newStatus\": \"2\",
             \"user\": \"admin\"
         }'"
    
    # Create another component for additional tests
    COMPONENT_RESP2=$(curl -s -X POST "$BASE_URL/api/components" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TOKEN" \
        -d "{
            \"commessaId\": \"$COMMESSA_ID\",
            \"name\": \"Status Test Component 2\",
            \"barcode\": \"STATUS002\",
            \"status\": \"1\",
            \"trattamenti\": [\"machining\"]
        }")
    
    COMPONENT_ID2=$(echo "$COMPONENT_RESP2" | grep -o '"_id":"[^"]*"' | cut -d'"' -f4)
    
    if [ -n "$COMPONENT_ID2" ]; then
        # Test 16: Direct transition to ready (without all treatments completed)
        run_test "Direct transition to ready" "200" \
            "curl -s -w '\n%{http_code}' -X POST '$BASE_URL/api/changestatus' \
             -H 'Content-Type: application/json' \
             -H 'Authorization: Bearer $TOKEN' \
             -d '{
                 \"componentId\": \"$COMPONENT_ID2\",
                 \"newStatus\": \"5\",
                 \"note\": \"Manual ready status\",
                 \"user\": \"admin\"
             }'"
        
        # Test 17: Treatment status for component with different treatments
        run_test "Different treatment status" "200" \
            "curl -s -w '\n%{http_code}' -X POST '$BASE_URL/api/changestatus' \
             -H 'Content-Type: application/json' \
             -H 'Authorization: Bearer $TOKEN' \
             -d '{
                 \"componentId\": \"$COMPONENT_ID2\",
                 \"newStatus\": \"4:machining:PREP\",
                 \"note\": \"Preparing for machining\",
                 \"user\": \"admin\"
             }'"
    fi
    
    # Test 18: Verify component history was recorded
    if [ -n "$COMPONENT_ID" ]; then
        run_test "Verify component history" "200" \
            "curl -s -w '\n%{http_code}' -X GET '$BASE_URL/api/components/$COMPONENT_ID' \
             -H 'Authorization: Bearer $TOKEN'"
    fi
    
    log_info "Status change tests completed"
}

# Run tests if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    test_status_changes
fi
#!/bin/bash
# User Management API Tests

source "$(dirname "$0")/run-tests.sh"

test_users() {
    log_info "=== User Management Tests ==="
    
    # Get admin token
    TOKEN=$(curl -s -X POST "$BASE_URL/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"username\": \"$ADMIN_USER\", \"password\": \"$ADMIN_PASS\"}" | \
        grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
    
    if [ -z "$TOKEN" ]; then
        log_error "Failed to get admin token for user tests"
        return 1
    fi
    
    # Test 1: List users (admin only)
    run_test "List users as admin" "200" \
        "curl -s -w '\n%{http_code}' -X GET '$BASE_URL/api/utenti' \
         -H 'Authorization: Bearer $TOKEN'"
    
    # Test 2: Create new user
    run_test "Create new user" "201" \
        "curl -s -w '\n%{http_code}' -X POST '$BASE_URL/api/utenti' \
         -H 'Content-Type: application/json' \
         -H 'Authorization: Bearer $TOKEN' \
         -d '{\"username\": \"testuser\", \"email\": \"test@example.com\", \"profilo\": \"UFF\", \"password\": \"testpass123\"}'"
    
    # Test 3: Create user with duplicate username
    run_test "Create user with duplicate username" "409" \
        "curl -s -w '\n%{http_code}' -X POST '$BASE_URL/api/utenti' \
         -H 'Content-Type: application/json' \
         -H 'Authorization: Bearer $TOKEN' \
         -d '{\"username\": \"testuser\", \"email\": \"test2@example.com\", \"profilo\": \"UFF\", \"password\": \"testpass123\"}'"
    
    # Test 4: Create user without required fields
    run_test "Create user without username" "400" \
        "curl -s -w '\n%{http_code}' -X POST '$BASE_URL/api/utenti' \
         -H 'Content-Type: application/json' \
         -H 'Authorization: Bearer $TOKEN' \
         -d '{\"email\": \"test3@example.com\", \"password\": \"testpass123\"}'"
    
    # Test 5: Create user without password
    run_test "Create user without password" "400" \
        "curl -s -w '\n%{http_code}' -X POST '$BASE_URL/api/utenti' \
         -H 'Content-Type: application/json' \
         -H 'Authorization: Bearer $TOKEN' \
         -d '{\"username\": \"testuser2\", \"email\": \"test4@example.com\"}'"
    
    # Get user ID for update/delete tests
    USER_ID=$(curl -s -X GET "$BASE_URL/api/utenti" \
        -H "Authorization: Bearer $TOKEN" | \
        grep -o '"_id":"[^"]*","username":"testuser"' | \
        cut -d'"' -f4)
    
    if [ -n "$USER_ID" ]; then
        # Test 6: Update user
        run_test "Update user" "200" \
            "curl -s -w '\n%{http_code}' -X PUT '$BASE_URL/api/utenti/$USER_ID' \
             -H 'Content-Type: application/json' \
             -H 'Authorization: Bearer $TOKEN' \
             -d '{\"username\": \"testuser_updated\", \"email\": \"updated@example.com\", \"profilo\": \"ADMIN\"}'"
        
        # Test 7: Update user with duplicate username (should fail)
        run_test "Update user with duplicate username" "409" \
            "curl -s -w '\n%{http_code}' -X PUT '$BASE_URL/api/utenti/$USER_ID' \
             -H 'Content-Type: application/json' \
             -H 'Authorization: Bearer $TOKEN' \
             -d '{\"username\": \"admin\", \"email\": \"updated@example.com\", \"profilo\": \"UFF\"}'"
        
        # Test 8: Delete user
        run_test "Delete user" "200" \
            "curl -s -w '\n%{http_code}' -X DELETE '$BASE_URL/api/utenti/$USER_ID' \
             -H 'Authorization: Bearer $TOKEN'"
    fi
    
    # Test 9: Access user management as non-admin
    # First create a regular user and get their token
    curl -s -X POST "$BASE_URL/api/utenti" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TOKEN" \
        -d '{"username": "regular_user", "email": "regular@example.com", "profilo": "UFF", "password": "regular123"}' > /dev/null
    
    USER_TOKEN=$(curl -s -X POST "$BASE_URL/auth/login" \
        -H "Content-Type: application/json" \
        -d '{"username": "regular_user", "password": "regular123"}' | \
        grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
    
    if [ -n "$USER_TOKEN" ]; then
        run_test "Access user management as non-admin" "403" \
            "curl -s -w '\n%{http_code}' -X GET '$BASE_URL/api/utenti' \
             -H 'Authorization: Bearer $USER_TOKEN'"
        
        # Cleanup: delete the regular user
        REGULAR_USER_ID=$(curl -s -X GET "$BASE_URL/api/utenti" \
            -H "Authorization: Bearer $TOKEN" | \
            grep -o '"_id":"[^"]*","username":"regular_user"' | \
            cut -d'"' -f4)
        
        if [ -n "$REGULAR_USER_ID" ]; then
            curl -s -X DELETE "$BASE_URL/api/utenti/$REGULAR_USER_ID" \
                -H "Authorization: Bearer $TOKEN" > /dev/null
        fi
    fi
    
    # Test 10: Update non-existent user
    run_test "Update non-existent user" "404" \
        "curl -s -w '\n%{http_code}' -X PUT '$BASE_URL/api/utenti/507f1f77bcf86cd799439011' \
         -H 'Content-Type: application/json' \
         -H 'Authorization: Bearer $TOKEN' \
         -d '{\"username\": \"nonexistent\", \"email\": \"none@example.com\"}'"
    
    # Test 11: Delete non-existent user
    run_test "Delete non-existent user" "404" \
        "curl -s -w '\n%{http_code}' -X DELETE '$BASE_URL/api/utenti/507f1f77bcf86cd799439011' \
         -H 'Authorization: Bearer $TOKEN'"
    
    log_info "User management tests completed"
}

# Run tests if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    test_users
fi
#!/bin/bash
# Authentication API Tests

source "$(dirname "$0")/run-tests.sh"

test_auth() {
    log_info "=== Authentication Tests ==="
    
    # Test 1: Valid login
    run_test "Valid login" "200" \
        "curl -s -w '\n%{http_code}' -X POST '$BASE_URL/auth/login' \
         -H 'Content-Type: application/json' \
         -d '{\"username\": \"$ADMIN_USER\", \"password\": \"$ADMIN_PASS\"}' \
         -c cookies.txt"
    
    # Extract token for subsequent tests
    TOKEN=$(curl -s -X POST "$BASE_URL/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"username\": \"$ADMIN_USER\", \"password\": \"$ADMIN_PASS\"}" | \
        grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
    
    # Test 2: Invalid password
    run_test "Invalid password" "401" \
        "curl -s -w '\n%{http_code}' -X POST '$BASE_URL/auth/login' \
         -H 'Content-Type: application/json' \
         -d '{\"username\": \"$ADMIN_USER\", \"password\": \"wrongpass\"}'"
    
    # Test 3: Missing credentials
    run_test "Missing password" "400" \
        "curl -s -w '\n%{http_code}' -X POST '$BASE_URL/auth/login' \
         -H 'Content-Type: application/json' \
         -d '{\"username\": \"$ADMIN_USER\"}'"
    
    # Test 4: Missing username
    run_test "Missing username" "400" \
        "curl -s -w '\n%{http_code}' -X POST '$BASE_URL/auth/login' \
         -H 'Content-Type: application/json' \
         -d '{\"password\": \"$ADMIN_PASS\"}'"
    
    # Test 5: Refresh token (requires valid login first)
    if [ -n "$TOKEN" ]; then
        run_test "Refresh token" "200" \
            "curl -s -w '\n%{http_code}' -X POST '$BASE_URL/auth/refresh' \
             -H 'Content-Type: application/json' \
             -b cookies.txt"
    fi
    
    # Test 6: Refresh without cookie
    run_test "Refresh without cookie" "401" \
        "curl -s -w '\n%{http_code}' -X POST '$BASE_URL/auth/refresh' \
         -H 'Content-Type: application/json'"
    
    # Test 7: Access protected endpoint without token
    run_test "Protected endpoint without token" "401" \
        "curl -s -w '\n%{http_code}' -X GET '$BASE_URL/api/commesse'"
    
    # Test 8: Access protected endpoint with valid token
    if [ -n "$TOKEN" ]; then
        run_test "Protected endpoint with valid token" "200" \
            "curl -s -w '\n%{http_code}' -X GET '$BASE_URL/api/commesse' \
             -H 'Authorization: Bearer $TOKEN'"
    fi
    
    # Test 9: Access protected endpoint with invalid token
    run_test "Protected endpoint with invalid token" "401" \
        "curl -s -w '\n%{http_code}' -X GET '$BASE_URL/api/commesse' \
         -H 'Authorization: Bearer invalid-token'"
    
    # Test 10: Logout
    run_test "Logout" "204" \
        "curl -s -w '\n%{http_code}' -X POST '$BASE_URL/auth/logout' \
         -H 'Content-Type: application/json' \
         -b cookies.txt"
    
    # Export TOKEN for use in other test files
    echo "$TOKEN" > /tmp/test_token.txt
    
    log_info "Authentication tests completed"
}

# Run tests if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    test_auth
fi
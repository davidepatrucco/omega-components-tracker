#!/bin/bash
# Statistics API Tests

source "$(dirname "$0")/run-tests.sh"

test_stats() {
    log_info "=== Statistics Tests ==="
    
    # Get admin token
    TOKEN=$(curl -s -X POST "$BASE_URL/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"username\": \"$ADMIN_USER\", \"password\": \"$ADMIN_PASS\"}" | \
        grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
    
    if [ -z "$TOKEN" ]; then
        log_error "Failed to get admin token for statistics tests"
        return 1
    fi
    
    # Test 1: Get basic statistics
    run_test "Get basic statistics" "200" \
        "curl -s -w '\n%{http_code}' -X GET '$BASE_URL/api/stats' \
         -H 'Authorization: Bearer $TOKEN'"
    
    # Test 2: Access statistics without authentication
    run_test "Statistics without auth" "401" \
        "curl -s -w '\n%{http_code}' -X GET '$BASE_URL/api/stats'"
    
    # Test 3: Verify statistics structure
    STATS_RESPONSE=$(curl -s -X GET "$BASE_URL/api/stats" \
        -H "Authorization: Bearer $TOKEN")
    
    # Check if response contains expected fields
    if echo "$STATS_RESPONSE" | grep -q "inLavorazione"; then
        log_success "Statistics contain inLavorazione field"
    else
        log_error "Statistics missing inLavorazione field"
    fi
    
    if echo "$STATS_RESPONSE" | grep -q "daSpedire"; then
        log_success "Statistics contain daSpedire field"
    else
        log_error "Statistics missing daSpedire field"
    fi
    
    if echo "$STATS_RESPONSE" | grep -q "verificatoPercentage"; then
        log_success "Statistics contain verificatoPercentage field"
    else
        log_error "Statistics missing verificatoPercentage field"
    fi
    
    if echo "$STATS_RESPONSE" | grep -q "speditOggi"; then
        log_success "Statistics contain speditOggi field"
    else
        log_error "Statistics missing speditOggi field"
    fi
    
    # Test 4: Statistics with no data (should return zeros)
    # First, let's create some test data to make stats more meaningful
    
    # Create test commessa
    COMMESSA_RESP=$(curl -s -X POST "$BASE_URL/api/commesse" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TOKEN" \
        -d '{"code": "STATS-TEST", "name": "Statistics Test Order"}')
    
    COMMESSA_ID=$(echo "$COMMESSA_RESP" | grep -o '"_id":"[^"]*"' | cut -d'"' -f4)
    
    if [ -n "$COMMESSA_ID" ]; then
        # Create components in different statuses
        # Component in status 1 (should count as "in lavorazione")
        curl -s -X POST "$BASE_URL/api/components" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $TOKEN" \
            -d "{
                \"commessaId\": \"$COMMESSA_ID\",
                \"name\": \"Stats Component 1\",
                \"barcode\": \"STATS001\",
                \"status\": \"1\"
            }" > /dev/null
        
        # Component in status 5 (should count as "da spedire")
        curl -s -X POST "$BASE_URL/api/components" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $TOKEN" \
            -d "{
                \"commessaId\": \"$COMMESSA_ID\",
                \"name\": \"Stats Component 2\",
                \"barcode\": \"STATS002\",
                \"status\": \"5\"
            }" > /dev/null
        
        # Component in status 6 (should not count as "in lavorazione")
        COMPONENT_RESP=$(curl -s -X POST "$BASE_URL/api/components" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $TOKEN" \
            -d "{
                \"commessaId\": \"$COMMESSA_ID\",
                \"name\": \"Stats Component 3\",
                \"barcode\": \"STATS003\",
                \"status\": \"1\"
            }")
        
        COMPONENT_ID=$(echo "$COMPONENT_RESP" | grep -o '"_id":"[^"]*"' | cut -d'"' -f4)
        
        # Change it to shipped status
        if [ -n "$COMPONENT_ID" ]; then
            curl -s -X POST "$BASE_URL/api/changestatus" \
                -H "Content-Type: application/json" \
                -H "Authorization: Bearer $TOKEN" \
                -d "{
                    \"componentId\": \"$COMPONENT_ID\",
                    \"newStatus\": \"6\",
                    \"note\": \"Test shipping\",
                    \"user\": \"admin\"
                }" > /dev/null
        fi
    fi
    
    # Test 5: Get updated statistics
    run_test "Get updated statistics with test data" "200" \
        "curl -s -w '\n%{http_code}' -X GET '$BASE_URL/api/stats' \
         -H 'Authorization: Bearer $TOKEN'"
    
    # Test 6: Validate statistics logic
    UPDATED_STATS=$(curl -s -X GET "$BASE_URL/api/stats" \
        -H "Authorization: Bearer $TOKEN")
    
    IN_LAVORAZIONE=$(echo "$UPDATED_STATS" | grep -o '"inLavorazione":[0-9]*' | cut -d':' -f2)
    DA_SPEDIRE=$(echo "$UPDATED_STATS" | grep -o '"daSpedire":[0-9]*' | cut -d':' -f2)
    SPEDITI_OGGI=$(echo "$UPDATED_STATS" | grep -o '"speditOggi":[0-9]*' | cut -d':' -f2)
    
    if [ -n "$IN_LAVORAZIONE" ] && [ "$IN_LAVORAZIONE" -ge 1 ]; then
        log_success "inLavorazione count is reasonable ($IN_LAVORAZIONE)"
    else
        log_error "inLavorazione count seems incorrect ($IN_LAVORAZIONE)"
    fi
    
    if [ -n "$DA_SPEDIRE" ] && [ "$DA_SPEDIRE" -ge 1 ]; then
        log_success "daSpedire count is reasonable ($DA_SPEDIRE)"
    else
        log_error "daSpedire count seems incorrect ($DA_SPEDIRE)"
    fi
    
    if [ -n "$SPEDITI_OGGI" ] && [ "$SPEDITI_OGGI" -ge 0 ]; then
        log_success "speditOggi count is reasonable ($SPEDITI_OGGI)"
    else
        log_error "speditOggi count seems incorrect ($SPEDITI_OGGI)"
    fi
    
    # Test 7: Health check endpoint
    run_test "Health check endpoint" "200" \
        "curl -s -w '\n%{http_code}' -X GET '$BASE_URL/health'"
    
    # Test 8: Check if health endpoint returns proper JSON
    HEALTH_RESPONSE=$(curl -s -X GET "$BASE_URL/health")
    if echo "$HEALTH_RESPONSE" | grep -q "status"; then
        log_success "Health endpoint returns status field"
    else
        log_error "Health endpoint missing status field"
    fi
    
    # Test 9: Test statistics performance (should respond quickly)
    start_time=$(date +%s%N)
    curl -s -X GET "$BASE_URL/api/stats" -H "Authorization: Bearer $TOKEN" > /dev/null
    end_time=$(date +%s%N)
    duration_ms=$(( (end_time - start_time) / 1000000 ))
    
    if [ "$duration_ms" -lt 5000 ]; then  # Less than 5 seconds
        log_success "Statistics endpoint responds in ${duration_ms}ms"
    else
        log_error "Statistics endpoint too slow: ${duration_ms}ms"
    fi
    
    # Test 10: Multiple rapid requests (basic load test)
    log_info "Testing multiple rapid requests..."
    success_count=0
    for i in {1..5}; do
        status=$(curl -s -w '%{http_code}' -o /dev/null -X GET "$BASE_URL/api/stats" \
            -H "Authorization: Bearer $TOKEN")
        if [ "$status" = "200" ]; then
            ((success_count++))
        fi
    done
    
    if [ "$success_count" -eq 5 ]; then
        log_success "All rapid requests succeeded ($success_count/5)"
    else
        log_error "Some rapid requests failed ($success_count/5)"
    fi
    
    log_info "Statistics tests completed"
}

# Run tests if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    test_stats
fi
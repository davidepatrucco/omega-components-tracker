#!/bin/bash

# Test script for Omega Mobile App backend integration
# Tests the enhanced barcode search functionality

echo "🧪 Omega Mobile App - Backend Integration Test"
echo "=============================================="

# Backend URL
BACKEND_URL="http://localhost:4000"

# Check if backend is running
echo "📡 Checking backend connectivity..."
if ! curl -s -f "${BACKEND_URL}/auth/login" > /dev/null 2>&1; then
    echo "❌ Backend not reachable at ${BACKEND_URL}"
    echo "   Please start the backend with: cd omega-app/backend && npm run dev"
    exit 1
fi
echo "✅ Backend is reachable"

# Test login
echo ""
echo "🔐 Testing login functionality..."
LOGIN_RESPONSE=$(curl -s -X POST "${BACKEND_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"d","password":"d"}' \
  -w "HTTPSTATUS:%{http_code}")

HTTP_STATUS=$(echo $LOGIN_RESPONSE | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')
LOGIN_BODY=$(echo $LOGIN_RESPONSE | sed -E 's/HTTPSTATUS:[0-9]{3}$//')

if [ "$HTTP_STATUS" -eq 200 ]; then
    echo "✅ Login successful"
    ACCESS_TOKEN=$(echo $LOGIN_BODY | grep -o '"accessToken":"[^"]*"' | sed 's/"accessToken":"\(.*\)"/\1/')
    echo "   Token obtained: ${ACCESS_TOKEN:0:20}..."
else
    echo "❌ Login failed (HTTP $HTTP_STATUS)"
    echo "   Response: $LOGIN_BODY"
    exit 1
fi

# Test barcode search functionality
echo ""
echo "🔍 Testing barcode search functionality..."
SEARCH_RESPONSE=$(curl -s -X GET "${BACKEND_URL}/components?barcode=TEST123" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -w "HTTPSTATUS:%{http_code}")

HTTP_STATUS=$(echo $SEARCH_RESPONSE | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')
SEARCH_BODY=$(echo $SEARCH_RESPONSE | sed -E 's/HTTPSTATUS:[0-9]{3}$//')

if [ "$HTTP_STATUS" -eq 200 ]; then
    echo "✅ Barcode search endpoint working"
    ITEM_COUNT=$(echo $SEARCH_BODY | grep -o '"total":[0-9]*' | sed 's/"total":\([0-9]*\)/\1/')
    echo "   Found $ITEM_COUNT items for barcode 'TEST123'"
else
    echo "❌ Barcode search failed (HTTP $HTTP_STATUS)"
    echo "   Response: $SEARCH_BODY"
    exit 1
fi

# Test component status change
echo ""
echo "⚙️  Testing status change functionality..."
# First, try to get any component
COMPONENTS_RESPONSE=$(curl -s -X GET "${BACKEND_URL}/components?pageSize=1" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -w "HTTPSTATUS:%{http_code}")

HTTP_STATUS=$(echo $COMPONENTS_RESPONSE | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')
COMPONENTS_BODY=$(echo $COMPONENTS_RESPONSE | sed -E 's/HTTPSTATUS:[0-9]{3}$//')

if [ "$HTTP_STATUS" -eq 200 ]; then
    echo "✅ Components endpoint working"
    TOTAL_COMPONENTS=$(echo $COMPONENTS_BODY | grep -o '"total":[0-9]*' | sed 's/"total":\([0-9]*\)/\1/')
    echo "   Total components in system: $TOTAL_COMPONENTS"
else
    echo "❌ Components endpoint failed (HTTP $HTTP_STATUS)"
    echo "   Response: $COMPONENTS_BODY"
fi

# Test changestatus endpoint (dry run)
echo ""
echo "🔄 Testing changestatus endpoint (dry run)..."
STATUS_CHANGE_RESPONSE=$(curl -s -X POST "${BACKEND_URL}/changestatus" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"componentId":"000000000000000000000000","to":"3","note":"Test from mobile"}' \
  -w "HTTPSTATUS:%{http_code}")

HTTP_STATUS=$(echo $STATUS_CHANGE_RESPONSE | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')
STATUS_CHANGE_BODY=$(echo $STATUS_CHANGE_RESPONSE | sed -E 's/HTTPSTATUS:[0-9]{3}$//')

# Expect 404 (component not found) or 400 (invalid ID) - this confirms endpoint is working
if [ "$HTTP_STATUS" -eq 404 ] || [ "$HTTP_STATUS" -eq 400 ]; then
    echo "✅ Changestatus endpoint working (expected error for test ID)"
else
    echo "⚠️  Changestatus endpoint response: HTTP $HTTP_STATUS"
    echo "   Response: $STATUS_CHANGE_BODY"
fi

echo ""
echo "🎉 Backend integration test completed!"
echo ""
echo "📱 To test the mobile app:"
echo "   1. cd omega-app/mobile"
echo "   2. npm start"
echo "   3. Use Expo Go app to scan QR code"
echo "   4. Test login with username: 'd', password: 'd'"
echo "   5. Test barcode scanning (use any Code128 barcode)"
echo ""
echo "📋 Mobile App Features:"
echo "   ✅ Login with existing backend credentials"
echo "   ✅ Barcode scanning (Code128)"
echo "   ✅ Component lookup by barcode"
echo "   ✅ Automatic status change (1/2/2-ext → 3)"
echo "   ✅ Device ID tracking in notes"
echo "   ✅ Consistent UI with Ant Design"
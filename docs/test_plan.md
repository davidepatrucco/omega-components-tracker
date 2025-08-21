# Piano di Test - Sistema Omega Components Tracker

## 📋 Panoramica Testing Strategy

Questo documento definisce una strategia di testing completa per il sistema Omega Components Tracker, coprendo scenari happy path, edge cases e test di integrazione end-to-end.

### Approccio Testing
- **Unit Tests**: Test diretti al backend tramite chiamate curl/HTTP
- **End-to-End Tests**: Simulazione di attività utente reali (login, flussi operativi)
- **Integration Tests**: Test di workflow completi che coinvolgono più componenti

### Obiettivi Testing
1. Validare tutte le funzionalità core del sistema
2. Verificare robustezza contro input non validi
3. Testare flussi utente completi e realistici
4. Assicurare affidabilità dei workflow critici

---

## 🧪 Unit Tests - Backend API

### 1. Authentication & Authorization Tests

#### 1.1 Happy Path - Login/Logout Flow
**Scenario**: Login utente con credenziali valide
```bash
# Test POST /auth/login - Success
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "changeme"}' \
  -c cookies.txt

# Expected: 200, {"accessToken": "...", "user": {"username": "admin", "profilo": "ADMIN"}}
# Expected: refreshToken cookie set
```

**Scenario**: Refresh token functionality
```bash
# Test POST /auth/refresh - Token renewal
curl -X POST http://localhost:4000/auth/refresh \
  -H "Content-Type: application/json" \
  -b cookies.txt

# Expected: 200, {"accessToken": "..."}
# Expected: New refreshToken cookie
```

**Scenario**: Logout and token revocation
```bash
# Test POST /auth/logout
curl -X POST http://localhost:4000/auth/logout \
  -H "Content-Type: application/json" \
  -b cookies.txt

# Expected: 204, refreshToken cookie cleared
```

#### 1.2 Edge Cases - Authentication
**Invalid credentials**
```bash
# Test wrong password
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "wrongpass"}'

# Expected: 401, {"error": "invalid credentials"}
```

**Missing credentials**
```bash
# Test missing password
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin"}'

# Expected: 400, {"error": "username and password required"}
```

**Expired/Invalid refresh token**
```bash
# Test with no refresh cookie
curl -X POST http://localhost:4000/auth/refresh \
  -H "Content-Type: application/json"

# Expected: 401, {"error": "no refresh token"}
```

**Unauthorized access to protected endpoints**
```bash
# Test protected endpoint without token
curl -X GET http://localhost:4000/api/commesse

# Expected: 401, authentication required
```

### 2. User Management Tests (Admin Only)

#### 2.1 Happy Path - User CRUD
**Create new user**
```bash
# First login as admin
TOKEN=$(curl -s -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "changeme"}' | jq -r '.accessToken')

# Create user
curl -X POST http://localhost:4000/api/utenti \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"username": "testuser", "email": "test@example.com", "profilo": "UFF", "password": "testpass123"}'

# Expected: 201, user object without password field
```

**List users**
```bash
curl -X GET http://localhost:4000/api/utenti \
  -H "Authorization: Bearer $TOKEN"

# Expected: 200, array of user objects
```

**Update user**
```bash
curl -X PUT http://localhost:4000/api/utenti/USER_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"username": "updateduser", "email": "updated@example.com", "profilo": "ADMIN"}'

# Expected: 200, updated user object
```

**Delete user**
```bash
curl -X DELETE http://localhost:4000/api/utenti/USER_ID \
  -H "Authorization: Bearer $TOKEN"

# Expected: 200, success message
```

#### 2.2 Edge Cases - User Management
**Duplicate username**
```bash
curl -X POST http://localhost:4000/api/utenti \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"username": "admin", "password": "test123"}'

# Expected: 409, {"userMessage": "Username già esistente"}
```

**Admin self-deletion prevention**
```bash
curl -X DELETE http://localhost:4000/api/utenti/ADMIN_USER_ID \
  -H "Authorization: Bearer $TOKEN"

# Expected: 400, cannot delete self
```

**Non-admin access to user management**
```bash
# Login as regular user
USER_TOKEN=$(curl -s -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser", "password": "testpass123"}' | jq -r '.accessToken')

curl -X GET http://localhost:4000/api/utenti \
  -H "Authorization: Bearer $USER_TOKEN"

# Expected: 403, admin required
```

### 3. Commesse Management Tests

#### 3.1 Happy Path - Commesse CRUD
**Create commessa**
```bash
curl -X POST http://localhost:4000/api/commesse \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"code": "ORD-001", "name": "Test Order", "note": "Test notes"}'

# Expected: 201, commessa object with _id
```

**List commesse**
```bash
curl -X GET http://localhost:4000/api/commesse \
  -H "Authorization: Bearer $TOKEN"

# Expected: 200, array of commessa objects
```

**Get specific commessa**
```bash
curl -X GET http://localhost:4000/api/commesse/COMMESSA_ID \
  -H "Authorization: Bearer $TOKEN"

# Expected: 200, commessa object
```

**Update commessa**
```bash
curl -X PUT http://localhost:4000/api/commesse/COMMESSA_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"code": "ORD-001-UPD", "name": "Updated Order", "note": "Updated notes"}'

# Expected: 200, updated commessa
```

#### 3.2 Edge Cases - Commesse
**Duplicate code**
```bash
curl -X POST http://localhost:4000/api/commesse \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"code": "ORD-001", "name": "Duplicate Order"}'

# Expected: 409, {"error": "code already exists"}
```

**Missing required fields**
```bash
curl -X POST http://localhost:4000/api/commesse \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name": "Order without code"}'

# Expected: 400, {"error": "code and name required"}
```

**Invalid commessa ID**
```bash
curl -X GET http://localhost:4000/api/commesse/invalid-id \
  -H "Authorization: Bearer $TOKEN"

# Expected: 400, {"error": "invalid id"}
```

**Non-existent commessa**
```bash
curl -X GET http://localhost:4000/api/commesse/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer $TOKEN"

# Expected: 404, {"error": "commessa not found"}
```

### 4. Components Management Tests

#### 4.1 Happy Path - Components CRUD
**Create component**
```bash
curl -X POST http://localhost:4000/api/components \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "commessaId": "COMMESSA_ID",
    "name": "Test Component",
    "barcode": "BC001",
    "status": "1",
    "trattamenti": ["verniciatura", "assemblaggio"]
  }'

# Expected: 201, component object with generated fields
```

**List components with pagination**
```bash
curl -X GET "http://localhost:4000/api/components?page=1&pageSize=10" \
  -H "Authorization: Bearer $TOKEN"

# Expected: 200, {"items": [...], "total": N}
```

**Search components**
```bash
curl -X GET "http://localhost:4000/api/components?q=Test" \
  -H "Authorization: Bearer $TOKEN"

# Expected: 200, filtered results
```

**Get components by commessa**
```bash
curl -X GET http://localhost:4000/api/components/commessa/COMMESSA_ID \
  -H "Authorization: Bearer $TOKEN"

# Expected: 200, array of components for that commessa
```

**Update component**
```bash
curl -X PUT http://localhost:4000/api/components/COMPONENT_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name": "Updated Component", "barcode": "BC001-UPD"}'

# Expected: 200, updated component
```

#### 4.2 Edge Cases - Components
**Create component without required fields**
```bash
curl -X POST http://localhost:4000/api/components \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name": "Component without commessa"}'

# Expected: 400, validation error
```

**Invalid component ID format**
```bash
curl -X PUT http://localhost:4000/api/components/invalid-id \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name": "test"}'

# Expected: 400, {"error": "invalid id"}
```

**Large dataset pagination**
```bash
curl -X GET "http://localhost:4000/api/components?page=999&pageSize=10" \
  -H "Authorization: Bearer $TOKEN"

# Expected: 200, {"items": [], "total": N} - empty items for non-existent page
```

### 5. Status Change Tests

#### 5.1 Happy Path - Status Transitions
**Basic status change**
```bash
curl -X POST http://localhost:4000/api/changestatus \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "componentId": "COMPONENT_ID",
    "newStatus": "2",
    "note": "Started production",
    "user": "admin"
  }'

# Expected: 200, success with history update
```

**Treatment status transitions**
```bash
# Move to treatment preparation
curl -X POST http://localhost:4000/api/changestatus \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "componentId": "COMPONENT_ID",
    "newStatus": "4:verniciatura:PREP",
    "note": "Preparing for painting",
    "user": "admin"
  }'

# Expected: 200, treatment status set
```

**Treatment completion with auto-transition**
```bash
# Complete all treatments to trigger auto-transition to "5"
curl -X POST http://localhost:4000/api/changestatus \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "componentId": "COMPONENT_ID",
    "newStatus": "4:assemblaggio:ARR",
    "note": "Final treatment completed",
    "user": "admin"
  }'

# Expected: 200, auto-transition to status "5" if all treatments completed
```

**Shipping with DDT**
```bash
curl -X POST http://localhost:4000/api/changestatus \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "componentId": "COMPONENT_ID",
    "newStatus": "6",
    "note": "Shipped to customer",
    "user": "admin",
    "ddtNumber": "DDT-2024-001",
    "ddtDate": "2024-01-15T10:00:00Z"
  }'

# Expected: 200, shipped status with DDT info
```

#### 5.2 Edge Cases - Status Changes
**Invalid status transition**
```bash
curl -X POST http://localhost:4000/api/changestatus \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "componentId": "COMPONENT_ID",
    "newStatus": "invalid-status",
    "user": "admin"
  }'

# Expected: 400, invalid status
```

**Non-existent component**
```bash
curl -X POST http://localhost:4000/api/changestatus \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "componentId": "507f1f77bcf86cd799439011",
    "newStatus": "2",
    "user": "admin"
  }'

# Expected: 404, component not found
```

### 6. Statistics and Reporting Tests

#### 6.1 Happy Path - Statistics
**Get dashboard stats**
```bash
curl -X GET http://localhost:4000/api/stats \
  -H "Authorization: Bearer $TOKEN"

# Expected: 200, stats object with:
# - inLavorazione: number
# - daSpedire: number  
# - verificatoPercentage: number
# - speditOggi: number
# - distribuzioneStati: object
```

#### 6.2 Edge Cases - Statistics
**Stats with empty database**
```bash
# After clearing all components
curl -X GET http://localhost:4000/api/stats \
  -H "Authorization: Bearer $TOKEN"

# Expected: 200, stats with zero values
```

### 7. File Management Tests

#### 7.1 Happy Path - File Operations
**Upload file**
```bash
# Create test file
echo "Test document content" > test-document.txt

curl -X POST http://localhost:4000/api/files/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "files=@test-document.txt" \
  -F "componentId=COMPONENT_ID"

# Expected: 200, file metadata object
```

**Download file**
```bash
curl -X GET http://localhost:4000/api/files/FILE_ID \
  -H "Authorization: Bearer $TOKEN" \
  -o downloaded-file.txt

# Expected: 200, file content downloaded
```

#### 7.2 Edge Cases - File Management
**Upload without file**
```bash
curl -X POST http://localhost:4000/api/files/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "componentId=COMPONENT_ID"

# Expected: 400, no file provided
```

**Download non-existent file**
```bash
curl -X GET http://localhost:4000/api/files/non-existent-id \
  -H "Authorization: Bearer $TOKEN"

# Expected: 404, file not found
```

### 8. Data Import/Export Tests

#### 8.1 Happy Path - Excel Operations
**Import Excel file**
```bash
# Create test Excel file or use existing one
curl -X POST http://localhost:4000/api/components/import-excel \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test-components.xlsx"

# Expected: 200, import summary with created commessa and components
```

**Export components to Excel**
```bash
curl -X GET http://localhost:4000/api/components/export-excel \
  -H "Authorization: Bearer $TOKEN" \
  -o export-components.xlsx

# Expected: 200, Excel file downloaded
```

#### 8.2 Edge Cases - Import/Export
**Import invalid Excel format**
```bash
echo "Not an Excel file" > fake.xlsx
curl -X POST http://localhost:4000/api/components/import-excel \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@fake.xlsx"

# Expected: 400, invalid file format
```

---

## 🎭 End-to-End Tests - User Workflows

### E2E Test 1: Complete Order Processing Workflow

**Scenario**: Full lifecycle from order creation to component shipment

**Steps**:
1. **Admin Login and Setup**
   - Navigate to login page
   - Login with admin credentials
   - Verify dashboard loads correctly

2. **Create New Order (Commessa)**
   - Navigate to /commesse
   - Click "Create New Order"
   - Fill form: code="E2E-001", name="E2E Test Order"
   - Save and verify creation

3. **Add Components to Order**
   - Navigate to order detail page
   - Add component: name="Gear Shaft", barcode="GS001"
   - Set treatments: ["machining", "heat treatment", "painting"]
   - Verify component appears in order list

4. **Process Component Through Workflow**
   - Change status to "2 - Internal Production"
   - Verify status change and history entry
   - Change to "3 - Built"
   - Move through treatment stages:
     - "4:machining:PREP" → "4:machining:IN" → "4:machining:ARR"
     - "4:heat treatment:PREP" → "4:heat treatment:IN" → "4:heat treatment:ARR"
     - "4:painting:PREP" → "4:painting:IN" → "4:painting:ARR"
   - Verify auto-transition to "5 - Ready for Delivery"

5. **Ship Component**
   - Add DDT information: number="DDT-001", date=today
   - Change status to "6 - Shipped"
   - Verify final status and complete history

6. **Verify Dashboard Statistics**
   - Return to dashboard
   - Verify statistics reflect processed component
   - Check "Shipped Today" count increased

**Expected Results**:
- Order created successfully
- Component processed through all stages
- Status transitions work correctly
- Auto-transition triggers appropriately
- Dashboard statistics update in real-time
- Complete audit trail in component history

### E2E Test 2: Multi-User Order Management

**Scenario**: Multiple users working on same order with different permissions

**Steps**:
1. **Admin Setup**
   - Login as admin
   - Create new user: username="operator1", profile="UFF"
   - Create order "E2E-002" with 3 components

2. **Operator Workflow**
   - Logout admin, login as operator1
   - Verify cannot access user management
   - Navigate to order E2E-002
   - Process components through production stages
   - Verify all status changes logged with correct user

3. **Admin Oversight**
   - Switch back to admin
   - Review order progress
   - Check component histories show correct users
   - Verify operator cannot delete/modify users
   - Process final shipping as admin

**Expected Results**:
- Role-based access control works correctly
- User attribution in component history
- Admin retains full access
- Operator limited to operational functions

### E2E Test 3: Bulk Operations and Excel Integration

**Scenario**: Large order processing with Excel import/export

**Steps**:
1. **Prepare Excel File**
   - Create Excel with 50+ components
   - Include various treatments and specifications
   - Proper column format as per system requirements

2. **Import Process**
   - Login and navigate to import function
   - Upload Excel file
   - Verify import success message
   - Check created order and all components

3. **Bulk Status Changes**
   - Select multiple components
   - Apply bulk status change to "2 - Production"
   - Verify all components updated correctly

4. **Progress Monitoring**
   - Use search and filters to find specific components
   - Check progress statistics in dashboard
   - Verify treatment tracking across multiple components

5. **Export and Verification**
   - Export current state to Excel
   - Download and verify data completeness
   - Compare with original import data

**Expected Results**:
- Excel import processes correctly
- Bulk operations work efficiently
- Search/filter functions perform well with large dataset
- Export maintains data integrity
- System performance acceptable with 50+ components

### E2E Test 4: Error Handling and Recovery

**Scenario**: Testing system resilience to various error conditions

**Steps**:
1. **Network Interruption Simulation**
   - Start component creation process
   - Simulate network disconnect during save
   - Verify appropriate error message
   - Verify data integrity after reconnection

2. **Invalid Data Handling**
   - Attempt to create duplicate order codes
   - Try invalid status transitions
   - Upload corrupted Excel files
   - Verify user-friendly error messages

3. **Session Management**
   - Let session expire during operation
   - Verify automatic logout
   - Verify redirect to login page
   - Resume work after re-login

4. **Browser Compatibility**
   - Test in different browsers (Chrome, Firefox, Safari)
   - Verify responsive layout on different screen sizes
   - Test with JavaScript disabled (graceful degradation)

**Expected Results**:
- Graceful error handling with informative messages
- Data integrity maintained during errors
- Session management works correctly
- Cross-browser compatibility
- Responsive design functions properly

### E2E Test 5: Performance and Scalability

**Scenario**: System behavior under realistic load conditions

**Steps**:
1. **Data Volume Testing**
   - Create 10 orders with 100 components each
   - Monitor page load times
   - Test search performance with large dataset
   - Verify pagination works smoothly

2. **Concurrent User Simulation**
   - Multiple browser sessions (5+)
   - Simultaneous operations on same components
   - Verify data consistency
   - Check for race conditions

3. **Database Operations**
   - Perform complex searches across large dataset
   - Generate statistics with large data volume
   - Test export operations with 1000+ components
   - Monitor response times

**Expected Results**:
- Page loads within acceptable time limits (<3 seconds)
- Search results return quickly (<1 second)
- No data corruption with concurrent access
- Export operations complete successfully
- System remains responsive under load

---

## 🚨 Critical Test Scenarios

### Security Testing

**Authentication Bypass Attempts**
```bash
# Test various bypass methods
curl -X GET http://localhost:4000/api/utenti \
  -H "Authorization: Bearer invalid-token"

curl -X GET http://localhost:4000/api/utenti \
  -H "Authorization: invalidformat"

curl -X GET http://localhost:4000/api/utenti
# All should return 401/403
```

**SQL/NoSQL Injection Attempts**
```bash
# Test injection in search
curl -X GET "http://localhost:4000/api/components?q='; DROP TABLE components; --" \
  -H "Authorization: Bearer $TOKEN"

# Test injection in component creation
curl -X POST http://localhost:4000/api/components \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name": "test\"; db.components.drop(); //", "commessaId": "validid"}'

# Expected: Safe handling, no database manipulation
```

### Data Integrity Testing

**Concurrent Status Changes**
```bash
# Simulate race condition: two users changing same component status
# Process 1:
curl -X POST http://localhost:4000/api/changestatus \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN1" \
  -d '{"componentId": "COMPONENT_ID", "newStatus": "2", "user": "user1"}' &

# Process 2 (immediate):
curl -X POST http://localhost:4000/api/changestatus \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN2" \
  -d '{"componentId": "COMPONENT_ID", "newStatus": "3", "user": "user2"}' &

# Expected: Both operations should succeed with proper sequencing in history
```

### Boundary Testing

**Maximum Data Limits**
```bash
# Test very long strings
LONG_STRING=$(python3 -c "print('A' * 10000)")
curl -X POST http://localhost:4000/api/commesse \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"code\": \"TEST\", \"name\": \"$LONG_STRING\"}"

# Expected: Appropriate validation/truncation
```

**Edge Case Dates**
```bash
# Test edge case dates
curl -X POST http://localhost:4000/api/changestatus \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "componentId": "COMPONENT_ID",
    "newStatus": "6",
    "ddtDate": "1900-01-01T00:00:00Z"
  }'

# Expected: Reasonable date validation
```

---

## 📊 Test Execution Framework

### Unit Test Execution Scripts

**Backend API Test Suite** (`tests/unit/api-tests.sh`):
```bash
#!/bin/bash
set -e

# Configuration
BASE_URL="http://localhost:4000"
ADMIN_USER="admin"
ADMIN_PASS="changeme"

# Cleanup function
cleanup() {
    rm -f cookies.txt test-*.txt test-*.xlsx
}
trap cleanup EXIT

# Test execution with reporting
echo "Starting API Unit Tests..."

# Authentication tests
echo "Testing Authentication..."
./test-auth.sh

# User management tests  
echo "Testing User Management..."
./test-users.sh

# Commesse tests
echo "Testing Commesse Management..."
./test-commesse.sh

# Component tests
echo "Testing Component Management..."
./test-components.sh

# Status change tests
echo "Testing Status Changes..."
./test-status-changes.sh

# Statistics tests
echo "Testing Statistics..."
./test-stats.sh

echo "All Unit Tests Completed!"
```

### E2E Test Execution Framework

**Playwright/Cypress Configuration** (`tests/e2e/config.js`):
```javascript
module.exports = {
  baseUrl: process.env.E2E_BASE_URL || 'http://localhost:5173',
  apiUrl: process.env.E2E_API_URL || 'http://localhost:4000',
  testTimeout: 30000,
  retries: 2,
  users: {
    admin: { username: 'admin', password: 'changeme' },
    operator: { username: 'operator1', password: 'testpass123' }
  },
  testData: {
    sampleOrder: {
      code: 'E2E-TEST-001',
      name: 'E2E Test Order',
      components: [
        { name: 'Component 1', barcode: 'BC001', treatments: ['painting'] },
        { name: 'Component 2', barcode: 'BC002', treatments: ['machining', 'painting'] }
      ]
    }
  }
};
```

### Test Data Management

**Test Database Setup** (`tests/setup/database.js`):
```javascript
const mongoose = require('mongoose');
const User = require('../../omega-app/backend/models/User');
const bcrypt = require('bcryptjs');

async function setupTestDatabase() {
  // Create admin user
  const adminHash = await bcrypt.hash('changeme', 10);
  await User.create({
    username: 'admin',
    password: adminHash,
    profilo: 'ADMIN',
    email: 'admin@test.com'
  });

  // Create test operator
  const operatorHash = await bcrypt.hash('testpass123', 10);
  await User.create({
    username: 'operator1', 
    password: operatorHash,
    profilo: 'UFF',
    email: 'operator@test.com'
  });

  console.log('Test database setup completed');
}

module.exports = { setupTestDatabase };
```

### Test Reporting

**Test Results Aggregation** (`tests/utils/reporter.js`):
```javascript
class TestReporter {
  constructor() {
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      failures: []
    };
  }

  recordTest(name, status, error = null) {
    this.results.total++;
    this.results[status]++;
    
    if (status === 'failed') {
      this.results.failures.push({ name, error });
    }
  }

  generateReport() {
    const { total, passed, failed, skipped, failures } = this.results;
    const passRate = ((passed / total) * 100).toFixed(2);
    
    console.log(`\n========= TEST RESULTS =========`);
    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed} (${passRate}%)`);
    console.log(`Failed: ${failed}`);
    console.log(`Skipped: ${skipped}`);
    
    if (failures.length > 0) {
      console.log(`\n========= FAILURES =========`);
      failures.forEach(failure => {
        console.log(`❌ ${failure.name}`);
        console.log(`   Error: ${failure.error}`);
      });
    }
    
    return this.results;
  }
}

module.exports = TestReporter;
```

---

## 🎯 Test Coverage Goals

### Functional Coverage Targets
- **Authentication**: 100% - Critical security component
- **User Management**: 95% - Admin functionality
- **Order/Component CRUD**: 90% - Core business logic
- **Status Workflow**: 100% - Critical business process
- **Statistics**: 85% - Reporting functionality
- **File Management**: 80% - Supporting feature

### Test Categories Coverage
- **Happy Path**: 100% of primary user flows
- **Edge Cases**: 80% of identified edge scenarios
- **Error Handling**: 90% of error conditions
- **Security**: 100% of authentication/authorization paths
- **Performance**: Key scenarios under realistic load

### Risk-Based Testing Priority
1. **High Risk**: Authentication, Status Changes, Data Integrity
2. **Medium Risk**: CRUD Operations, File Upload, Statistics  
3. **Low Risk**: UI Components, Non-critical Features

---

## 📝 Test Execution Checklist

### Pre-Test Setup
- [ ] Test environment configured and running
- [ ] Test database initialized with clean state
- [ ] All dependencies installed and services started
- [ ] Test credentials and data prepared
- [ ] Baseline performance metrics recorded

### Unit Test Execution
- [ ] Authentication and authorization tests
- [ ] User management API tests
- [ ] Commesse CRUD tests
- [ ] Component management tests
- [ ] Status change workflow tests
- [ ] Statistics and reporting tests
- [ ] File management tests
- [ ] Data import/export tests

### E2E Test Execution  
- [ ] Complete order processing workflow
- [ ] Multi-user collaboration scenarios
- [ ] Bulk operations and Excel integration
- [ ] Error handling and recovery testing
- [ ] Performance and scalability testing

### Post-Test Validation
- [ ] All test results documented
- [ ] Failure analysis completed
- [ ] Performance metrics within acceptable ranges
- [ ] Test environment cleaned up
- [ ] Test report generated and shared

---

Questo piano di test fornisce una copertura completa del sistema Omega Components Tracker, garantendo che tutte le funzionalità critiche siano validate sia individualmente che nei flussi di utilizzo reali.
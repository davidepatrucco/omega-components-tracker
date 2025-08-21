# Omega Components Tracker - Testing Framework

## Overview

This repository contains a comprehensive testing framework for the Omega Components Tracker system, including both unit tests and end-to-end tests.

## Test Structure

```
tests/
├── unit/                 # Unit tests (curl-based API tests)
│   ├── run-tests.sh     # Main test runner
│   ├── test-auth.sh     # Authentication tests
│   ├── test-users.sh    # User management tests
│   ├── test-commesse.sh # Order management tests
│   ├── test-components.sh # Component management tests
│   ├── test-status-changes.sh # Status workflow tests
│   └── test-stats.sh    # Statistics API tests
└── e2e/                 # End-to-end tests
    ├── config.env       # Test configuration
    └── run-e2e-tests.sh # E2E test scenarios
```

## Running Tests

### Prerequisites

1. **Backend Server Running**: Ensure the Omega backend is running on `http://localhost:4000`
2. **Frontend Server Running** (for E2E): Ensure the frontend is running on `http://localhost:5173`
3. **Database Access**: MongoDB instance must be accessible
4. **Admin User**: Default admin user (`admin`/`changeme`) must exist

### Unit Tests

Run all unit tests:
```bash
cd tests/unit
./run-tests.sh
```

Run specific test suites:
```bash
cd tests/unit
./test-auth.sh        # Authentication tests only
./test-users.sh       # User management tests only  
./test-commesse.sh    # Order management tests only
./test-components.sh  # Component management tests only
./test-status-changes.sh # Status workflow tests only
./test-stats.sh       # Statistics tests only
```

### End-to-End Tests

Run E2E tests:
```bash
cd tests/e2e
./run-e2e-tests.sh
```

## Test Coverage

### Unit Tests Coverage

#### Authentication & Authorization (test-auth.sh)
- ✅ Valid login with correct credentials
- ✅ Invalid login attempts (wrong password, missing credentials)
- ✅ Token refresh functionality
- ✅ Logout and token revocation
- ✅ Protected endpoint access control
- ✅ Invalid token handling

#### User Management (test-users.sh) - Admin Only
- ✅ List all users
- ✅ Create new user with validation
- ✅ Update existing user
- ✅ Delete user (with admin self-deletion prevention)
- ✅ Duplicate username handling
- ✅ Role-based access control (non-admin cannot access)
- ✅ Missing required fields validation

#### Order Management (test-commesse.sh)
- ✅ List orders
- ✅ Create new order
- ✅ Get specific order details
- ✅ Update order
- ✅ Delete order
- ✅ Duplicate order code handling
- ✅ Missing required fields validation
- ✅ Invalid ID format handling

#### Component Management (test-components.sh)
- ✅ List components with pagination
- ✅ Create new component
- ✅ Get specific component
- ✅ Update component
- ✅ Soft delete component
- ✅ Search components by name
- ✅ Filter components by order
- ✅ Get components by order ID
- ✅ Pagination edge cases
- ✅ Validation error handling

#### Status Workflow (test-status-changes.sh)
- ✅ Basic status transitions (1→2→3)
- ✅ Treatment workflow (PREP→IN→ARR)
- ✅ Multiple treatment processing
- ✅ Auto-transition to "Ready for Delivery" 
- ✅ Shipping with DDT information
- ✅ Invalid status transition handling
- ✅ Component history recording
- ✅ Missing required fields validation

#### Statistics & Reporting (test-stats.sh)
- ✅ Dashboard statistics retrieval
- ✅ Statistics data structure validation
- ✅ Real-time statistics updates
- ✅ Performance testing (response time)
- ✅ Multiple concurrent requests
- ✅ Health check endpoint

### End-to-End Tests Coverage

#### Complete Order Processing Workflow
- ✅ Admin authentication
- ✅ Order creation
- ✅ Component addition to order
- ✅ Full production workflow (1→2→3→treatments→5→6)
- ✅ Treatment processing through all phases
- ✅ Auto-transition verification
- ✅ Shipping with DDT
- ✅ Dashboard statistics update verification
- ✅ Complete component history validation

#### Multi-User Workflow
- ✅ Admin user creation and management
- ✅ Regular user authentication
- ✅ Role-based access control verification
- ✅ User attribution in component history
- ✅ Operational access for regular users

#### Bulk Operations Workflow
- ✅ Bulk order and component creation
- ✅ Search and filter functionality with large datasets
- ✅ Pagination with multiple components
- ✅ Bulk status change simulation
- ✅ System performance under load

## Test Data

### Test Credentials
- **Admin**: username=`admin`, password=`changeme`
- **Test User**: username=`testuser`, password=`testpass123`
- **E2E Operator**: username=`operator_e2e`, password=`operator123`

### Test Objects
- **Test Orders**: `TEST-001`, `COMP-TEST`, `E2E-TEST-001`, `BULK-E2E`
- **Test Components**: Various components with barcodes `BC001`, `STATUS001`, `E2E001`, etc.
- **Test Treatments**: `verniciatura`, `assemblaggio`, `machining`, `heat_treatment`, `painting`

## Expected Results

### Unit Tests
- **Total Tests**: ~80+ individual test cases
- **Expected Pass Rate**: 95%+ (some tests may fail due to environment)
- **Test Duration**: ~2-3 minutes for full suite

### E2E Tests  
- **Total Workflows**: 3 major workflow scenarios
- **Expected Pass Rate**: 100% in controlled environment
- **Test Duration**: ~1-2 minutes for all scenarios

## Troubleshooting

### Common Issues

**Server Not Running**
```
[FAIL] Server failed to start within 30 seconds
```
Solution: Ensure backend server is running on port 4000

**Authentication Failure**
```
[FAIL] Admin login failed
```
Solution: Verify admin user exists with correct credentials

**Database Connection Issues**
```
[FAIL] Error creating/updating resources
```
Solution: Check MongoDB connection and database permissions

**Port Conflicts**
```
[FAIL] Frontend/Backend not accessible
```
Solution: Verify ports 4000 (backend) and 5173 (frontend) are available

### Test Environment Reset

To reset test environment:
```bash
# Clear test data from database
# (This varies depending on your database setup)

# Restart services
# Backend: npm run dev in omega-app/backend
# Frontend: npm run dev in omega-app/frontend
```

## Test Development

### Adding New Unit Tests

1. Create new test function in appropriate test file
2. Follow naming convention: `test_feature_scenario`
3. Use `run_test` helper function for consistent output
4. Include both happy path and edge cases

Example:
```bash
# In test-example.sh
test_new_feature() {
    run_test "Feature description" "200" \
        "curl -s -w '\n%{http_code}' -X GET '$BASE_URL/api/new-endpoint' \
         -H 'Authorization: Bearer $TOKEN'"
}
```

### Adding New E2E Tests

1. Add new test function to `run-e2e-tests.sh`
2. Follow workflow pattern: setup → execute → verify → cleanup
3. Use logging functions for consistent output
4. Include error handling and cleanup

## Documentation

- **System Documentation**: `docs/system_functionalities.md`
- **Test Plan**: `docs/test_plan.md`
- **API Documentation**: `omega-app/docs/api.md`

## Contributing

When adding new features:
1. Update system documentation
2. Add corresponding unit tests
3. Include E2E test scenarios if applicable
4. Update test plan documentation
5. Verify all tests pass before submitting

## Notes

- Tests use curl for API calls to ensure portability
- E2E tests focus on API-driven workflows due to environment constraints
- All tests include cleanup to prevent data pollution
- Test data is isolated using specific prefixes (TEST-, E2E-, etc.)
- Performance benchmarks are included where applicable
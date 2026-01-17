# Implementation Plan: Shared Reports Access Fix

## Overview

This implementation plan addresses the 403 "Access denied" errors in shared reports by implementing robust access validation, consistent data handling, and comprehensive error reporting. The approach focuses on fixing the core authorization logic while maintaining backward compatibility.

## Tasks

- [ ] 1. Create utility functions for consistent data handling
  - Create user ID normalization function to handle string/numeric formats
  - Create shared report metadata validation function
  - Create correlation ID generation for request tracking
  - _Requirements: 2.5, 7.2, 6.5_

- [ ] 1.1 Write property test for user ID normalization
  - **Property 5: Authorization Consistency**
  - **Validates: Requirements 2.1, 2.5**

- [ ] 1.2 Write property test for metadata validation
  - **Property 21: Data Format Consistency**
  - **Validates: Requirements 7.2**

- [ ] 2. Fix shared reports access validation endpoint
  - Update `/api/reports/shared/:reportId` endpoint with robust access checking
  - Implement comprehensive debug logging for troubleshooting
  - Add proper error handling with specific error messages
  - _Requirements: 2.1, 2.2, 2.4, 6.1, 6.2_

- [ ] 2.1 Write property test for access validation
  - **Property 5: Authorization Consistency**
  - **Validates: Requirements 2.1, 2.5**

- [ ] 2.2 Write property test for expiration checking
  - **Property 6: Expiration Enforcement**
  - **Validates: Requirements 2.2**

- [ ] 2.3 Write unit tests for error message differentiation
  - Test different failure scenarios return distinct error messages
  - _Requirements: 6.3_

- [ ] 3. Fix shared reports listing endpoint
  - Update `/api/reports/shared` endpoint to properly filter by recipient
  - Implement consistent notification querying across endpoints
  - Add proper sorting and metadata handling
  - _Requirements: 5.1, 5.2, 5.3, 5.5_

- [ ] 3.1 Write property test for list filtering
  - **Property 13: List Filtering Accuracy**
  - **Validates: Requirements 5.1**

- [ ] 3.2 Write property test for sort order
  - **Property 16: Sort Order Consistency**
  - **Validates: Requirements 5.5**

- [ ] 4. Fix shared reports download endpoint
  - Update `/api/reports/shared/:reportId/download` endpoint with same access logic
  - Ensure consistent permission checking between view and download
  - Implement proper file naming conventions
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 4.1 Write property test for download permissions
  - **Property 11: Download Permission Consistency**
  - **Validates: Requirements 4.3**

- [ ] 4.2 Write property test for file naming
  - **Property 12: File Naming Convention**
  - **Validates: Requirements 4.2**

- [ ] 5. Checkpoint - Test basic access functionality
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Implement enhanced error handling and logging
  - Add structured error responses with correlation IDs
  - Implement comprehensive audit logging for all access attempts
  - Add debug mode with detailed validation step logging
  - _Requirements: 6.1, 6.2, 6.3, 6.5_

- [ ] 6.1 Write property test for audit logging
  - **Property 17: Access Logging Completeness**
  - **Validates: Requirements 6.1**

- [ ] 6.2 Write property test for correlation ID consistency
  - **Property 20: Correlation ID Consistency**
  - **Validates: Requirements 6.5**

- [ ] 7. Implement report generation with proper permissions
  - Update report generation to respect original sharer's permissions
  - Ensure consistent data generation across multiple accesses
  - Add proper metadata inclusion in responses
  - _Requirements: 3.1, 3.2, 3.3_

- [ ] 7.1 Write property test for data generation consistency
  - **Property 8: Report Data Generation Consistency**
  - **Validates: Requirements 3.1**

- [ ] 7.2 Write property test for permission inheritance
  - **Property 10: Permission Inheritance**
  - **Validates: Requirements 3.3**

- [ ] 8. Add read status tracking and audit trails
  - Implement read status updates when reports are accessed
  - Add comprehensive audit trail for all shared report operations
  - Ensure proper handling of deactivated users
  - _Requirements: 2.3, 3.5, 7.4_

- [ ] 8.1 Write property test for read status tracking
  - **Property 7: Read Status Tracking**
  - **Validates: Requirements 2.3**

- [ ] 8.2 Write property test for deactivated user handling
  - **Property 23: Deactivated User Handling**
  - **Validates: Requirements 7.4**

- [ ] 9. Implement share creation validation improvements
  - Add proper validation for share creation requests
  - Ensure unique access token generation
  - Implement complete notification creation for all recipients
  - _Requirements: 1.1, 1.2, 1.3, 1.5_

- [ ] 9.1 Write property test for share creation consistency
  - **Property 1: Share Creation Consistency**
  - **Validates: Requirements 1.1, 1.4, 7.1**

- [ ] 9.2 Write property test for access token uniqueness
  - **Property 2: Access Token Uniqueness**
  - **Validates: Requirements 1.2**

- [ ] 9.3 Write property test for notification completeness
  - **Property 3: Notification Creation Completeness**
  - **Validates: Requirements 1.3**

- [ ] 10. Add performance optimizations and caching
  - Implement metadata caching for frequently accessed reports
  - Add database query optimizations
  - Ensure proper handling of concurrent access
  - _Requirements: 8.5_

- [ ] 10.1 Write property test for caching consistency
  - **Property 24: Caching Consistency**
  - **Validates: Requirements 8.5**

- [ ] 11. Final integration and testing
  - Test complete end-to-end shared reports workflow
  - Verify all error scenarios work correctly
  - Ensure backward compatibility with existing shared reports
  - _Requirements: All_

- [ ] 11.1 Write integration tests for complete workflow
  - Test share creation → notification → access → download flow
  - Test error scenarios and edge cases

- [ ] 12. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Each task references specific requirements for traceability
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Focus on fixing the core 403 error first, then add enhancements
- Maintain backward compatibility throughout implementation
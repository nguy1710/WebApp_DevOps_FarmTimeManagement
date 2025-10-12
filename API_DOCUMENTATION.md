# 🌾 Farm Time Management - API Documentation

## 📋 Table of Contents
- [Overview](#overview)
- [Authentication](#authentication)
- [Base URL](#base-url)
- [Common Response Codes](#common-response-codes)
- [API Endpoints](#api-endpoints)
  - [1. Staffs API](#1-staffs-api)
  - [2. Biometrics API](#2-biometrics-api)
  - [3. Devices API](#3-devices-api)
  - [4. Events API](#4-events-api)
  - [5. Histories API](#5-histories-api)
  - [6. Roster (WorkSchedule) API](#6-roster-workschedule-api)
  - [7. PayRates API](#7-payrates-api)
  - [8. PayRoll API](#8-payroll-api)

---

## Overview

This API provides comprehensive farm time management functionality including staff management, biometric authentication, device tracking, event logging, roster scheduling, pay rate management, and payroll calculations.

**Version:** 1.0  
**Framework:** ASP.NET Core 8.0  
**Database:** SQL Server

---

## Authentication

Most endpoints require JWT Bearer token authentication.

### How to Authenticate:
1. Login via `POST /api/staffs/login` to get a token
2. Include the token in subsequent requests:

```
Authorization: Bearer <your_token_here>
```

### Authorization Levels:
- **Public**: No authentication required
- **Authenticated**: Requires valid JWT token
- **Admin Only**: Requires JWT token with Admin role

---

## Base URL

```
http://localhost:5000/api
```

Or your deployed URL.

---

## Common Response Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict (e.g., overlapping shifts) |
| 500 | Internal Server Error |

---

## API Endpoints

## 1. Staffs API

Base path: `/api/staffs`

### 1.1 Login

**POST** `/api/staffs/login`

Login and get JWT token. Only Admin users can login.

**Request Body:**
```json
{
  "Email": "admin@adelaidefarm.com",
  "Password": "admin"
}
```

**Response (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "staff": {
    "staffId": 1,
    "firstName": "Elon",
    "lastName": "Musk",
    "email": "admin@adelaidefarm.com",
    "role": "Admin",
    "standardPayRate": 35.00
  }
}
```

**Error (400 Bad Request):**
```json
{
  "message": "Wrong username or password"
}
```

---

### 1.2 Get All Staffs

**GET** `/api/staffs`

Get all staff members.

**Response (200 OK):**
```json
[
  {
    "staffId": 1,
    "firstName": "Elon",
    "lastName": "Musk",
    "email": "admin@adelaidefarm.com",
    "phone": "0988136755",
    "address": "12 King William St, Adelaide SA 5000",
    "contractType": "Full-time",
    "role": "Admin",
    "standardPayRate": 35.00
  }
]
```

---

### 1.3 Get Staff by ID

**GET** `/api/staffs/{id}`

Get specific staff member by ID.

**Example:** `GET /api/staffs/1`

**Response (200 OK):**
```json
{
  "staffId": 1,
  "firstName": "Elon",
  "lastName": "Musk",
  "email": "admin@adelaidefarm.com",
  "role": "Admin"
}
```

---

### 1.4 Query Staffs (Custom SQL)

**POST** `/api/staffs/query`

Execute custom SQL query for advanced filtering.

**Request Body:**
```json
"SELECT * FROM Staff WHERE Role = 'Worker'"
```

**Response (200 OK):**
```json
[
  {
    "staffId": 2,
    "firstName": "John",
    "lastName": "Smith",
    "role": "Worker"
  }
]
```

---

### 1.5 Create Staff

**POST** `/api/staffs`  
**Authorization:** Bearer Token (Admin only)

Create a new staff member.

**Request Body:**
```json
{
  "firstName": "Jane",
  "lastName": "Doe",
  "email": "jane.doe@adelaidefarm.com",
  "phone": "0412345678",
  "password": "password123",
  "address": "10 Main St, Adelaide SA 5000",
  "contractType": "Full-time",
  "role": "Worker",
  "standardPayRate": 25.00
}
```

**Response (200 OK):**
```json
{
  "staffId": 3,
  "firstName": "Jane",
  "lastName": "Doe",
  "email": "jane.doe@adelaidefarm.com"
}
```

**Error (400 Bad Request):**
```json
{
  "message": "This email was registered before"
}
```

---

### 1.6 Update Staff

**PUT** `/api/staffs/{id}`  
**Authorization:** Bearer Token (Admin only)

Update existing staff member. Password will be preserved (not updated).

**Example:** `PUT /api/staffs/2`

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Smith",
  "email": "john.updated@adelaidefarm.com",
  "phone": "0412999888",
  "address": "Updated Address",
  "contractType": "Part-time",
  "role": "Worker",
  "standardPayRate": 30.00
}
```

---

### 1.7 Change Password

**PUT** `/api/staffs/{id}/changepassword`  
**Authorization:** Bearer Token (Admin only)

Change staff password.

**Request Body:**
```json
{
  "password": "newPassword123"
}
```

---

### 1.8 Delete Staff

**DELETE** `/api/staffs/{id}`  
**Authorization:** Bearer Token (Admin only)

Delete a staff member.

**Example:** `DELETE /api/staffs/3`

---

## 2. Biometrics API

Base path: `/api/biometrics`

### 2.1 Get All Biometrics

**GET** `/api/biometrics`  
**Authorization:** Public (AllowAnonymous)

Get all biometric records.

**Response (200 OK):**
```json
[
  {
    "biometricId": 1,
    "staffId": 2,
    "biometricType": "Fingerprint",
    "data": "BASE64_ENCODED_DATA"
  }
]
```

---

### 2.2 Get Biometric by ID

**GET** `/api/biometrics/{id}`  
**Authorization:** Public

Get specific biometric record.

**Example:** `GET /api/biometrics/1`

---

### 2.3 Get Staff from Card Scan

**GET** `/api/biometrics/scanfromcard/{result}`  
**Authorization:** Public

Get staff information from biometric card scan result.

**Example:** `GET /api/biometrics/scanfromcard/ABC123XYZ`

**Response (200 OK):**
```json
{
  "staffId": 2,
  "firstName": "John",
  "lastName": "Smith",
  "role": "Worker"
}
```

---

### 2.4 Create Biometric

**POST** `/api/biometrics`

Register new biometric data for a staff member.

**Request Body:**
```json
{
  "staffId": 2,
  "biometricType": "Fingerprint",
  "data": "BASE64_ENCODED_FINGERPRINT_DATA"
}
```

---

### 2.5 Update Biometric

**PUT** `/api/biometrics/{id}`

Update biometric record.

---

### 2.6 Delete Biometric

**DELETE** `/api/biometrics/{id}`

Delete biometric record.

---

## 3. Devices API

Base path: `/api/devices`

### 3.1 Get All Devices

**GET** `/api/devices`

Get all registered devices.

**Response (200 OK):**
```json
[
  {
    "deviceId": 1,
    "deviceName": "Main Gate Scanner",
    "location": "Main Entrance",
    "status": "Active"
  }
]
```

---

### 3.2 Get Device by ID

**GET** `/api/devices/{id}`

**Example:** `GET /api/devices/1`

---

### 3.3 Create Device

**POST** `/api/devices`  
**Authorization:** Bearer Token (Admin only)

Register a new device.

**Request Body:**
```json
{
  "deviceName": "Barn Scanner",
  "location": "North Barn",
  "status": "Active"
}
```

---

### 3.4 Update Device

**PUT** `/api/devices/{id}`  
**Authorization:** Bearer Token (Admin only)

Update device information.

---

### 3.5 Delete Device

**DELETE** `/api/devices/{id}`  
**Authorization:** Bearer Token (Admin only)

Remove a device.

---

## 4. Events API

Base path: `/api/events`

Events track clock in/out activities.

### 4.1 Query Events (Custom SQL)

**POST** `/api/events/query`

Execute custom SQL query for events.

**Request Body:**
```json
"SELECT * FROM Event WHERE StaffId = 2 AND EventType = 'Clock in'"
```

---

### 4.2 Get Event by ID

**GET** `/api/events/{id}`

**Example:** `GET /api/events/1`

**Response (200 OK):**
```json
{
  "eventId": 1,
  "timestamp": "2024-12-30T08:00:00",
  "staffId": 2,
  "deviceId": 1,
  "eventType": "Clock in",
  "reason": null
}
```

---

### 4.3 Create Event

**POST** `/api/events`

Create a clock in/out event.

**Request Body:**
```json
{
  "timestamp": "2024-12-30T08:00:00",
  "staffId": 2,
  "deviceId": 1,
  "eventType": "Clock in",
  "reason": null
}
```

**Event Types:**
- `Clock in`
- `Clock out`

---

### 4.4 Update Event

**PUT** `/api/events/{id}`  
**Authorization:** Bearer Token (Admin only)

Update an event record.

---

### 4.5 Delete Event

**DELETE** `/api/events/{id}`  
**Authorization:** Bearer Token (Admin only)

Delete an event.

---

## 5. Histories API

Base path: `/api/histories`

Histories track all system actions for audit purposes.

### 5.1 Get All Histories

**GET** `/api/histories`

Get all history logs.

**Response (200 OK):**
```json
[
  {
    "historyId": 1,
    "timestamp": "2024-12-30T08:00:00",
    "action": "Login",
    "actor": "admin@adelaidefarm.com",
    "result": "Succeed",
    "details": "user Elon Musk logged in",
    "ipAddress": "192.168.1.100"
  }
]
```

---

### 5.2 Query Histories (Custom SQL)

**POST** `/api/histories/query`

Execute custom SQL query.

**Request Body:**
```json
"SELECT * FROM History WHERE Action = 'Login' AND Result = 'Failed'"
```

---

### 5.3 Delete History

**DELETE** `/api/histories/{id}`  
**Authorization:** Bearer Token (Admin only)

Delete a history record.

---

## 6. Roster (WorkSchedule) API

Base path: `/api/roster`

Manage staff work schedules and shifts.

### 6.1 Get All Schedules

**GET** `/api/roster`

Get all work schedules.

**Response (200 OK):**
```json
[
  {
    "scheduleId": 1,
    "staffId": 2,
    "startTime": "2024-12-30T08:00:00",
    "endTime": "2024-12-30T16:00:00",
    "hours": 8.0
  }
]
```

---

### 6.2 Get Schedule by ID

**GET** `/api/roster/{id}`

**Example:** `GET /api/roster/1`

---

### 6.3 Get Schedules by Staff ID

**GET** `/api/roster/staff/{staffId}`

Get all schedules for a specific staff member.

**Example:** `GET /api/roster/staff/2`

---

### 6.4 Assign Shift

**POST** `/api/roster/assign`  
**Authorization:** Bearer Token (Admin only)

Assign a new shift to staff member. Automatically:
- Calculates hours
- Validates for overlapping shifts
- Logs action to history

**Request Body:**
```json
{
  "StaffId": 2,
  "StartTime": "2024-12-30T08:00:00",
  "EndTime": "2024-12-30T16:00:00"
}
```

**Response (200 OK):**
```json
{
  "scheduleId": 1,
  "staffId": 2,
  "startTime": "2024-12-30T08:00:00",
  "endTime": "2024-12-30T16:00:00",
  "hours": 8.0
}
```

**Error (409 Conflict):**
```json
{
  "message": "This shift overlaps with an existing schedule for this staff member"
}
```

---

### 6.5 Create Schedule (Alternative)

**POST** `/api/roster`  
**Authorization:** Bearer Token (Admin only)

Alternative endpoint to create schedule.

**Request Body:**
```json
{
  "staffId": 2,
  "startTime": "2024-12-30T08:00:00",
  "endTime": "2024-12-30T16:00:00"
}
```

---

### 6.6 Update Schedule

**PUT** `/api/roster/{id}`  
**Authorization:** Bearer Token (Admin only)

Update existing schedule.

**Example:** `PUT /api/roster/1`

**Request Body:**
```json
{
  "staffId": 2,
  "startTime": "2024-12-30T09:00:00",
  "endTime": "2024-12-30T17:00:00"
}
```

---

### 6.7 Delete Schedule

**DELETE** `/api/roster/{id}`  
**Authorization:** Bearer Token (Admin only)

Delete a schedule.

---

### 6.8 Validate Overlap

**POST** `/api/roster/validate-overlap`  
**Authorization:** Bearer Token

Check if a shift would overlap with existing schedules without creating it.

**Request Body:**
```json
{
  "StaffId": 2,
  "StartTime": "2024-12-30T08:00:00",
  "EndTime": "2024-12-30T16:00:00",
  "ExcludeScheduleId": 5
}
```

**Response (200 OK):**
```json
{
  "hasOverlap": false,
  "calculatedHours": 8.0,
  "message": "No overlap detected"
}
```

---

### 6.9 Calculate Hours

**POST** `/api/roster/calculate-hours`

Calculate hours between two timestamps.

**Request Body:**
```json
{
  "StartTime": "2024-12-30T08:00:00",
  "EndTime": "2024-12-30T16:00:00"
}
```

**Response (200 OK):**
```json
{
  "calculatedHours": 8.0,
  "startTime": "2024-12-30 08:00",
  "endTime": "2024-12-30 16:00"
}
```

---

## 7. PayRates API

Base path: `/api/payrates`

Manage staff pay rates based on Horticulture Award 2025.

### 7.1 Get Default Pay Rates

**GET** `/api/payrates/defaults`

Get default pay rates for all roles and contract types.

**Response (200 OK):**
```json
{
  "Worker": {
    "Full-time": {
      "standardRate": 25.00,
      "overtimeRate": 37.50,
      "weekendRate": 50.00
    },
    "Part-time": {
      "standardRate": 25.00,
      "overtimeRate": 37.50,
      "weekendRate": 50.00
    },
    "Casual": {
      "standardRate": 31.25,
      "overtimeRate": 46.87,
      "weekendRate": 62.50
    }
  },
  "Admin": {
    "Full-time": {
      "standardRate": 35.00,
      "overtimeRate": 52.50,
      "weekendRate": 70.00
    },
    "Part-time": {
      "standardRate": 35.00,
      "overtimeRate": 52.50,
      "weekendRate": 70.00
    },
    "Casual": {
      "standardRate": 43.75,
      "overtimeRate": 65.62,
      "weekendRate": 87.50
    }
  }
}
```

---

### 7.2 Update Staff Pay Rates

**PUT** `/api/payrates/staff/{id}/payrates`  
**Authorization:** Bearer Token (Admin only)

Update pay rates for a specific staff member.

**Example:** `PUT /api/payrates/staff/2/payrates`

**Request Body:**
```json
{
  "standardPayRate": 28.00,
  "overtimePayRate": 42.00
}
```

**Response (200 OK):**
```json
{
  "message": "Staff pay rates updated successfully",
  "staff": {
    "staffId": 2,
    "standardPayRate": 28.00
  }
}
```

---

### 7.3 Bulk Update Pay Rates by Role/Contract

**PUT** `/api/payrates/bulk/{role}/{contractType}`  
**Authorization:** Bearer Token (Admin only)

Update pay rates for all staff with specific role and contract type.

**Example:** `PUT /api/payrates/bulk/Worker/Full-time`

**Request Body:**
```json
{
  "standardPayRate": 26.00,
  "overtimePayRate": 39.00
}
```

**Response (200 OK):**
```json
{
  "message": "Successfully updated 5 staff members with role 'Worker' and contract type 'Full-time'",
  "staff": [...]
}
```

---

### 7.4 Initialize Default Pay Rates

**POST** `/api/payrates/initialize-defaults`  
**Authorization:** Bearer Token (Admin only)

Apply default Horticulture Award 2025 pay rates to all staff based on their role and contract type.

**Response (200 OK):**
```json
{
  "message": "Successfully updated 10 staff members with default Horticulture Award 2025 pay rates",
  "staff": [...]
}
```

---

## 8. PayRoll API

Base path: `/api/payroll`

Calculate comprehensive payroll including tax, PAYG, superannuation.

### 8.1 Calculate Payroll

**GET** `/api/payroll/calculate`

Calculate complete payroll for a staff member for a specific week.

**Query Parameters:**
- `staffId` (required): Staff member ID
- `mondayDate` (required): Any date in the week (format: yyyy-MM-dd)
- `isSpecialPayRate` (optional): Use default pay rate for role/contract (default: false)

**Example:** 
```
GET /api/payroll/calculate?staffId=2&mondayDate=2024-12-30&isSpecialPayRate=false
```

**Note:** The `mondayDate` parameter accepts ANY date in the week, and the system automatically calculates from the Monday of that week.

**Response (200 OK):**
```json
{
  "staffId": 2,
  "staffName": "John Smith",
  "weekStartDate": "2024-12-30T00:00:00",
  "totalHoursWorked": 43.5,
  "grossWeeklyPay": 1156.25,
  "annualIncome": 60125.00,
  "annualTax": 4538.75,
  "weeklyPAYG": 87.28,
  "netPay": 1068.97,
  "employerSuperannuation": 138.75
}
```

**Calculation Details:**

1. **Hours Calculation:**
   - Automatically finds Clock In/Out events for the week
   - Rounds to nearest 5 minutes
   - Deducts 30-minute break for shifts > 5 hours

2. **Pay Calculation:**
   - Regular hours: Up to 38 hours/week or 8 hours/day (whichever is less)
   - Daily overtime: Hours > 8/day @ 1.5x rate
   - Weekly overtime (first 2 hours): @ 1.5x rate
   - Weekly overtime (additional): @ 2.0x rate
   - Weekend hours: @ 2.0x rate

3. **Tax Calculation (Australian Resident Rates):**
   - $0 – $18,200: No tax
   - $18,201 – $45,000: 16% on excess
   - $45,001 – $135,000: $4,288 + 30% on excess
   - $135,001 – $190,000: $31,288 + 37% on excess
   - $190,001+: $51,738 + 45% on excess

4. **Superannuation:** 12% of gross pay

**Error (400 Bad Request):**
```json
{
  "message": "Staff ID must be greater than 0"
}
```

**Error (404 Not Found):**
```json
{
  "message": "Staff with ID 99 not found"
}
```

---

## 📝 Notes

### Password Hashing
- All passwords are hashed using SHA-256 before storage
- Default password for test accounts: `admin` (hashes to `8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918`)

### Phone Number Validation
- Format: 8-15 digits with optional + prefix
- Valid examples: `0412345678`, `+61412345678`

### Date Format
- Use ISO 8601 format: `yyyy-MM-ddTHH:mm:ss`
- Example: `2024-12-30T08:00:00`

### Overtime Rates
- Overtime rates are calculated dynamically (not stored in database)
- Daily overtime: 1.5x standard rate
- Weekly overtime (first 2 hours): 1.5x standard rate
- Weekly overtime (beyond 2 hours): 2.0x standard rate
- Weekend/Holiday: 2.0x standard rate

### Standard Hours Per Week
- Assumed to be 38 hours for all staff members

---

## 🧪 Testing

### Test Data (from SQL script)

**Staff 1 - Admin:**
- Email: `admin@adelaidefarm.com`
- Password: `admin`
- Role: Admin
- Standard Rate: $35.00/hour

**Staff 2 - Worker:**
- Email: `john.smith@adelaidefarm.com`
- Password: `admin`
- Role: Worker
- Standard Rate: $25.00/hour
- Test Week: 2024-12-30 to 2025-01-05 (43.5 hours worked)

---

## 🔗 Quick Start Example

```bash
# 1. Login
curl -X POST http://localhost:5000/api/staffs/login \
  -H "Content-Type: application/json" \
  -d '{"Email":"admin@adelaidefarm.com","Password":"admin"}'

# Response: { "token": "eyJhbGc...", "staff": {...} }

# 2. Get all staff (using token)
curl -X GET http://localhost:5000/api/staffs \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# 3. Calculate payroll
curl -X GET "http://localhost:5000/api/payroll/calculate?staffId=2&mondayDate=2024-12-30&isSpecialPayRate=false"

# 4. Assign a shift
curl -X POST http://localhost:5000/api/roster/assign \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{"StaffId":2,"StartTime":"2024-12-31T08:00:00","EndTime":"2024-12-31T16:00:00"}'
```

---

## 📞 Support

For issues or questions, please contact the development team.

**Version:** 1.0  
**Last Updated:** December 2024


# Attendance office location — backend structure

Mobile app: DWP HCM. API base: `https://api.payroll.dwp.com.pk`.

The phone already sends the employee's **current GPS** on every punch. The database has **no office coordinates**, so the app cannot yet know which office an employee is allowed to use. Existing `Location` (`locationId`, `locationName`, `locationAbbreviation`, `locationStatus`) and `Employee.employeeLocId` have no latitude, longitude, or radius.

Do not store the office pin on the employee row. Many employees share one office. Store the pin once on the location, then assign that location to employees the same way shifts are assigned (`HrAttEmpShift`).

## 1. Office coordinates

Add columns to the existing Location table, or a 1:1 child table `HR_ATT_LOCATION_GEO` with `location_id` as the primary key.

| Column | Type | Rule |
|---|---|---|
| location_id | int, PK/FK → Location | Required |
| latitude | decimal(9,6) | -90 to 90. Reject 0,0 |
| longitude | decimal(9,6) | -180 to 180. Reject 0,0 |
| radius_meters | int | Required, > 0. Suggested default **150**. This is the allowed distance from the office pin |
| active_flag | char(1) | `Y` / `N` |

Example: head office at 31.520370, 74.358749 with a 150 m radius. An employee at 31.521000, 74.359000 is allowed only if the straight-line distance is 150 m or less.

## 2. Employee assignment

New table `HR_ATT_EMP_LOCATION`, same shape as `HrAttEmpShift`.

| Column | Type | Rule |
|---|---|---|
| emp_loc_id | int, identity, PK | |
| employee_id | int, FK → Employee | Required |
| location_id | int, FK → Location | Required. That location must have coordinates |
| effective_from | datetime | Required. Pakistan time, no offset |
| effective_to | datetime, null | Null means open-ended |
| active_flag | char(1) | `Y` / `N` |
| created_by, created_date, updated_by, updated_date | same as shift | |

One employee may have more than one active office (for example two branches). The app allows check-in when the phone is inside **any** active assigned office.

If the business rule is strictly one office per employee, skip this table and use `Employee.employeeLocId`. The coordinates still live on Location, not on the employee.

## 3. API the mobile app will call

```
GET /api/HrAttEmpLocation/GetAuthorizedLocations?employeeId={id}
Authorization: Bearer {token}
```

Return only rows where `active_flag = Y`, `effective_from <= today`, and `effective_to` is null or `>= today`. Return only locations that belong to this employee. Never return another employee's offices.

```json
[
  {
    "locationId": 3,
    "locationName": "Head Office",
    "latitude": 31.520370,
    "longitude": 74.358749,
    "radiusMeters": 150
  }
]
```

Use the same JSON names. The app reads `locationId`, `locationName`, `latitude`, `longitude`, `radiusMeters`.

There is no screen for an employee to edit these values. Office pins are maintained by HR in the payroll system.

## 4. What the phone sends today

The mobile app posts **only** to `SaveHrAttPunchRaw`. It does **not** call `SaveHrAttDaily` or `UpdateHrAttDaily`. `TRG_HR_ATT_PUNCH_RAW_PROCESS` must create or update `HR_ATT_DAILY` via `HR_ATT_PROCESS_DAILY_SP`. After the punch insert, the app confirms by reading `GetHrAttDailyList`. If the trigger logs an error and leaves daily unchanged, the employee sees a failure even though the punch row exists.

`POST /api/HrAttPunchRaw/SaveHrAttPunchRaw` stores the **phone** position, not the office position:

| Field | Meaning |
|---|---|
| latitude | GPS latitude at the moment of Check In or Check Out |
| longitude | GPS longitude at that same moment |
| puncH_DATETIME | Phone time converted to Pakistan time (UTC+5), no offset, e.g. `2026-10-21T09:02:00` |
| puncH_TYPE | `IN` or `OUT` |
| devicE_ID | `MOBILE-APP` |
| source | `MOBILE` |
| puncH_TAG | `MOBILE_APP` |
| devicE_PUNCH_ID | null |

`HrAttDaily` does not store coordinates. The punch row is the location record.

## 5. Server must validate. The phone check is not enough

On `SaveHrAttPunchRaw`, before insert:

1. Load this employee's active offices from section 2.
2. If there is no active office, reject the punch.
3. Reject latitude/longitude that are null, out of range, or exactly 0,0.
4. Distance = haversine meters between the phone point and each office pin. Allow the punch only if at least one office has `distance <= radius_meters`.
5. Store the phone latitude/longitude as sent. Do not overwrite them with the office pin. HR needs the real place the employee was standing.
6. Set `puncH_DATETIME` from the database clock in Pakistan time (UTC+5). Do not trust the phone clock as the official time.
7. Apply the same accept/reject result to `SaveHrAttDaily` / `UpdateHrAttDaily` for that check-in or check-out. A punch outside the radius must not create or update the daily attendance row.

Suggested error text the app can show: `You are outside your assigned office.`

## 6. Distance formula

```
R = 6371008.8
dLat = radians(lat2 - lat1)
dLng = radians(lng2 - lng1)
a = sin(dLat/2)^2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dLng/2)^2
meters = 2 * R * atan2(sqrt(a), sqrt(1-a))
```

Compare `meters` with that office's `radius_meters`.

## 7. Sample data

```text
Location 3 = Head Office, 31.520370, 74.358749, radius 150, active Y
Employee 487 assigned to location 3, effective_from 2026-10-01, effective_to null, active Y

Phone at 31.520400, 74.358800 → about 8 m → accept
Phone at 31.530000, 74.370000 → about 1.5 km → reject
```

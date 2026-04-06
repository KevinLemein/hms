# MediCare HMS

Hospital Management System — React + Spring Boot + .NET + PostgreSQL + Docker

## Project Structure

```
hospital-management-system/
├── docker-compose.yml
├── backend/                          # Spring Boot (Java) — Auth, Users, Patients
│   ├── Dockerfile
│   ├── pom.xml
│   └── src/main/java/com/kevinlemein/backend/
│       ├── config/                   # SecurityConfig, DataSeeder
│       ├── controller/              # Auth, Admin, Patient, Receptionist
│       ├── dto/                     # Request/Response objects
│       ├── model/                   # User, Patient, Role, Gender
│       ├── repository/             # JPA Repositories
│       ├── security/               # JWT filter, service
│       └── service/                # Auth, User, Patient services
├── dotnet-backend/                  # ASP.NET Core — Appointments, Records, Billing
│   ├── Dockerfile
│   ├── Controllers/
│   ├── Models/
│   └── Services/
├── frontend/                        # React + Vite + Tailwind
│   ├── Dockerfile
│   ├── nginx.conf
│   └── src/
│       ├── api/                    # axios, authService, patientService, adminService
│       ├── components/             # Navbar, ProtectedRoute
│       ├── context/                # AuthContext
│       └── pages/                  # Login, Dashboard, Admin, Doctor, Receptionist, Patient
└── database/
    └── init.sql
```

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Docker Desktop | 4.25+ | https://docker.com/products/docker-desktop |
| Git | 2.40+ | https://git-scm.com/downloads |
| Node.js (local dev) | 22 LTS | https://nodejs.org |
| Java JDK (local dev) | 25 | https://adoptium.net |
| .NET SDK (local dev) | 9.0+ | https://dotnet.microsoft.com/download |

> **Docker is all you need to run the full system.** Node/Java/.NET are only needed for local development outside Docker.

## Quick Start

```bash
git clone https://github.com/<your-org>/hospital-management-system.git
cd hospital-management-system
docker compose up --build
```

Open **http://localhost:3000**

### Default Admin Login

```
Email:    kevin@gmail.com
Password: 12345678
```

### Common Commands

```bash
docker compose down              # Stop (keeps data)
docker compose down -v           # Stop + delete database
docker builder prune -f          # Clear build cache
docker compose up --build        # Rebuild after code changes
```

## Database

**Shared PostgreSQL** — both backends connect to the same database.

| Property | Docker | Local |
|----------|--------|-------|
| Host | `postgres` | `localhost` |
| Port | `5432` | `5432` |
| Database | `hms_db` | `hms_db` |
| Username | `postgres` | `postgres` |
| Password | `hms_password_2026` | `hms_password_2026` |

## API Endpoints

### Auth

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/login` | Public | Login, returns JWT |

### Admin (ROLE_ADMIN only)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/users` | List all users |
| POST | `/api/admin/users` | Create admin/doctor/receptionist |
| PATCH | `/api/admin/users/{id}/role` | Change user role |
| PATCH | `/api/admin/users/{id}/toggle-status` | Enable/disable user |

### Patients (RECEPTIONIST, ADMIN, DOCTOR)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/patients/register` | RECEPTIONIST, ADMIN | Register patient (auto-generates password) |
| GET | `/api/patients` | DOCTOR, RECEPTIONIST, ADMIN | List all patients |
| GET | `/api/patients/{id}` | DOCTOR, RECEPTIONIST, ADMIN | Get patient by ID |
| GET | `/api/patients/search?query=` | DOCTOR, RECEPTIONIST, ADMIN | Search by name/email/phone |

### Receptionist (ROLE_RECEPTIONIST only)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/receptionist/users` | Create doctor/receptionist/patient |
| GET | `/api/receptionist/doctors` | List doctors |

### Appointments —  (To Be Built)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/appointments` | RECEPTIONIST | Book appointment |
| GET | `/api/appointments/doctor/{id}` | DOCTOR | Doctor's appointments |
| PATCH | `/api/appointments/{id}/status` | DOCTOR, RECEPTIONIST | Update status |

### Medical Records —  (To Be Built)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/records` | DOCTOR | Create record |
| GET | `/api/records/patient/{id}` | DOCTOR, PATIENT | Patient records |

### Prescriptions —  (To Be Built)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/prescriptions` | DOCTOR | Create prescription |
| GET | `/api/prescriptions/patient/{id}` | DOCTOR, PATIENT | Patient prescriptions |

### Billing —  (To Be Built)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/billing/invoice` | RECEPTIONIST | Generate invoice |
| PATCH | `/api/billing/invoice/{id}/pay` | RECEPTIONIST | Mark as paid |

## API Response Format

All endpoints return:

```json
{
  "success": true,
  "message": "Patient registered successfully",
  "data": { },
  "timestamp": "2026-04-06T10:30:00"
}
```

## JWT

Tokens are issued by Spring Boot and validated by both backends using the same secret.

**Payload claims:** `sub` (email), `role` (e.g. ROLE_DOCTOR), `userId`, `iat`, `exp` (24h)

**Header format:** `Authorization: Bearer <token>`

## .NET Setup (Module B)

```bash
mkdir dotnet-backend && cd dotnet-backend
dotnet new webapi -n HmsApi && cd HmsApi

# Required packages
dotnet add package Npgsql.EntityFrameworkCore.PostgreSQL
dotnet add package Microsoft.AspNetCore.Authentication.JwtBearer
dotnet add package Microsoft.EntityFrameworkCore.Design
```

Add to `docker-compose.yml`:

```yaml
dotnet-backend:
  build:
    context: ./dotnet-backend/HmsApi
  container_name: hms-dotnet
  ports:
    - "5000:5000"
  environment:
    ASPNETCORE_URLS: "http://+:5000"
    ConnectionStrings__DefaultConnection: "Host=postgres;Port=5432;Database=hms_db;Username=postgres;Password=hms_password_2026"
  depends_on:
    postgres:
      condition: service_healthy
```

Add to `nginx.conf` (before the existing `/api/` block):

```nginx
location /api/appointments/ { proxy_pass http://dotnet-backend:5000; }
location /api/records/      { proxy_pass http://dotnet-backend:5000; }
location /api/prescriptions/ { proxy_pass http://dotnet-backend:5000; }
location /api/billing/       { proxy_pass http://dotnet-backend:5000; }
```

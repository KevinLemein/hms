# MediCare HMS

Hospital Management System for small outpatient clinics — React + Spring Boot + .NET + PostgreSQL + Docker

## Prerequisites

| Tool | Version | Required? |
|------|---------|-----------|
| [Docker Desktop](https://docker.com/products/docker-desktop) | 4.25+ | **Yes** |
| [Git](https://git-scm.com/downloads) | 2.40+ | **Yes** |
| Node.js | 22 LTS | Local dev only |
| Java JDK | 25 | Local dev only |

> **Docker is all you need to run the full system.** Node and Java are only needed if you want to develop outside Docker.

## Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/KevinLemein/hms.git
cd hms
```

### 2. Create the environment file

Create a `.env` file in the project root (same level as `docker-compose.yml`):

```env
DB_URL=jdbc:postgresql://<your-db-host>:5432/medicare
DB_USERNAME=postgres
DB_PASSWORD=<your-db-password>
JWT_SECRET=<your-base64-encoded-64-byte-key>
JWT_EXPIRATION=86400000
```

> **Important:** The `.env` file contains sensitive credentials and is excluded from Git via `.gitignore`. Never commit this file.

To generate a JWT secret:

```bash
openssl rand -base64 64
```

### 3. Build and run

```bash
docker compose up --build
```

### 4. Open the application

Go to **http://localhost:3000**

### Default Admin Login

```
Email:    kevin@gmail.com
Password: Admin@123
```

After logging in as admin, create Doctor and Receptionist accounts from the Admin Dashboard.

## Architecture

```
Browser (React SPA)
    |
    v
nginx (port 3000)
    |--- /api/Prescriptions, /api/Drugs ---> .NET API (external HTTPS)
    |--- /api/** ---> Spring Boot (port 8080, Docker internal)
    |--- /* ---> React static files
    |
    v
PostgreSQL 16 (remote, port 5432)
```

The system uses two independently deployed backend services sharing a single PostgreSQL database:

| Service | Technology | Responsibilities |
|---------|-----------|-----------------|
| **Module A** | Spring Boot 4.0 / Java 25 | Authentication (JWT), user management, patient registration, appointment scheduling |
| **Module B** | .NET 8 / C# | Prescriptions, drug catalogue, medical records, billing |
| **Frontend** | React 19 / Vite 6 | Single-page application with Tailwind CSS |
| **Proxy** | nginx (Alpine) | Reverse proxy + static file server |

## User Roles

| Role | Default Credentials | Dashboard Features |
|------|--------------------|--------------------|
| **Admin** | `kevin@gmail.com` / `Admin@123` | Create/manage users, assign roles, system overview |
| **Receptionist** | Created by Admin | Register patients + book appointments, manage queue (check-in, cancel, no-show), view appointments |
| **Doctor** | Created by Admin | View patient queue, start consultations, create prescriptions (drug dropdown from DB), view prescriptions |
| **Patient** | Auto-generated on registration | View own appointments, view own prescriptions, personal info |

## Project Structure

```
hms/
├── .env                              # Environment variables (not in Git)
├── .gitignore
├── docker-compose.yml                # Docker service definitions
├── backend/                          # Spring Boot (Java 25)
│   ├── Dockerfile                    # Multi-stage: Maven build → JRE runtime
│   ├── pom.xml
│   └── src/main/java/com/kevinlemein/backend/
│       ├── config/                   # SecurityConfig, DataSeeder
│       ├── controller/               # Auth, Admin, Patient, Appointment, Bill
│       ├── dto/                      # Request/Response DTOs
│       ├── exception/                # GlobalExceptionHandler
│       ├── model/                    # User, Patient, Appointment, Bill, enums
│       ├── repository/               # JPA Repositories
│       ├── security/                 # JwtService, JwtAuthenticationFilter
│       └── service/                  # Auth, User, Patient, Appointment, Bill
├── dotnetapi/                        # .NET 8 (C#) — colleague's module
│   ├── Controllers/
│   ├── Models/
│   └── Services/
├── frontend/                         # React 19 + Vite 6 + Tailwind CSS
│   ├── Dockerfile                    # Multi-stage: Node build → nginx serve
│   ├── nginx.conf                    # Reverse proxy configuration
│   └── src/
│       ├── api/                      # axios, authService, patientService,
│       │                             # appointmentService, prescriptionService,
│       │                             # billService
│       ├── components/               # Navbar, ProtectedRoute
│       ├── context/                  # AuthContext (JWT state management)
│       └── pages/                    # Login, AdminDashboard, DoctorDashboard,
│                                     # ReceptionistDashboard, PatientDashboard
└── database/
    └── init.sql
```

## API Endpoints

### Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/login` | Public | Login with email/password, returns JWT |

### User Management (Admin)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/admin/users` | ADMIN | Create user (any role) |
| GET | `/api/admin/users` | ADMIN | List all users |
| GET | `/api/admin/doctors` | ADMIN, RECEPTIONIST | List doctors |

### Patients

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/patients/register` | RECEPTIONIST, ADMIN | Register patient (auto-generates credentials) |
| GET | `/api/patients` | DOCTOR, RECEPTIONIST, ADMIN | List all patients |
| GET | `/api/patients/{id}` | DOCTOR, RECEPTIONIST, ADMIN | Get patient by ID |
| GET | `/api/patients/by-user/{userId}` | ALL ROLES | Get patient by user ID |
| GET | `/api/patients/search?query=` | DOCTOR, RECEPTIONIST, ADMIN | Search by name/email/phone |

### Appointments

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/appointments` | RECEPTIONIST | Book appointment |
| PATCH | `/api/appointments/{id}/status` | DOCTOR, RECEPTIONIST, ADMIN | Update status |
| GET | `/api/appointments` | RECEPTIONIST, ADMIN | List all appointments |
| GET | `/api/appointments/today` | DOCTOR, RECEPTIONIST, ADMIN | Today's appointments |
| GET | `/api/appointments/doctor/{id}` | DOCTOR, RECEPTIONIST, ADMIN | Appointments by doctor |
| GET | `/api/appointments/doctor/{id}/today` | DOCTOR, RECEPTIONIST, ADMIN | Today's for specific doctor |
| GET | `/api/appointments/patient/{id}` | ALL ROLES | Appointments by patient |

### Prescriptions & Drugs (.NET via nginx proxy)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/Prescriptions` | DOCTOR | List all prescriptions |
| POST | `/api/Prescriptions` | DOCTOR | Create prescription |
| GET | `/api/Drugs` | DOCTOR | List all drugs |

### Billing

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/bills/from-prescription` | DOCTOR, RECEPTIONIST, ADMIN | Create bill from prescription |
| POST | `/api/bills/{id}/items` | RECEPTIONIST, ADMIN | Add extra charge to bill |
| PATCH | `/api/bills/{id}/pay` | RECEPTIONIST, ADMIN | Record payment (CASH/MPESA/CARD) |
| GET | `/api/bills` | RECEPTIONIST, ADMIN | List all bills |
| GET | `/api/bills/appointment/{id}` | DOCTOR, RECEPTIONIST, ADMIN | Bill for an appointment |

## API Response Format

All Spring Boot endpoints return a standardised envelope:

```json
{
  "success": true,
  "message": "Patient registered successfully",
  "data": { ... },
  "timestamp": "2026-04-22T10:30:00"
}
```

## Appointment Status Flow

```
PENDING  ──→  WAITING  ──→  IN_CONSULTATION  ──→  COMPLETED
   │              │
   └→ CANCELLED   └→ NO_SHOW
```

| Status | Set By | Meaning |
|--------|--------|---------|
| PENDING | System | Appointment booked, patient not yet arrived |
| WAITING | Receptionist | Patient checked in, visible in doctor's queue |
| IN_CONSULTATION | Doctor | Doctor seeing patient, can prescribe |
| COMPLETED | Doctor | Visit finished |
| CANCELLED | Receptionist | Cancelled before arrival |
| NO_SHOW | Receptionist | Patient did not arrive |

## Common Commands

```bash
docker compose up --build          # Build and start all services
docker compose down                # Stop services (keeps data)
docker compose up --build backend  # Rebuild backend only
docker compose up --build frontend # Rebuild frontend only
docker builder prune -f            # Clear Docker build cache
docker compose logs backend        # View backend logs
docker compose logs frontend       # View frontend/nginx logs
```

## Security Notes

- Passwords are hashed with **BCrypt** — plain text is never stored
- All API endpoints (except login) require a valid **JWT Bearer token**
- Credentials are stored in `.env` files, never in source code
- RBAC is enforced at both the API level (`@PreAuthorize`) and the UI level (React route guards)
- If credentials are accidentally committed to Git, **rotate them immediately**

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 6, Tailwind CSS, Axios, React Router 7 |
| Backend (Module A) | Spring Boot 4.0, Java 25, Spring Security 6, Hibernate 7, JWT |
| Backend (Module B) | .NET 8, C#, Entity Framework Core |
| Database | PostgreSQL 16 |
| Containerisation | Docker, Docker Compose |
| Reverse Proxy | nginx (Alpine) |

## Authors

- **Kevin Lemein** — Spring Boot backend, React frontend, system architecture
- **Bronson Smith** — .Documentation 
- **Daniel Mburu** — .NET backend, Database Design

USIU-Africa | MSc Information Systems & Technology | 2026

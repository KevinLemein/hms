-- This script runs automatically when the PostgreSQL container starts for the first time.
-- Hibernate's ddl-auto=update will also create tables, but this is here
-- as a reference and for manual setup if needed.

-- Create the database (already done by POSTGRES_DB env var in docker-compose)
-- CREATE DATABASE hms_db;

-- If you're setting up locally without Docker, run:
-- psql -U postgres
-- CREATE DATABASE hms_db;
-- \q

-- The tables below will be auto-created by Hibernate on first run.
-- This is just for reference:

/*
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);
*/

CREATE TABLE drivers (
    id BIGSERIAL PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    license_number VARCHAR(50) NOT NULL UNIQUE,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE vehicles (
    id BIGSERIAL PRIMARY KEY,
    brand VARCHAR(80) NOT NULL,
    model VARCHAR(80) NOT NULL,
    registration_number VARCHAR(20) NOT NULL UNIQUE,
    production_year INTEGER NOT NULL
        CHECK (production_year BETWEEN 1980 AND 2100),
    availability_status VARCHAR(30) NOT NULL DEFAULT 'AVAILABLE'
        CHECK (
            availability_status IN (
                'AVAILABLE',
                'IN_USE',
                'MAINTENANCE',
                'REPAIR',
                'UNAVAILABLE'
            )
        ),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
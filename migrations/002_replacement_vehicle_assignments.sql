CREATE TABLE replacement_vehicle_assignments (
    id BIGSERIAL PRIMARY KEY,

    driver_id BIGINT NOT NULL
        REFERENCES drivers(id),

    vehicle_id BIGINT NOT NULL
        REFERENCES vehicles(id),

    started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    ended_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CHECK (ended_at IS NULL OR ended_at >= started_at)
);

CREATE INDEX idx_replacement_assignments_driver
    ON replacement_vehicle_assignments(driver_id);

CREATE INDEX idx_replacement_assignments_vehicle
    ON replacement_vehicle_assignments(vehicle_id);
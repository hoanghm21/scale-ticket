CREATE TABLE IF NOT EXISTS tickets (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id      UUID NOT NULL,
    user_id       UUID NOT NULL,
    seat_id       VARCHAR(50) NOT NULL,
    section_name  VARCHAR(100) NOT NULL,
    seat_label    VARCHAR(50) NOT NULL,
    price         DECIMAL(10, 2) NOT NULL,
    currency      VARCHAR(3) NOT NULL DEFAULT 'USD',
    status        VARCHAR(20) NOT NULL DEFAULT 'reserved',
    qr_code       VARCHAR(512),
    checked_in_at TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_ticket_event_seat UNIQUE (event_id, seat_id)
);

CREATE INDEX idx_tickets_event ON tickets (event_id);
CREATE INDEX idx_tickets_user ON tickets (user_id);
CREATE INDEX idx_tickets_status ON tickets (status);

CREATE TABLE IF NOT EXISTS reservations (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id   UUID NOT NULL,
    user_id    UUID NOT NULL,
    seat_id    VARCHAR(50) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_reservation_event_seat UNIQUE (event_id, seat_id)
);

CREATE INDEX idx_reservations_expires ON reservations (expires_at);
CREATE INDEX idx_reservations_user ON reservations (user_id);

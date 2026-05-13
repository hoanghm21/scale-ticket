-- Ticket Service: Tickets and Reservations tables
-- Run this migration when switching from in-memory to PostgreSQL.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS tickets (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id        UUID NOT NULL,
    user_id         UUID NOT NULL,
    seat_id         VARCHAR(100) NOT NULL,
    section_name    VARCHAR(100),
    seat_label      VARCHAR(100),
    price           DECIMAL(10, 2) NOT NULL DEFAULT 0,
    currency        VARCHAR(3) NOT NULL DEFAULT 'USD',
    status          VARCHAR(20) NOT NULL DEFAULT 'purchased',
    qr_code         VARCHAR(100) NOT NULL UNIQUE,
    checked_in_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tickets_user_id ON tickets (user_id);
CREATE INDEX idx_tickets_event_id ON tickets (event_id);
CREATE INDEX idx_tickets_qr_code ON tickets (qr_code);
CREATE INDEX idx_tickets_status ON tickets (status);

CREATE TABLE IF NOT EXISTS reservations (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id    UUID NOT NULL,
    user_id     UUID NOT NULL,
    seat_id     VARCHAR(100) NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(event_id, seat_id)
);

CREATE INDEX idx_reservations_event_seat ON reservations (event_id, seat_id);
CREATE INDEX idx_reservations_expires ON reservations (expires_at);

-- Auto-cleanup expired reservations (to be called by a scheduled job)
CREATE OR REPLACE FUNCTION cleanup_expired_reservations()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM reservations WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ language 'plpgsql';

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_ticket_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tickets_updated_at
    BEFORE UPDATE ON tickets
    FOR EACH ROW
    EXECUTE FUNCTION update_ticket_updated_at();

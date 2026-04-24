package domain

import (
	"time"

	"github.com/google/uuid"
)

// Ticket represents a purchased ticket.
type Ticket struct {
	ID          uuid.UUID    `json:"id"`
	EventID     uuid.UUID    `json:"event_id"`
	UserID      uuid.UUID    `json:"user_id"`
	SeatID      string       `json:"seat_id"`
	SectionName string       `json:"section_name"`
	SeatLabel   string       `json:"seat_label"`
	Price       float64      `json:"price"`
	Currency    string       `json:"currency"`
	Status      TicketStatus `json:"status"`
	QRCode      string       `json:"qr_code"`
	CheckedInAt *time.Time   `json:"checked_in_at,omitempty"`
	CreatedAt   time.Time    `json:"created_at"`
	UpdatedAt   time.Time    `json:"updated_at"`
}

// TicketStatus represents the ticket lifecycle.
type TicketStatus string

const (
	TicketReserved  TicketStatus = "reserved"
	TicketPurchased TicketStatus = "purchased"
	TicketCheckedIn TicketStatus = "checked_in"
	TicketCancelled TicketStatus = "cancelled"
	TicketRefunded  TicketStatus = "refunded"
	TicketExpired   TicketStatus = "expired"
)

// Reservation represents a temporary seat hold.
type Reservation struct {
	ID        uuid.UUID `json:"id"`
	EventID   uuid.UUID `json:"event_id"`
	UserID    uuid.UUID `json:"user_id"`
	SeatID    string    `json:"seat_id"`
	ExpiresAt time.Time `json:"expires_at"`
	CreatedAt time.Time `json:"created_at"`
}

// SeatAvailability tracks real-time seat status.
type SeatAvailability struct {
	SeatID    string     `json:"seat_id"`
	EventID   uuid.UUID  `json:"event_id"`
	Status    SeatStatus `json:"status"`
	LockedBy  *uuid.UUID `json:"locked_by,omitempty"`
	ExpiresAt *time.Time `json:"expires_at,omitempty"`
}

// SeatStatus for real-time availability.
type SeatStatus string

const (
	SeatAvailable SeatStatus = "available"
	SeatLocked    SeatStatus = "locked"
	SeatSold      SeatStatus = "sold"
)

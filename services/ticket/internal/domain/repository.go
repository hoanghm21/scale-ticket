package domain

import (
	"context"

	"github.com/google/uuid"
)

// TicketRepository defines the data access interface for tickets.
type TicketRepository interface {
	Create(ctx context.Context, ticket *Ticket) error
	FindByID(ctx context.Context, id uuid.UUID) (*Ticket, error)
	FindByUserID(ctx context.Context, userID string) ([]*Ticket, error)
	FindByEventID(ctx context.Context, eventID string) ([]*Ticket, error)
	FindByTicketCode(ctx context.Context, code string) (*Ticket, error)
	Update(ctx context.Context, ticket *Ticket) error
}

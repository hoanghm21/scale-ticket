package domain

import (
	"context"

	"github.com/google/uuid"
)

// EventRepository defines the data access interface for events.
type EventRepository interface {
	FindAll(ctx context.Context) ([]*Event, error)
	FindByID(ctx context.Context, id uuid.UUID) (*Event, error)
	FindByCategory(ctx context.Context, category string) ([]*Event, error)
	Search(ctx context.Context, query string) ([]*Event, error)
	Create(ctx context.Context, event *Event) error
	Update(ctx context.Context, event *Event) error
	Delete(ctx context.Context, id uuid.UUID) error
}

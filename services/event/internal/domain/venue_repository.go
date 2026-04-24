package domain

import (
	"context"
)

// VenueRepository exposes the database actions for manipulating the physical layout structure sizes of a Venue.
type VenueRepository interface {
	Save(ctx context.Context, layout *VenueLayout) error
	FindByID(ctx context.Context, id string) (*VenueLayout, error)
	FindAll(ctx context.Context) ([]*VenueLayout, error)
}

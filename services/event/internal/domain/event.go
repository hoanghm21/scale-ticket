package domain

import (
	"errors"
	"time"

	"github.com/google/uuid"
)

var ErrEventNotFound = errors.New("event not found")

// Event represents a ticketed event.
type Event struct {
	ID          uuid.UUID  `bson:"_id" json:"id"`
	Title       string     `bson:"title" json:"title"`
	Description string     `bson:"description" json:"description"`
	Venue       Venue      `bson:"venue" json:"venue"`
	Category    string     `bson:"category" json:"category"`
	StartDate   time.Time  `bson:"start_date" json:"start_date"`
	EndDate     time.Time  `bson:"end_date" json:"end_date"`
	Status      EventStatus `bson:"status" json:"status"`
	OrganizerID uuid.UUID  `bson:"organizer_id" json:"organizer_id"`
	SeatMap     *SeatMap   `bson:"seat_map,omitempty" json:"seat_map,omitempty"`
	Images      []string   `bson:"images" json:"images"`
	Tags        []string   `bson:"tags" json:"tags"`
	Metadata    map[string]interface{} `bson:"metadata,omitempty" json:"metadata,omitempty"`
	CreatedAt   time.Time  `bson:"created_at" json:"created_at"`
	UpdatedAt   time.Time  `bson:"updated_at" json:"updated_at"`
}

// EventStatus represents the lifecycle state of an event.
type EventStatus string

const (
	EventDraft     EventStatus = "draft"
	EventPublished EventStatus = "published"
	EventSoldOut   EventStatus = "sold_out"
	EventCancelled EventStatus = "cancelled"
	EventCompleted EventStatus = "completed"
)

// Venue represents the physical or virtual location.
type Venue struct {
	Name     string   `bson:"name" json:"name"`
	Address  string   `bson:"address" json:"address"`
	City     string   `bson:"city" json:"city"`
	Country  string   `bson:"country" json:"country"`
	Capacity int      `bson:"capacity" json:"capacity"`
	Location GeoPoint `bson:"location" json:"location"`
}

// GeoPoint for geographic coordinates.
type GeoPoint struct {
	Type        string    `bson:"type" json:"type"`
	Coordinates [2]float64 `bson:"coordinates" json:"coordinates"` // [lng, lat]
}

// SeatMap defines the seating layout for canvas rendering.
type SeatMap struct {
	Width    int       `bson:"width" json:"width"`
	Height   int       `bson:"height" json:"height"`
	Sections []Section `bson:"sections" json:"sections"`
}

// Section represents a group of seats (e.g., VIP, General).
type Section struct {
	ID    string  `bson:"id" json:"id"`
	Name  string  `bson:"name" json:"name"`
	Color string  `bson:"color" json:"color"`
	Price float64 `bson:"price" json:"price"`
	Rows  []Row   `bson:"rows" json:"rows"`
}

// Row represents a row of seats.
type Row struct {
	Label string `bson:"label" json:"label"`
	Seats []Seat `bson:"seats" json:"seats"`
}

// Seat represents an individual seat.
type Seat struct {
	ID     string  `bson:"id" json:"id"`
	Number string  `bson:"number" json:"number"`
	X      float64 `bson:"x" json:"x"`
	Y      float64 `bson:"y" json:"y"`
}

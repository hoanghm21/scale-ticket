package domain

import (
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type VenueLayout struct {
	ID        primitive.ObjectID `bson:"_id,omitempty"`
	VenueName string             `bson:"venue_name"`
	Category  string             `bson:"category"` // stadium | arena | theater
	Sections  []VenueSection     `bson:"sections"`
}

type VenueSection struct {
	ID          string            `bson:"id"`
	Name        string            `bson:"name"`
	Type        string            `bson:"type"` // vip | floor | standard
	Shape       VenueSectionShape `bson:"shape"`
	Rows        int32             `bson:"rows"`
	SeatsPerRow int32             `bson:"seats_per_row"`
	BasePrice   int32             `bson:"base_price"`
	CurveFactor float64           `bson:"curve_factor,omitempty"`
}

type VenueSectionShape struct {
	Kind string `bson:"kind"`

	// Rect properties
	X float64 `bson:"x,omitempty"`
	Y float64 `bson:"y,omitempty"`
	W float64 `bson:"w,omitempty"`
	H float64 `bson:"h,omitempty"`

	// Arc properties
	CX float64 `bson:"cx,omitempty"`
	CY float64 `bson:"cy,omitempty"`
	R1 float64 `bson:"r1,omitempty"`
	R2 float64 `bson:"r2,omitempty"`
	A0 float64 `bson:"a0,omitempty"`
	A1 float64 `bson:"a1,omitempty"`

	// Poly points: pairs of [x, y]
	Points []float64 `bson:"points,omitempty"`
}

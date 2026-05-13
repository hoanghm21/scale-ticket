package infrastructure

import (
	"context"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/scale-ticket/event/internal/domain"
)

// MemoryEventRepo is a thread-safe, in-memory implementation of EventRepository
// pre-seeded with demo events that match the frontend mock data structure.
type MemoryEventRepo struct {
	mu     sync.RWMutex
	events map[uuid.UUID]*domain.Event
	// Keep an ordered list of IDs for consistent listing
	order []uuid.UUID
	// Legacy ID mapping: "e_1" → UUID
	legacyIDs map[string]uuid.UUID
}

// NewMemoryEventRepo creates a new in-memory event repository pre-seeded with demo data.
func NewMemoryEventRepo() *MemoryEventRepo {
	r := &MemoryEventRepo{
		events:    make(map[uuid.UUID]*domain.Event),
		legacyIDs: make(map[string]uuid.UUID),
	}
	r.seed()
	return r
}

func (r *MemoryEventRepo) FindAll(_ context.Context) ([]*domain.Event, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	result := make([]*domain.Event, 0, len(r.order))
	for _, id := range r.order {
		if e, ok := r.events[id]; ok {
			result = append(result, copyEvent(e))
		}
	}
	return result, nil
}

func (r *MemoryEventRepo) FindByID(_ context.Context, id uuid.UUID) (*domain.Event, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	// Try direct UUID match first
	if e, ok := r.events[id]; ok {
		return copyEvent(e), nil
	}

	return nil, fmt.Errorf("event not found: %s", id)
}

// FindByLegacyID looks up an event by its legacy string ID (e.g. "e_1").
func (r *MemoryEventRepo) FindByLegacyID(_ context.Context, legacyID string) (*domain.Event, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	uid, ok := r.legacyIDs[legacyID]
	if !ok {
		return nil, fmt.Errorf("event not found: %s", legacyID)
	}
	if e, ok := r.events[uid]; ok {
		return copyEvent(e), nil
	}
	return nil, fmt.Errorf("event not found: %s", legacyID)
}

func (r *MemoryEventRepo) FindByCategory(_ context.Context, category string) ([]*domain.Event, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	var result []*domain.Event
	for _, id := range r.order {
		if e, ok := r.events[id]; ok && strings.EqualFold(e.Category, category) {
			result = append(result, copyEvent(e))
		}
	}
	return result, nil
}

func (r *MemoryEventRepo) Search(_ context.Context, query string) ([]*domain.Event, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	q := strings.ToLower(query)
	var result []*domain.Event
	for _, id := range r.order {
		e, ok := r.events[id]
		if !ok {
			continue
		}
		if strings.Contains(strings.ToLower(e.Title), q) ||
			strings.Contains(strings.ToLower(e.Venue.Name), q) ||
			strings.Contains(strings.ToLower(e.Category), q) {
			result = append(result, copyEvent(e))
		}
	}
	return result, nil
}

func (r *MemoryEventRepo) Create(_ context.Context, event *domain.Event) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if event.ID == uuid.Nil {
		event.ID = uuid.New()
	}
	stored := copyEvent(event)
	r.events[stored.ID] = stored
	r.order = append(r.order, stored.ID)
	return nil
}

func (r *MemoryEventRepo) Update(_ context.Context, event *domain.Event) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, ok := r.events[event.ID]; !ok {
		return fmt.Errorf("event not found: %s", event.ID)
	}
	stored := copyEvent(event)
	stored.UpdatedAt = time.Now()
	r.events[stored.ID] = stored
	return nil
}

func (r *MemoryEventRepo) Delete(_ context.Context, id uuid.UUID) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, ok := r.events[id]; !ok {
		return fmt.Errorf("event not found: %s", id)
	}
	delete(r.events, id)

	// Remove from order
	for i, oid := range r.order {
		if oid == id {
			r.order = append(r.order[:i], r.order[i+1:]...)
			break
		}
	}
	return nil
}

// seed populates the store with demo events matching the frontend mock data.
func (r *MemoryEventRepo) seed() {
	now := time.Now()

	seeds := []struct {
		legacyID   string
		title      string
		category   string
		date       string
		venue      string
		image      string
		priceStart float64
	}{
		{"e_1", "Neon Nights Neon Dreams World Tour", "Concerts", "Oct 24 • 8:00 PM", "Starlight Arena, NY", "/images/neon_concert.png", 129},
		{"e_2", "Championship Finals 2026", "Sports", "Nov 12 • 6:30 PM", "MetLife Stadium, NJ", "/images/sports_stadium.png", 250},
		{"e_3", "Symphony Under the Stars", "Concerts", "Dec 05 • 7:00 PM", "Wembley Grand, LND", "/images/symphony_stars.png", 85},
		{"e_4", "Hamilton: The Musical", "Arts & Theater", "Jan 10 • 2:00 PM", "Broadway Theatre, NY", "/images/theater_stage.png", 150},
		{"e_5", "F1 Grand Prix Weekend", "Sports", "Mar 15 • All Day", "Marina Bay Circuit", "/images/f1_race.png", 450},
		{"e_6", "Coachella Valley Festival", "Concerts", "Apr 20-22 • 3 Days", "Empire Polo Club, CA", "/images/festival_outdoor.png", 599},
	}

	for _, s := range seeds {
		id := uuid.New()
		event := &domain.Event{
			ID:       id,
			Title:    s.title,
			Category: s.category,
			Venue: domain.Venue{
				Name: s.venue,
			},
			Status:    domain.EventPublished,
			StartDate: now.Add(30 * 24 * time.Hour), // placeholder dates
			EndDate:   now.Add(31 * 24 * time.Hour),
			Images:    []string{s.image},
			Tags:      []string{s.category},
			Metadata: map[string]interface{}{
				"legacy_id":  s.legacyID,
				"date_label": s.date,
				"priceStart": s.priceStart,
			},
			CreatedAt: now,
			UpdatedAt: now,
		}
		r.events[id] = event
		r.order = append(r.order, id)
		r.legacyIDs[s.legacyID] = id
	}
}

func copyEvent(e *domain.Event) *domain.Event {
	c := *e
	return &c
}

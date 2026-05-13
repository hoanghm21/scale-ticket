package service

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/scale-ticket/event/internal/domain"
)

// EventResponse is the API-friendly representation of an event.
// Flattened from domain.Event to match what the frontend expects.
type EventResponse struct {
	ID         string  `json:"id"`
	LegacyID   string  `json:"legacyId,omitempty"`
	Title      string  `json:"title"`
	Category   string  `json:"category"`
	Date       string  `json:"date"`
	Venue      string  `json:"venue"`
	Image      string  `json:"image"`
	PriceStart float64 `json:"priceStart"`
	Status     string  `json:"status"`
	CreatedAt  string  `json:"createdAt"`
}

// EventService encapsulates event business logic.
type EventService struct {
	repo domain.EventRepository
}

// NewEventService creates a new event service.
func NewEventService(repo domain.EventRepository) *EventService {
	return &EventService{repo: repo}
}

// ListAll returns all published events.
func (s *EventService) ListAll(ctx context.Context) ([]EventResponse, error) {
	events, err := s.repo.FindAll(ctx)
	if err != nil {
		return nil, err
	}

	result := make([]EventResponse, 0, len(events))
	for _, e := range events {
		result = append(result, toEventResponse(e))
	}
	return result, nil
}

// GetByID returns a single event by UUID or legacy ID.
func (s *EventService) GetByID(ctx context.Context, id string) (*EventResponse, error) {
	// Try parsing as UUID first
	uid, err := uuid.Parse(id)
	if err == nil {
		event, findErr := s.repo.FindByID(ctx, uid)
		if findErr == nil {
			resp := toEventResponse(event)
			return &resp, nil
		}
	}

	// Fallback: search all events for legacy ID match
	all, err := s.repo.FindAll(ctx)
	if err != nil {
		return nil, err
	}
	for _, e := range all {
		if legacyID, ok := e.Metadata["legacy_id"].(string); ok && legacyID == id {
			resp := toEventResponse(e)
			return &resp, nil
		}
	}

	return nil, domain.ErrEventNotFound
}

// SearchEvents searches events by query string.
func (s *EventService) SearchEvents(ctx context.Context, query string) ([]EventResponse, error) {
	events, err := s.repo.Search(ctx, query)
	if err != nil {
		return nil, err
	}

	result := make([]EventResponse, 0, len(events))
	for _, e := range events {
		result = append(result, toEventResponse(e))
	}
	return result, nil
}

// FilterByCategory returns events matching a category.
func (s *EventService) FilterByCategory(ctx context.Context, category string) ([]EventResponse, error) {
	events, err := s.repo.FindByCategory(ctx, category)
	if err != nil {
		return nil, err
	}

	result := make([]EventResponse, 0, len(events))
	for _, e := range events {
		result = append(result, toEventResponse(e))
	}
	return result, nil
}

// CreateEvent creates a new event (admin only).
func (s *EventService) CreateEvent(ctx context.Context, title, category, venueName, dateLabel, image string, priceStart float64) (*EventResponse, error) {
	now := time.Now()
	event := &domain.Event{
		ID:       uuid.New(),
		Title:    title,
		Category: category,
		Venue: domain.Venue{
			Name: venueName,
		},
		Status:    domain.EventPublished,
		StartDate: now.Add(30 * 24 * time.Hour),
		EndDate:   now.Add(31 * 24 * time.Hour),
		Images:    []string{image},
		Tags:      []string{category},
		Metadata: map[string]interface{}{
			"date_label": dateLabel,
			"priceStart": priceStart,
		},
		CreatedAt: now,
		UpdatedAt: now,
	}

	if err := s.repo.Create(ctx, event); err != nil {
		return nil, err
	}

	resp := toEventResponse(event)
	return &resp, nil
}

func toEventResponse(e *domain.Event) EventResponse {
	// Extract flattened fields from metadata for frontend compatibility
	dateLabel := ""
	if dl, ok := e.Metadata["date_label"].(string); ok {
		dateLabel = dl
	}

	var priceStart float64
	if ps, ok := e.Metadata["priceStart"].(float64); ok {
		priceStart = ps
	}

	legacyID := ""
	if lid, ok := e.Metadata["legacy_id"].(string); ok {
		legacyID = lid
	}

	image := ""
	if len(e.Images) > 0 {
		image = e.Images[0]
	}

	// Use legacyID as the primary id field for frontend compatibility
	displayID := e.ID.String()
	if legacyID != "" {
		displayID = legacyID
	}

	return EventResponse{
		ID:         displayID,
		LegacyID:   legacyID,
		Title:      e.Title,
		Category:   e.Category,
		Date:       dateLabel,
		Venue:      e.Venue.Name,
		Image:      image,
		PriceStart: priceStart,
		Status:     string(e.Status),
		CreatedAt:  e.CreatedAt.Format(time.RFC3339),
	}
}

package service

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/scale-ticket/ticket/internal/domain"
)

// SeatInput represents a seat in the purchase request.
type SeatInput struct {
	ID      string  `json:"id"`
	Section string  `json:"section"`
	Row     int     `json:"row"`
	Col     int     `json:"col"`
	Price   float64 `json:"price"`
}

// TicketResponse is the API-friendly ticket representation.
type TicketResponse struct {
	ID           string    `json:"id"`
	TicketCode   string    `json:"ticketCode"`
	UserID       string    `json:"userId"`
	EventID      string    `json:"eventId"`
	EventTitle   string    `json:"eventTitle"`
	EventDate    string    `json:"eventDate"`
	EventVenue   string    `json:"eventVenue"`
	EventImage   string    `json:"eventImage"`
	Seats        []SeatInput `json:"seats"`
	TotalPrice   float64   `json:"totalPrice"`
	Status       string    `json:"status"`
	PurchaseDate int64     `json:"purchaseDate"`
	CheckedInAt  *int64    `json:"checkedInAt,omitempty"`
}

// TicketService encapsulates ticket business logic.
type TicketService struct {
	repo domain.TicketRepository
}

// NewTicketService creates a new ticket service.
func NewTicketService(repo domain.TicketRepository) *TicketService {
	return &TicketService{repo: repo}
}

// CreateTicket creates a new purchased ticket record.
func (s *TicketService) CreateTicket(ctx context.Context, userID, eventID, eventTitle, eventDate, eventVenue, eventImage string, seats []SeatInput, totalPrice float64) (*TicketResponse, error) {
	if userID == "" || eventID == "" {
		return nil, fmt.Errorf("userID and eventID are required")
	}
	if len(seats) == 0 {
		return nil, fmt.Errorf("at least one seat is required")
	}

	ticketCode := generateTicketCode()
	now := time.Now()

	// Parse UUIDs, use zero UUID if string IDs (e.g. "e_1", "u_1")
	uid, _ := uuid.Parse(userID)
	eid, _ := uuid.Parse(eventID)

	ticket := &domain.Ticket{
		ID:          uuid.New(),
		EventID:     eid,
		UserID:      uid,
		SeatID:      seats[0].ID,
		SectionName: eventID,   // Store original eventID string for lookup
		SeatLabel:   userID,    // Store original userID string for lookup
		Price:       totalPrice,
		Currency:    "USD",
		Status:      domain.TicketPurchased,
		QRCode:      ticketCode,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	if err := s.repo.Create(ctx, ticket); err != nil {
		return nil, fmt.Errorf("failed to create ticket: %w", err)
	}

	slog.Info("Ticket created", "ticketId", ticket.ID, "code", ticketCode, "userId", userID, "eventId", eventID)

	return &TicketResponse{
		ID:           ticket.ID.String(),
		TicketCode:   ticketCode,
		UserID:       userID,
		EventID:      eventID,
		EventTitle:   eventTitle,
		EventDate:    eventDate,
		EventVenue:   eventVenue,
		EventImage:   eventImage,
		Seats:        seats,
		TotalPrice:   totalPrice,
		Status:       string(domain.TicketPurchased),
		PurchaseDate: now.UnixMilli(),
	}, nil
}

// GetUserTickets returns all tickets for a user.
func (s *TicketService) GetUserTickets(ctx context.Context, userID string) ([]TicketResponse, error) {
	tickets, err := s.repo.FindByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}

	result := make([]TicketResponse, 0, len(tickets))
	for _, t := range tickets {
		result = append(result, toTicketResponse(t))
	}
	return result, nil
}

// GetTicket returns a single ticket by ID.
func (s *TicketService) GetTicket(ctx context.Context, id string) (*TicketResponse, error) {
	uid, err := uuid.Parse(id)
	if err != nil {
		// Try lookup by ticket code
		t, codeErr := s.repo.FindByTicketCode(ctx, id)
		if codeErr != nil {
			return nil, domain.ErrTicketNotFound
		}
		resp := toTicketResponse(t)
		return &resp, nil
	}

	t, err := s.repo.FindByID(ctx, uid)
	if err != nil {
		return nil, err
	}
	resp := toTicketResponse(t)
	return &resp, nil
}

// CheckIn marks a ticket as checked in.
func (s *TicketService) CheckIn(ctx context.Context, ticketIDOrCode string) (*TicketResponse, error) {
	var ticket *domain.Ticket
	var err error

	uid, parseErr := uuid.Parse(ticketIDOrCode)
	if parseErr == nil {
		ticket, err = s.repo.FindByID(ctx, uid)
	} else {
		ticket, err = s.repo.FindByTicketCode(ctx, ticketIDOrCode)
	}

	if err != nil {
		return nil, domain.ErrTicketNotFound
	}

	if ticket.Status == domain.TicketCheckedIn {
		return nil, domain.ErrAlreadyCheckedIn
	}

	if ticket.Status != domain.TicketPurchased {
		return nil, fmt.Errorf("ticket cannot be checked in (status: %s)", ticket.Status)
	}

	now := time.Now()
	ticket.Status = domain.TicketCheckedIn
	ticket.CheckedInAt = &now
	ticket.UpdatedAt = now

	if err := s.repo.Update(ctx, ticket); err != nil {
		return nil, fmt.Errorf("failed to update ticket: %w", err)
	}

	slog.Info("Ticket checked in", "ticketId", ticket.ID, "code", ticket.QRCode)

	resp := toTicketResponse(ticket)
	return &resp, nil
}

func toTicketResponse(t *domain.Ticket) TicketResponse {
	resp := TicketResponse{
		ID:           t.ID.String(),
		TicketCode:   t.QRCode,
		UserID:       t.SeatLabel,   // Original string userID
		EventID:      t.SectionName, // Original string eventID
		Seats:        []SeatInput{{ID: t.SeatID, Section: t.SectionName, Price: t.Price}},
		TotalPrice:   t.Price,
		Status:       string(t.Status),
		PurchaseDate: t.CreatedAt.UnixMilli(),
	}

	if t.CheckedInAt != nil {
		ms := t.CheckedInAt.UnixMilli()
		resp.CheckedInAt = &ms
	}

	return resp
}

func generateTicketCode() string {
	b := make([]byte, 5)
	_, _ = rand.Read(b)
	return "TKT-" + strings.ToUpper(hex.EncodeToString(b))
}

// ValidateTicket checks if a ticket exists and returns its status.
func (s *TicketService) ValidateTicket(ctx context.Context, code string) (bool, string, error) {
	t, err := s.repo.FindByTicketCode(ctx, code)
	if err != nil {
		if errors.Is(err, domain.ErrTicketNotFound) {
			return false, "", nil
		}
		return false, "", err
	}
	return true, string(t.Status), nil
}

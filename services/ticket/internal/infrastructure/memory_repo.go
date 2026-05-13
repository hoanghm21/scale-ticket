package infrastructure

import (
	"context"
	"fmt"
	"strings"
	"sync"

	"github.com/google/uuid"
	"github.com/scale-ticket/ticket/internal/domain"
)

// MemoryTicketRepo is a thread-safe, in-memory implementation of TicketRepository.
type MemoryTicketRepo struct {
	mu      sync.RWMutex
	tickets map[uuid.UUID]*domain.Ticket
	// Secondary index: ticket code → UUID
	byCode map[string]uuid.UUID
}

// NewMemoryTicketRepo creates a new in-memory ticket repository.
func NewMemoryTicketRepo() *MemoryTicketRepo {
	return &MemoryTicketRepo{
		tickets: make(map[uuid.UUID]*domain.Ticket),
		byCode:  make(map[string]uuid.UUID),
	}
}

func (r *MemoryTicketRepo) Create(_ context.Context, ticket *domain.Ticket) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if ticket.ID == uuid.Nil {
		ticket.ID = uuid.New()
	}

	stored := copyTicket(ticket)
	r.tickets[stored.ID] = stored

	// Index by QR code for quick lookup
	if stored.QRCode != "" {
		r.byCode[stored.QRCode] = stored.ID
	}

	return nil
}

func (r *MemoryTicketRepo) FindByID(_ context.Context, id uuid.UUID) (*domain.Ticket, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	t, ok := r.tickets[id]
	if !ok {
		return nil, domain.ErrTicketNotFound
	}
	return copyTicket(t), nil
}

func (r *MemoryTicketRepo) FindByUserID(_ context.Context, userID string) ([]*domain.Ticket, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	var result []*domain.Ticket
	for _, t := range r.tickets {
		if t.UserID.String() == userID || fmt.Sprintf("%s", t.UserID) == userID {
			result = append(result, copyTicket(t))
		}
	}

	// Also check the metadata field for string user IDs (non-UUID format)
	if len(result) == 0 {
		for _, t := range r.tickets {
			if t.SeatLabel == userID { // Fallback: stored in SeatLabel for legacy
				result = append(result, copyTicket(t))
			}
		}
	}

	return result, nil
}

func (r *MemoryTicketRepo) FindByEventID(_ context.Context, eventID string) ([]*domain.Ticket, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	var result []*domain.Ticket
	for _, t := range r.tickets {
		if t.EventID.String() == eventID || t.SectionName == eventID {
			result = append(result, copyTicket(t))
		}
	}
	return result, nil
}

func (r *MemoryTicketRepo) FindByTicketCode(_ context.Context, code string) (*domain.Ticket, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	code = strings.ToUpper(code)
	id, ok := r.byCode[code]
	if !ok {
		// Fallback: search by QR code prefix
		for _, t := range r.tickets {
			if strings.HasPrefix(strings.ToUpper(t.QRCode), code) {
				return copyTicket(t), nil
			}
		}
		return nil, domain.ErrTicketNotFound
	}
	t, ok := r.tickets[id]
	if !ok {
		return nil, domain.ErrTicketNotFound
	}
	return copyTicket(t), nil
}

func (r *MemoryTicketRepo) Update(_ context.Context, ticket *domain.Ticket) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, ok := r.tickets[ticket.ID]; !ok {
		return domain.ErrTicketNotFound
	}
	stored := copyTicket(ticket)
	r.tickets[stored.ID] = stored
	return nil
}

func copyTicket(t *domain.Ticket) *domain.Ticket {
	c := *t
	return &c
}

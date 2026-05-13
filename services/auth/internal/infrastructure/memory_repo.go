package infrastructure

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/scale-ticket/auth/internal/domain"
)

// MemoryUserRepo is a thread-safe, in-memory implementation of UserRepository.
// In production, this would be replaced by a PostgreSQL-backed implementation.
type MemoryUserRepo struct {
	mu       sync.RWMutex
	byID     map[uuid.UUID]*domain.User
	byEmail  map[string]*domain.User
}

// NewMemoryUserRepo creates a new in-memory user repository.
func NewMemoryUserRepo() *MemoryUserRepo {
	return &MemoryUserRepo{
		byID:    make(map[uuid.UUID]*domain.User),
		byEmail: make(map[string]*domain.User),
	}
}

func (r *MemoryUserRepo) FindByID(_ context.Context, id uuid.UUID) (*domain.User, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	u, ok := r.byID[id]
	if !ok || u.DeletedAt != nil {
		return nil, fmt.Errorf("user not found: %s", id)
	}
	return copyUser(u), nil
}

func (r *MemoryUserRepo) FindByEmail(_ context.Context, email string) (*domain.User, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	u, ok := r.byEmail[email]
	if !ok || u.DeletedAt != nil {
		return nil, fmt.Errorf("user not found: %s", email)
	}
	return copyUser(u), nil
}

func (r *MemoryUserRepo) Create(_ context.Context, user *domain.User) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, exists := r.byEmail[user.Email]; exists {
		return fmt.Errorf("email already registered: %s", user.Email)
	}

	stored := copyUser(user)
	r.byID[stored.ID] = stored
	r.byEmail[stored.Email] = stored
	return nil
}

func (r *MemoryUserRepo) Update(_ context.Context, user *domain.User) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	existing, ok := r.byID[user.ID]
	if !ok {
		return fmt.Errorf("user not found: %s", user.ID)
	}

	// If email changed, update the email index
	if existing.Email != user.Email {
		delete(r.byEmail, existing.Email)
	}

	stored := copyUser(user)
	stored.UpdatedAt = time.Now()
	r.byID[stored.ID] = stored
	r.byEmail[stored.Email] = stored
	return nil
}

func (r *MemoryUserRepo) SoftDelete(_ context.Context, id uuid.UUID) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	u, ok := r.byID[id]
	if !ok {
		return fmt.Errorf("user not found: %s", id)
	}

	now := time.Now()
	u.DeletedAt = &now
	u.UpdatedAt = now
	return nil
}

// copyUser returns a shallow copy so callers cannot mutate the store.
func copyUser(u *domain.User) *domain.User {
	copy := *u
	return &copy
}

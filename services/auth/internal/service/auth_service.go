package service

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/scale-ticket/auth/internal/domain"
	"github.com/scale-ticket/auth/internal/infrastructure"
	"golang.org/x/crypto/bcrypt"
)

var (
	ErrInvalidCredentials = errors.New("invalid email or password")
	ErrEmailTaken         = errors.New("email already registered")
	ErrValidation         = errors.New("validation error")
)

// AuthTokens holds the access and refresh tokens returned after login/register.
type AuthTokens struct {
	AccessToken  string `json:"accessToken"`
	RefreshToken string `json:"refreshToken"`
	ExpiresIn    int    `json:"expiresIn"` // seconds until access token expires
}

// UserResponse is the safe user payload sent to clients (no password hash).
type UserResponse struct {
	ID        uuid.UUID `json:"id"`
	Email     string    `json:"email"`
	FirstName string    `json:"firstName"`
	LastName  string    `json:"lastName"`
	Role      string    `json:"role"`
	IsActive  bool      `json:"isActive"`
	CreatedAt time.Time `json:"createdAt"`
}

// AuthService encapsulates authentication and user management logic.
type AuthService struct {
	repo domain.UserRepository
}

// NewAuthService creates a new auth service backed by the given repository.
func NewAuthService(repo domain.UserRepository) *AuthService {
	return &AuthService{repo: repo}
}

// Register creates a new user account and returns tokens.
func (s *AuthService) Register(ctx context.Context, email, password, firstName, lastName string) (*UserResponse, *AuthTokens, error) {
	// Validate input
	email = strings.TrimSpace(strings.ToLower(email))
	firstName = strings.TrimSpace(firstName)
	lastName = strings.TrimSpace(lastName)

	if email == "" || !strings.Contains(email, "@") {
		return nil, nil, fmt.Errorf("%w: invalid email address", ErrValidation)
	}
	if len(password) < 6 {
		return nil, nil, fmt.Errorf("%w: password must be at least 6 characters", ErrValidation)
	}
	if firstName == "" {
		return nil, nil, fmt.Errorf("%w: first name is required", ErrValidation)
	}
	if lastName == "" {
		return nil, nil, fmt.Errorf("%w: last name is required", ErrValidation)
	}

	// Check for existing user
	if existing, _ := s.repo.FindByEmail(ctx, email); existing != nil {
		return nil, nil, ErrEmailTaken
	}

	// Hash password
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to hash password: %w", err)
	}

	now := time.Now()
	user := &domain.User{
		ID:           uuid.New(),
		Email:        email,
		PasswordHash: string(hash),
		FirstName:    firstName,
		LastName:     lastName,
		Role:         domain.RoleUser,
		IsActive:     true,
		CreatedAt:    now,
		UpdatedAt:    now,
	}

	if err := s.repo.Create(ctx, user); err != nil {
		return nil, nil, fmt.Errorf("failed to create user: %w", err)
	}

	tokens, err := generateTokens(user)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to generate tokens: %w", err)
	}

	slog.Info("User registered", "userId", user.ID, "email", user.Email)

	return toUserResponse(user), tokens, nil
}

// Login authenticates a user and returns tokens.
func (s *AuthService) Login(ctx context.Context, email, password string) (*UserResponse, *AuthTokens, error) {
	email = strings.TrimSpace(strings.ToLower(email))

	user, err := s.repo.FindByEmail(ctx, email)
	if err != nil {
		return nil, nil, ErrInvalidCredentials
	}

	if !user.IsActive {
		return nil, nil, ErrInvalidCredentials
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		return nil, nil, ErrInvalidCredentials
	}

	tokens, err := generateTokens(user)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to generate tokens: %w", err)
	}

	slog.Info("User logged in", "userId", user.ID, "email", user.Email)

	return toUserResponse(user), tokens, nil
}

// ValidateToken verifies a JWT and returns the associated user.
func (s *AuthService) ValidateToken(ctx context.Context, tokenString string) (*UserResponse, error) {
	claims, err := infrastructure.ValidateToken(tokenString)
	if err != nil {
		return nil, err
	}

	user, err := s.repo.FindByID(ctx, claims.UserID)
	if err != nil {
		return nil, fmt.Errorf("user not found for token: %w", err)
	}

	if !user.IsActive {
		return nil, fmt.Errorf("user account is deactivated")
	}

	return toUserResponse(user), nil
}

// GetUser returns a user by ID.
func (s *AuthService) GetUser(ctx context.Context, userID uuid.UUID) (*UserResponse, error) {
	user, err := s.repo.FindByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	return toUserResponse(user), nil
}

func generateTokens(user *domain.User) (*AuthTokens, error) {
	accessToken, err := infrastructure.GenerateAccessToken(
		user.ID, user.Email, user.FirstName, user.LastName, string(user.Role),
	)
	if err != nil {
		return nil, err
	}

	refreshToken, err := infrastructure.GenerateRefreshToken(user.ID)
	if err != nil {
		return nil, err
	}

	return &AuthTokens{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresIn:    900, // 15 minutes in seconds
	}, nil
}

func toUserResponse(u *domain.User) *UserResponse {
	return &UserResponse{
		ID:        u.ID,
		Email:     u.Email,
		FirstName: u.FirstName,
		LastName:  u.LastName,
		Role:      string(u.Role),
		IsActive:  u.IsActive,
		CreatedAt: u.CreatedAt,
	}
}

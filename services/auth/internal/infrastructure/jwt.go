package infrastructure

import (
	"errors"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

// TokenClaims contains the JWT payload.
type TokenClaims struct {
	UserID    uuid.UUID `json:"user_id"`
	Email     string    `json:"email"`
	FirstName string    `json:"first_name"`
	LastName  string    `json:"last_name"`
	Role      string    `json:"role"`
	jwt.RegisteredClaims
}

var (
	ErrInvalidToken = errors.New("invalid or expired token")
	ErrTokenExpired = errors.New("token has expired")
)

func getJWTSecret() []byte {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = "dev-jwt-secret-change-in-production"
	}
	return []byte(secret)
}

func getAccessTokenDuration() time.Duration {
	// Default: 15 minutes
	return 15 * time.Minute
}

func getRefreshTokenDuration() time.Duration {
	// Default: 7 days
	return 7 * 24 * time.Hour
}

// GenerateAccessToken creates a short-lived JWT for API authentication.
func GenerateAccessToken(userID uuid.UUID, email, firstName, lastName, role string) (string, error) {
	claims := TokenClaims{
		UserID:    userID,
		Email:     email,
		FirstName: firstName,
		LastName:  lastName,
		Role:      role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(getAccessTokenDuration())),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "scaleticket-auth",
			Subject:   userID.String(),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(getJWTSecret())
}

// GenerateRefreshToken creates a long-lived JWT for token refresh.
func GenerateRefreshToken(userID uuid.UUID) (string, error) {
	claims := jwt.RegisteredClaims{
		ExpiresAt: jwt.NewNumericDate(time.Now().Add(getRefreshTokenDuration())),
		IssuedAt:  jwt.NewNumericDate(time.Now()),
		Issuer:    "scaleticket-auth",
		Subject:   userID.String(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(getJWTSecret())
}

// ValidateToken parses and validates a JWT, returning the claims if valid.
func ValidateToken(tokenString string) (*TokenClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &TokenClaims{}, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, ErrInvalidToken
		}
		return getJWTSecret(), nil
	})

	if err != nil {
		if errors.Is(err, jwt.ErrTokenExpired) {
			return nil, ErrTokenExpired
		}
		return nil, ErrInvalidToken
	}

	claims, ok := token.Claims.(*TokenClaims)
	if !ok || !token.Valid {
		return nil, ErrInvalidToken
	}

	return claims, nil
}

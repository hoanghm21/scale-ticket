package handler

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strings"

	"github.com/scale-ticket/auth/internal/service"
)

// HTTPHandler serves the REST API for authentication.
type HTTPHandler struct {
	svc *service.AuthService
}

// NewHTTPHandler creates a new HTTP handler backed by the auth service.
func NewHTTPHandler(svc *service.AuthService) *HTTPHandler {
	return &HTTPHandler{svc: svc}
}

// RegisterRoutes wires all auth endpoints to the given mux.
func (h *HTTPHandler) RegisterRoutes(mux *http.ServeMux) {
	mux.HandleFunc("POST /api/auth/register", h.handleRegister)
	mux.HandleFunc("POST /api/auth/login", h.handleLogin)
	mux.HandleFunc("GET /api/auth/me", h.handleMe)
	mux.HandleFunc("POST /api/auth/validate", h.handleValidate)
	mux.HandleFunc("GET /health", h.handleHealth)
}

// ── Handlers ──────────────────────────────────────────────────────────────────

type registerRequest struct {
	Email     string `json:"email"`
	Password  string `json:"password"`
	FirstName string `json:"firstName"`
	LastName  string `json:"lastName"`
}

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type validateRequest struct {
	Token string `json:"token"`
}

type authResponse struct {
	User   *service.UserResponse `json:"user"`
	Tokens *service.AuthTokens   `json:"tokens"`
}

func (h *HTTPHandler) handleRegister(w http.ResponseWriter, r *http.Request) {
	var req registerRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	user, tokens, err := h.svc.Register(r.Context(), req.Email, req.Password, req.FirstName, req.LastName)
	if err != nil {
		if errors.Is(err, service.ErrEmailTaken) {
			writeError(w, http.StatusConflict, "Email already registered")
			return
		}
		if errors.Is(err, service.ErrValidation) {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		slog.Error("registration failed", "error", err)
		writeError(w, http.StatusInternalServerError, "Registration failed")
		return
	}

	writeJSON(w, http.StatusCreated, authResponse{User: user, Tokens: tokens})
}

func (h *HTTPHandler) handleLogin(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	user, tokens, err := h.svc.Login(r.Context(), req.Email, req.Password)
	if err != nil {
		if errors.Is(err, service.ErrInvalidCredentials) {
			writeError(w, http.StatusUnauthorized, "Invalid email or password")
			return
		}
		slog.Error("login failed", "error", err)
		writeError(w, http.StatusInternalServerError, "Login failed")
		return
	}

	writeJSON(w, http.StatusOK, authResponse{User: user, Tokens: tokens})
}

func (h *HTTPHandler) handleMe(w http.ResponseWriter, r *http.Request) {
	tokenString := extractBearerToken(r)
	if tokenString == "" {
		writeError(w, http.StatusUnauthorized, "Missing or invalid Authorization header")
		return
	}

	user, err := h.svc.ValidateToken(r.Context(), tokenString)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "Invalid or expired token")
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{"user": user})
}

// handleValidate is an internal endpoint called by the API gateway to verify
// tokens without exposing the JWT secret to other services.
func (h *HTTPHandler) handleValidate(w http.ResponseWriter, r *http.Request) {
	var req validateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		// Also try Bearer header as fallback
		token := extractBearerToken(r)
		if token == "" {
			writeError(w, http.StatusBadRequest, "Token required in body or Authorization header")
			return
		}
		req.Token = token
	}

	if req.Token == "" {
		req.Token = extractBearerToken(r)
	}

	if req.Token == "" {
		writeError(w, http.StatusBadRequest, "Token is required")
		return
	}

	user, err := h.svc.ValidateToken(r.Context(), req.Token)
	if err != nil {
		writeJSON(w, http.StatusOK, map[string]interface{}{
			"valid": false,
			"error": err.Error(),
		})
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"valid": true,
		"user":  user,
	})
}

func (h *HTTPHandler) handleHealth(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{
		"status":  "ok",
		"service": "auth",
	})
}

// ── Helpers ───────────────────────────────────────────────────────────────────

func extractBearerToken(r *http.Request) string {
	auth := r.Header.Get("Authorization")
	if auth == "" {
		return ""
	}
	parts := strings.SplitN(auth, " ", 2)
	if len(parts) != 2 || !strings.EqualFold(parts[0], "bearer") {
		return ""
	}
	return strings.TrimSpace(parts[1])
}

func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		slog.Error("failed to encode JSON response", "error", err)
	}
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}

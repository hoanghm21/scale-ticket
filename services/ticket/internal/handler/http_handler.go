package handler

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"strings"

	"github.com/scale-ticket/ticket/internal/domain"
	"github.com/scale-ticket/ticket/internal/service"
)

// HTTPHandler serves the REST API for tickets.
type HTTPHandler struct {
	svc *service.TicketService
}

// NewHTTPHandler creates a new HTTP handler.
func NewHTTPHandler(svc *service.TicketService) *HTTPHandler {
	return &HTTPHandler{svc: svc}
}

// RegisterRoutes wires ticket endpoints to the given mux.
func (h *HTTPHandler) RegisterRoutes(mux *http.ServeMux) {
	mux.HandleFunc("POST /api/tickets", h.handleCreate)
	mux.HandleFunc("GET /api/tickets", h.handleListUserTickets)
	mux.HandleFunc("GET /api/tickets/{id}", h.handleGetByID)
	mux.HandleFunc("POST /api/tickets/{id}/checkin", h.handleCheckIn)
	mux.HandleFunc("POST /api/tickets/validate", h.handleValidate)
	mux.HandleFunc("GET /health", h.handleHealth)
}

// ── Handlers ──────────────────────────────────────────────────────────────────

type createTicketRequest struct {
	UserID     string              `json:"userId"`
	EventID    string              `json:"eventId"`
	EventTitle string              `json:"eventTitle"`
	EventDate  string              `json:"eventDate"`
	EventVenue string              `json:"eventVenue"`
	EventImage string              `json:"eventImage"`
	Seats      []service.SeatInput `json:"seats"`
	TotalPrice float64             `json:"totalPrice"`
}

func (h *HTTPHandler) handleCreate(w http.ResponseWriter, r *http.Request) {
	var req createTicketRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.UserID == "" || req.EventID == "" || len(req.Seats) == 0 {
		writeError(w, http.StatusBadRequest, "userId, eventId, and seats are required")
		return
	}

	ticket, err := h.svc.CreateTicket(
		r.Context(),
		req.UserID, req.EventID,
		req.EventTitle, req.EventDate, req.EventVenue, req.EventImage,
		req.Seats, req.TotalPrice,
	)
	if err != nil {
		slog.Error("failed to create ticket", "error", err)
		writeError(w, http.StatusInternalServerError, "Failed to create ticket")
		return
	}

	writeJSON(w, http.StatusCreated, ticket)
}

func (h *HTTPHandler) handleListUserTickets(w http.ResponseWriter, r *http.Request) {
	userID := r.URL.Query().Get("userId")
	if userID == "" {
		// Try extracting from gateway's x-user-id header
		xUser := r.Header.Get("X-User-Id")
		if xUser != "" {
			// Parse the JSON user object from gateway
			var user struct {
				ID string `json:"id"`
			}
			if err := json.Unmarshal([]byte(xUser), &user); err == nil && user.ID != "" {
				userID = user.ID
			}
		}
	}

	if userID == "" {
		writeError(w, http.StatusBadRequest, "userId query parameter is required")
		return
	}

	tickets, err := h.svc.GetUserTickets(r.Context(), userID)
	if err != nil {
		slog.Error("failed to list tickets", "error", err, "userId", userID)
		writeError(w, http.StatusInternalServerError, "Failed to fetch tickets")
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"tickets": tickets,
		"total":   len(tickets),
	})
}

func (h *HTTPHandler) handleGetByID(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if id == "" {
		writeError(w, http.StatusBadRequest, "Ticket ID is required")
		return
	}

	ticket, err := h.svc.GetTicket(r.Context(), id)
	if err != nil {
		if errors.Is(err, domain.ErrTicketNotFound) {
			writeError(w, http.StatusNotFound, "Ticket not found")
			return
		}
		slog.Error("failed to get ticket", "error", err, "id", id)
		writeError(w, http.StatusInternalServerError, "Failed to fetch ticket")
		return
	}

	writeJSON(w, http.StatusOK, ticket)
}

func (h *HTTPHandler) handleCheckIn(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if id == "" {
		writeError(w, http.StatusBadRequest, "Ticket ID is required")
		return
	}

	ticket, err := h.svc.CheckIn(r.Context(), id)
	if err != nil {
		if errors.Is(err, domain.ErrTicketNotFound) {
			writeError(w, http.StatusNotFound, "Ticket not found")
			return
		}
		if errors.Is(err, domain.ErrAlreadyCheckedIn) {
			writeError(w, http.StatusConflict, "Ticket already checked in")
			return
		}
		slog.Error("failed to check in ticket", "error", err, "id", id)
		writeError(w, http.StatusInternalServerError, "Check-in failed")
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"message": "Ticket checked in successfully",
		"ticket":  ticket,
	})
}

type validateRequest struct {
	Code string `json:"code"`
}

func (h *HTTPHandler) handleValidate(w http.ResponseWriter, r *http.Request) {
	var req validateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.Code == "" {
		writeError(w, http.StatusBadRequest, "Ticket code is required")
		return
	}

	valid, status, err := h.svc.ValidateTicket(r.Context(), req.Code)
	if err != nil {
		slog.Error("failed to validate ticket", "error", err, "code", req.Code)
		writeError(w, http.StatusInternalServerError, "Validation failed")
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"valid":  valid,
		"status": status,
	})
}

func (h *HTTPHandler) handleHealth(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{
		"status":  "ok",
		"service": "ticket",
	})
}

// ── CORS Middleware ────────────────────────────────────────────────────────────

func CORSMiddleware(next http.Handler) http.Handler {
	origins := os.Getenv("CORS_ORIGINS")
	if origins == "" {
		origins = "http://localhost:3000,http://localhost:3001,http://localhost:4000"
	}
	allowedOrigins := strings.Split(origins, ",")
	for i, o := range allowedOrigins {
		allowedOrigins[i] = strings.TrimSpace(o)
	}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		for _, o := range allowedOrigins {
			if o == origin {
				w.Header().Set("Access-Control-Allow-Origin", origin)
				w.Header().Set("Access-Control-Allow-Credentials", "true")
				break
			}
		}
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Request-ID, X-User-Id")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

// ── Helpers ───────────────────────────────────────────────────────────────────

func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}

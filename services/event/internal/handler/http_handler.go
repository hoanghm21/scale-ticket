package handler

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"strings"

	"github.com/scale-ticket/event/internal/domain"
	"github.com/scale-ticket/event/internal/service"
)

// HTTPHandler serves the REST API for events.
type HTTPHandler struct {
	svc *service.EventService
}

// NewHTTPHandler creates a new HTTP handler.
func NewHTTPHandler(svc *service.EventService) *HTTPHandler {
	return &HTTPHandler{svc: svc}
}

// RegisterRoutes wires event endpoints to the given mux.
func (h *HTTPHandler) RegisterRoutes(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/events", h.handleList)
	mux.HandleFunc("GET /api/events/{id}", h.handleGetByID)
	mux.HandleFunc("POST /api/events", h.handleCreate)
	mux.HandleFunc("GET /health", h.handleHealth)
}

// ── Handlers ──────────────────────────────────────────────────────────────────

func (h *HTTPHandler) handleList(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// Check for query params
	query := r.URL.Query().Get("q")
	category := r.URL.Query().Get("category")

	var events []service.EventResponse
	var err error

	switch {
	case query != "":
		events, err = h.svc.SearchEvents(ctx, query)
	case category != "" && category != "All":
		events, err = h.svc.FilterByCategory(ctx, category)
	default:
		events, err = h.svc.ListAll(ctx)
	}

	if err != nil {
		slog.Error("failed to list events", "error", err)
		writeError(w, http.StatusInternalServerError, "Failed to fetch events")
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"events": events,
		"total":  len(events),
	})
}

func (h *HTTPHandler) handleGetByID(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if id == "" {
		writeError(w, http.StatusBadRequest, "Event ID is required")
		return
	}

	event, err := h.svc.GetByID(r.Context(), id)
	if err != nil {
		if errors.Is(err, domain.ErrEventNotFound) {
			writeError(w, http.StatusNotFound, "Event not found")
			return
		}
		slog.Error("failed to get event", "error", err, "id", id)
		writeError(w, http.StatusInternalServerError, "Failed to fetch event")
		return
	}

	writeJSON(w, http.StatusOK, event)
}

type createEventRequest struct {
	Title      string  `json:"title"`
	Category   string  `json:"category"`
	Venue      string  `json:"venue"`
	Date       string  `json:"date"`
	Image      string  `json:"image"`
	PriceStart float64 `json:"priceStart"`
}

func (h *HTTPHandler) handleCreate(w http.ResponseWriter, r *http.Request) {
	var req createEventRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.Title == "" || req.Category == "" || req.Venue == "" {
		writeError(w, http.StatusBadRequest, "title, category, and venue are required")
		return
	}

	event, err := h.svc.CreateEvent(r.Context(), req.Title, req.Category, req.Venue, req.Date, req.Image, req.PriceStart)
	if err != nil {
		slog.Error("failed to create event", "error", err)
		writeError(w, http.StatusInternalServerError, "Failed to create event")
		return
	}

	writeJSON(w, http.StatusCreated, event)
}

func (h *HTTPHandler) handleHealth(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{
		"status":  "ok",
		"service": "event",
	})
}

// ── CORS Middleware ────────────────────────────────────────────────────────────

// CORSMiddleware adds CORS headers with configurable origins.
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
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Request-ID")

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

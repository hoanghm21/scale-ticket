package main

import (
	"context"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/reflection"

	"github.com/scale-ticket/ticket/internal/handler"
	"github.com/scale-ticket/ticket/internal/infrastructure"
	"github.com/scale-ticket/ticket/internal/service"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))
	slog.SetDefault(logger)

	// ── Dependencies ──────────────────────────────────────────────────────────
	ticketRepo := infrastructure.NewMemoryTicketRepo()
	ticketService := service.NewTicketService(ticketRepo)
	httpHandler := handler.NewHTTPHandler(ticketService)

	// ── HTTP Server (REST API) ────────────────────────────────────────────────
	httpPort := os.Getenv("HTTP_PORT")
	if httpPort == "" {
		httpPort = "4012"
	}

	mux := http.NewServeMux()
	httpHandler.RegisterRoutes(mux)

	httpServer := &http.Server{
		Addr:         fmt.Sprintf(":%s", httpPort),
		Handler:      handler.CORSMiddleware(mux),
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		slog.Info("Ticket HTTP server starting", "port", httpPort)
		if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("HTTP server failed", "error", err)
			os.Exit(1)
		}
	}()

	// ── gRPC Server ───────────────────────────────────────────────────────────
	grpcPort := os.Getenv("GRPC_PORT")
	if grpcPort == "" {
		grpcPort = "50053"
	}

	lis, err := net.Listen("tcp", fmt.Sprintf(":%s", grpcPort))
	if err != nil {
		slog.Error("failed to listen", "error", err, "port", grpcPort)
		os.Exit(1)
	}

	grpcServer := grpc.NewServer()
	// TODO: Register gRPC ticket service handlers when proto is generated
	reflection.Register(grpcServer)

	go func() {
		slog.Info("Ticket gRPC server starting", "port", grpcPort)
		if err := grpcServer.Serve(lis); err != nil {
			slog.Error("gRPC server failed", "error", err)
			os.Exit(1)
		}
	}()

	// ── Graceful shutdown ─────────────────────────────────────────────────────
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	<-ctx.Done()
	slog.Info("Ticket service shutting down...")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := httpServer.Shutdown(shutdownCtx); err != nil {
		slog.Error("HTTP shutdown error", "error", err)
	}
	grpcServer.GracefulStop()

	slog.Info("Ticket service stopped")
}

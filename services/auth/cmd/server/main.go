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

	pb "github.com/scale-ticket/proto/gen/go"

	"github.com/scale-ticket/auth/internal/handler"
	"github.com/scale-ticket/auth/internal/infrastructure"
	"github.com/scale-ticket/auth/internal/service"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))
	slog.SetDefault(logger)

	// ── Dependencies ──────────────────────────────────────────────────────────
	userRepo := infrastructure.NewMemoryUserRepo()
	authService := service.NewAuthService(userRepo)
	httpHandler := handler.NewHTTPHandler(authService)

	// ── HTTP Server (REST API — proxied by the gateway) ───────────────────────
	httpPort := os.Getenv("HTTP_PORT")
	if httpPort == "" {
		httpPort = "4010"
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
		slog.Info("Auth HTTP server starting", "port", httpPort)
		if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("HTTP server failed", "error", err)
			os.Exit(1)
		}
	}()

	// ── gRPC Server (inter-service communication) ─────────────────────────────
	grpcPort := os.Getenv("GRPC_PORT")
	if grpcPort == "" {
		grpcPort = "50051"
	}

	lis, err := net.Listen("tcp", fmt.Sprintf(":%s", grpcPort))
	if err != nil {
		slog.Error("failed to listen", "error", err, "port", grpcPort)
		os.Exit(1)
	}

	grpcServer := grpc.NewServer()

	pb.RegisterAuthServiceServer(grpcServer, handler.NewAuthGRPCHandler(authService))

	// Enable reflection for development
	reflection.Register(grpcServer)

	go func() {
		slog.Info("Auth gRPC server starting", "port", grpcPort)
		if err := grpcServer.Serve(lis); err != nil {
			slog.Error("gRPC server failed", "error", err)
			os.Exit(1)
		}
	}()

	// ── Graceful shutdown ─────────────────────────────────────────────────────
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	<-ctx.Done()
	slog.Info("Auth service shutting down...")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := httpServer.Shutdown(shutdownCtx); err != nil {
		slog.Error("HTTP shutdown error", "error", err)
	}
	grpcServer.GracefulStop()

	slog.Info("Auth service stopped")
}

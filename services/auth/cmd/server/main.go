package main

import (
	"context"
	"fmt"
	"log/slog"
	"net"
	"os"
	"os/signal"
	"syscall"

	"google.golang.org/grpc"
	"google.golang.org/grpc/reflection"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))
	slog.SetDefault(logger)

	port := os.Getenv("GRPC_PORT")
	if port == "" {
		port = "50051"
	}

	lis, err := net.Listen("tcp", fmt.Sprintf(":%s", port))
	if err != nil {
		slog.Error("failed to listen", "error", err, "port", port)
		os.Exit(1)
	}

	grpcServer := grpc.NewServer()

	// TODO: Register auth service handlers
	// pb.RegisterAuthServiceServer(grpcServer, handler.NewAuthHandler(svc))

	// Enable reflection for development
	reflection.Register(grpcServer)

	// Graceful shutdown
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	go func() {
		slog.Info("Auth service starting", "port", port)
		if err := grpcServer.Serve(lis); err != nil {
			slog.Error("failed to serve", "error", err)
			os.Exit(1)
		}
	}()

	<-ctx.Done()
	slog.Info("Auth service shutting down...")
	grpcServer.GracefulStop()
	slog.Info("Auth service stopped")
}

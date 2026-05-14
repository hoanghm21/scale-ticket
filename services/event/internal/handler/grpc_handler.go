package handler

import (
	"context"

	pb "github.com/scale-ticket/proto/gen/go"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	"github.com/scale-ticket/event/internal/service"
)

type VenueGRPCHandler struct {
	pb.UnimplementedVenueServiceServer
	svc *service.EventService
}

func NewVenueGRPCHandler(svc *service.EventService) *VenueGRPCHandler {
	return &VenueGRPCHandler{svc: svc}
}

func (h *VenueGRPCHandler) CreateVenueLayout(ctx context.Context, req *pb.CreateVenueLayoutRequest) (*pb.CreateVenueLayoutResponse, error) {
	return nil, status.Error(codes.Unimplemented, "CreateVenueLayout not implemented; venue layout persistence pending")
}

func (h *VenueGRPCHandler) GetVenueLayout(ctx context.Context, req *pb.GetVenueLayoutRequest) (*pb.GetVenueLayoutResponse, error) {
	return nil, status.Error(codes.Unimplemented, "GetVenueLayout not implemented; venue layout persistence pending")
}

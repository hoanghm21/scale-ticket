package handler

import (
	"context"

	pb "github.com/scale-ticket/proto/gen/go"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	"github.com/scale-ticket/ticket/internal/service"
)

type TicketGRPCHandler struct {
	pb.UnimplementedTicketServiceServer
	svc *service.TicketService
}

func NewTicketGRPCHandler(svc *service.TicketService) *TicketGRPCHandler {
	return &TicketGRPCHandler{svc: svc}
}

func (h *TicketGRPCHandler) ReserveSeat(ctx context.Context, req *pb.ReserveSeatRequest) (*pb.ReserveSeatResponse, error) {
	return nil, status.Error(codes.Unimplemented, "ReserveSeat not implemented; inventory/reservation service pending")
}

func (h *TicketGRPCHandler) PurchaseTickets(ctx context.Context, req *pb.PurchaseTicketsRequest) (*pb.PurchaseTicketsResponse, error) {
	return nil, status.Error(codes.Unimplemented, "PurchaseTickets not implemented; use HTTP /api/tickets endpoint")
}

func (h *TicketGRPCHandler) GetEventSeatAvailability(ctx context.Context, req *pb.GetEventSeatAvailabilityRequest) (*pb.GetEventSeatAvailabilityResponse, error) {
	return nil, status.Error(codes.Unimplemented, "GetEventSeatAvailability not implemented; seat inventory pending")
}

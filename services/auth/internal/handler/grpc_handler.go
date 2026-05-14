package handler

import (
	"context"

	"github.com/google/uuid"
	pb "github.com/scale-ticket/proto/gen/go"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	"github.com/scale-ticket/auth/internal/service"
)

type AuthGRPCHandler struct {
	pb.UnimplementedAuthServiceServer
	svc *service.AuthService
}

func NewAuthGRPCHandler(svc *service.AuthService) *AuthGRPCHandler {
	return &AuthGRPCHandler{svc: svc}
}

func (h *AuthGRPCHandler) ValidateToken(ctx context.Context, req *pb.ValidateTokenRequest) (*pb.ValidateTokenResponse, error) {
	if req.GetToken() == "" {
		return nil, status.Error(codes.InvalidArgument, "token is required")
	}

	user, err := h.svc.ValidateToken(ctx, req.GetToken())
	if err != nil {
		return &pb.ValidateTokenResponse{IsValid: false}, nil
	}

	return &pb.ValidateTokenResponse{
		IsValid: true,
		UserId:  user.ID.String(),
		Role:    user.Role,
	}, nil
}

func (h *AuthGRPCHandler) GetUser(ctx context.Context, req *pb.GetUserRequest) (*pb.GetUserResponse, error) {
	if req.GetUserId() == "" {
		return nil, status.Error(codes.InvalidArgument, "user_id is required")
	}

	uid, err := uuid.Parse(req.GetUserId())
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, "user_id must be a valid UUID")
	}

	user, err := h.svc.GetUser(ctx, uid)
	if err != nil {
		return nil, status.Error(codes.NotFound, "user not found")
	}

	return &pb.GetUserResponse{
		Id:        user.ID.String(),
		Email:     user.Email,
		FirstName: user.FirstName,
		LastName:  user.LastName,
		Role:      user.Role,
	}, nil
}

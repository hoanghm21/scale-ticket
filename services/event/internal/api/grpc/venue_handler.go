package grpc

import (
	// "context" // Uncomment once buf-generated handlers below are enabled

	"github.com/scale-ticket/event/internal/domain"
	// "github.com/scale-ticket/event/internal/domain/proto/venue" // Uncomment once buf generate succeeds

	// "go.mongodb.org/mongo-driver/bson/primitive" // Uncomment once buf-generated handlers below are enabled
)

// VenueServiceHandler implements the gRPC interface generated from venue.proto
type VenueServiceHandler struct {
	// pb.UnimplementedVenueServiceServer
	repo domain.VenueRepository
}

func NewVenueServiceHandler(repo domain.VenueRepository) *VenueServiceHandler {
	return &VenueServiceHandler{
		repo: repo,
	}
}

/*
// Uncomment when venue.proto is compiled via Buf!

func (h *VenueServiceHandler) CreateVenueLayout(ctx context.Context, req *pb.CreateVenueLayoutRequest) (*pb.CreateVenueLayoutResponse, error) {
	layout := req.GetLayout()
	
	// Complex Protobuf Mapper to Domain (simulated here)
	domainLayout := &domain.VenueLayout{
		VenueName: layout.Name,
		Category:  layout.Category,
		Sections:  make([]domain.VenueSection, 0),
	}

	for _, sec := range layout.Sections {
		domainLayout.Sections = append(domainLayout.Sections, domain.VenueSection{
			ID:          sec.Id,
			Name:        sec.Name,
			Type:        sec.Type,
			Rows:        sec.Rows,
			SeatsPerRow: sec.SeatsPerRow,
			BasePrice:   sec.BasePrice,
			CurveFactor: sec.CurveFactor,
			// Shape translation omitted for brevity
		})
	}

	err := h.repo.Save(ctx, domainLayout)
	if err != nil {
		return &pb.CreateVenueLayoutResponse{Success: false}, err
	}

	return &pb.CreateVenueLayoutResponse{
		Id:      domainLayout.ID.Hex(),
		Success: true,
	}, nil
}

func (h *VenueServiceHandler) GetVenueLayout(ctx context.Context, req *pb.GetVenueLayoutRequest) (*pb.GetVenueLayoutResponse, error) {
	venue, err := h.repo.FindByID(ctx, req.GetId())
	if err != nil || venue == nil {
		return nil, err // Return proper gRPC NotFound error here
	}

	// Domain to Protobuf Mapper
	pbLayout := &pb.VenueLayoutSchema{
		Id:       venue.ID.Hex(),
		Name:     venue.VenueName,
		Category: venue.Category,
	}

	for _, sec := range venue.Sections {
		pbLayout.Sections = append(pbLayout.Sections, &pb.VenueSection{
			Id:          sec.ID,
			Name:        sec.Name,
			Type:        sec.Type,
			Rows:        sec.Rows,
			SeatsPerRow: sec.SeatsPerRow,
			BasePrice:   sec.BasePrice,
			CurveFactor: sec.CurveFactor,
			// Shape translation omitted for brevity
		})
	}

	return &pb.GetVenueLayoutResponse{
		Layout: pbLayout,
	}, nil
}
*/

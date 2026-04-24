package infrastructure

import (
	"context"

	"github.com/scale-ticket/event/internal/domain"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type MongoVenueRepository struct {
	collection *mongo.Collection
}

func NewMongoVenueRepository(db *mongo.Database) *MongoVenueRepository {
	return &MongoVenueRepository{
		collection: db.Collection("venues"),
	}
}

// Save inserts a new VenueLayout. We do not do complex upserts yet.
func (r *MongoVenueRepository) Save(ctx context.Context, layout *domain.VenueLayout) error {
	// If ID is nil/empty, generate a new one
	if layout.ID.IsZero() {
		layout.ID = primitive.NewObjectID()
	}

	_, err := r.collection.InsertOne(ctx, layout)
	return err
}

func (r *MongoVenueRepository) FindByID(ctx context.Context, id string) (*domain.VenueLayout, error) {
	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}

	var venue domain.VenueLayout
	err = r.collection.FindOne(ctx, bson.M{"_id": objID}).Decode(&venue)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil // Return nil on not found
		}
		return nil, err
	}

	return &venue, nil
}

func (r *MongoVenueRepository) FindAll(ctx context.Context) ([]*domain.VenueLayout, error) {
	cursor, err := r.collection.Find(ctx, bson.M{})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var venues []*domain.VenueLayout
	if err := cursor.All(ctx, &venues); err != nil {
		return nil, err
	}

	return venues, nil
}

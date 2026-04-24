package infrastructure

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

type SeatLockManager struct {
	client *redis.Client
}

func NewSeatLockManager(redisURL string) (*SeatLockManager, error) {
	opts, err := redis.ParseURL(redisURL)
	if err != nil {
		return nil, err
	}
	
	client := redis.NewClient(opts)
	if err := client.Ping(context.Background()).Err(); err != nil {
		return nil, err
	}

	return &SeatLockManager{
		client: client,
	}, nil
}

// LockSeat atomic lock to prevent snipe conditions. 
// Uses SETNX under the hood to ensure only one user holds the lock.
func (m *SeatLockManager) LockSeat(ctx context.Context, venueID, seatID, userID string, duration time.Duration) (bool, error) {
	key := fmt.Sprintf("seat_lock:%s:%s", venueID, seatID)
	
	// Attempt to set the key only if it doesn't exist
	locked, err := m.client.SetNX(ctx, key, userID, duration).Result()
	if err != nil {
		return false, err
	}
	
	return locked, nil
}

// UnlockSeat releases the seat back to the pool
func (m *SeatLockManager) UnlockSeat(ctx context.Context, venueID, seatID string) error {
	key := fmt.Sprintf("seat_lock:%s:%s", venueID, seatID)
	return m.client.Del(ctx, key).Err()
}

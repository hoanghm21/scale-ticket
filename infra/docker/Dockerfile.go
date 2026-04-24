FROM golang:1.22-alpine AS builder

# Set the working directory to the monorepo root
WORKDIR /app

# Copy the entire monorepo
COPY . .

# The build argument passed from docker-compose.yml
ARG SERVICE_PATH

# Navigate to the specific service
WORKDIR /app/${SERVICE_PATH}

# Download dependencies (generate go.sum if missing) and build
RUN go mod tidy
RUN CGO_ENABLED=0 GOOS=linux go build -o /app/server ./cmd/server

# Final lightweight stage
FROM alpine:latest
WORKDIR /app

# Add certificates for external API calls if necessary
RUN apk --no-cache add ca-certificates

# Copy the built binary
COPY --from=builder /app/server .

CMD ["./server"]

# Multi-stage Docker build for Go Backend
FROM golang:alpine AS builder

WORKDIR /app

# Install git and build dependencies
RUN apk add --no-cache git ca-certificates tzdata

# Cache go modules
COPY go.mod go.sum ./
RUN go mod download

# Copy application source code
COPY . .

# Build static binary
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-w -s" -o server ./cmd/server

# Minimal runtime stage
FROM alpine:3.20

WORKDIR /app

RUN apk add --no-cache ca-certificates tzdata

# Copy compiled binary and migrations from builder
COPY --from=builder /app/server .
COPY migrations ./migrations

# Expose API port
EXPOSE 8080

# Run server
CMD ["./server"]

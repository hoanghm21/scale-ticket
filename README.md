# 🎫 ScaleTicket

> A real-time, event-driven ticketing platform built with microservices architecture.

[![CI](https://github.com/your-org/scale-ticket/actions/workflows/ci.yml/badge.svg)](https://github.com/your-org/scale-ticket/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Overview

ScaleTicket is a high-performance, scalable event ticketing system designed for real-time seat selection, instant booking, and live event management. It supports Web, Mobile, and Desktop clients backed by a resilient microservices architecture.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Applications                       │
│  ┌──────────┐    ┌───────────────┐    ┌───────────────────┐     │
│  │   Web     │    │    Mobile     │    │     Desktop       │     │
│  │ Next.js   │    │ React Native  │    │   Tauri + Rust    │     │
│  │ React     │    │               │    │                   │     │
│  │ Tailwind  │    │               │    │                   │     │
│  │ Canvas    │    │               │    │                   │     │
│  └─────┬─────┘    └──────┬────────┘    └────────┬──────────┘     │
│        │                 │                      │                │
├────────┴─────────────────┴──────────────────────┴────────────────┤
│                     API Gateway (Node.js)                        │
│                   REST ─ gRPC ─ Socket.IO                        │
├──────────────────────────────────────────────────────────────────┤
│                       Microservices                              │
│  ┌────────┐  ┌────────┐  ┌─────────┐  ┌──────────┐  ┌────────┐ │
│  │  Auth  │  │ Event  │  │ Ticket  │  │ Payment  │  │Notific.│ │
│  │  (Go)  │  │  (Go)  │  │  (Go)   │  │ (Node)   │  │ (Node) │ │
│  └────┬───┘  └───┬────┘  └────┬────┘  └────┬─────┘  └───┬────┘ │
│       │          │            │             │             │      │
├───────┴──────────┴────────────┴─────────────┴─────────────┴──────┤
│                        Data Layer                                │
│  ┌────────────┐    ┌───────────┐    ┌───────────────┐           │
│  │ PostgreSQL │    │  MongoDB  │    │     Redis     │           │
│  │  (Primary) │    │  (Events) │    │   (Cache/RT)  │           │
│  └────────────┘    └───────────┘    └───────────────┘           │
└──────────────────────────────────────────────────────────────────┘
```

## Project Structure

```
ScaleTicket/
├── .agents/              # AI agent configurations per domain
├── .github/              # CI/CD workflows
├── apps/
│   ├── web/              # Next.js + React + TailwindCSS + Canvas API
│   ├── mobile/           # React Native (Expo)
│   └── desktop/          # Tauri + Rust
├── services/
│   ├── gateway/          # API Gateway — Node.js
│   ├── auth/             # Authentication & Authorization — Go
│   ├── event/            # Event Management — Go
│   ├── ticket/           # Ticket & Seat Management — Go
│   ├── payment/          # Payment Processing — Node.js
│   ├── notification/     # Notifications (Email/Push/SMS) — Node.js
│   └── realtime/         # Real-time WebSocket Service — Node.js + Socket.IO
├── packages/
│   ├── proto/            # gRPC / Protobuf definitions
│   ├── shared-types/     # Shared TypeScript type definitions
│   ├── ui/               # Shared UI component library
│   └── utils/            # Shared utility functions
├── infra/
│   ├── docker/           # Dockerfiles per service
│   ├── k8s/              # Kubernetes manifests
│   └── terraform/        # Terraform IaC modules
├── docs/                 # Architecture & API documentation
└── scripts/              # Build, setup, and dev scripts
```

## Tech Stack

| Layer       | Technology                                  |
|-------------|---------------------------------------------|
| Web Client  | Next.js, React, TailwindCSS, Canvas API     |
| Mobile      | React Native (Expo)                         |
| Desktop     | Tauri, Rust                                 |
| Gateway     | Node.js, Express, Socket.IO                 |
| Services    | Go (core), Node.js (integration)            |
| Comms       | gRPC (inter-service), Socket.IO (real-time) |
| Database    | PostgreSQL, MongoDB, Redis                  |
| DevOps      | Docker, Kubernetes, Terraform               |
| CI/CD       | GitHub Actions                              |
| Monorepo    | pnpm workspaces + Turborepo                 |

## Getting Started

### Prerequisites

- **Node.js** >= 20.x
- **pnpm** >= 9.x
- **Go** >= 1.22
- **Rust** >= 1.77
- **Docker** & Docker Compose
- **Protocol Buffers** compiler (`protoc`)

### Quick Start

```bash
# Clone the repository
git clone https://github.com/your-org/scale-ticket.git
cd scale-ticket

# Install dependencies
pnpm install

# Start infrastructure (databases, message broker)
docker compose up -d

# Run all services in development mode
pnpm dev
```

### Individual App Development

```bash
# Web client
pnpm --filter @scale-ticket/web dev

# Mobile client
pnpm --filter @scale-ticket/mobile start

# Desktop client
pnpm --filter @scale-ticket/desktop dev
```

## Documentation

- [Architecture Overview](./docs/architecture.md)
- [API Design Guide](./docs/api-design.md)
- [Contributing Guide](./docs/contributing.md)

## License

MIT © ScaleTicket Team

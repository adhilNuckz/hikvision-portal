# Hikvision Terminal Control Portal

A modern, high-performance web portal to control Hikvision DS-K1T320MFWX-B facial recognition terminals via the ISAPI protocol.

## Features
- **Real-time Connectivity Test**: Instant feedback on device status.
- **User Management**: Add, view, and delete users directly from the web interface.
- **Remote Control**: Open doors with a single click.
- **Security Dashboard**: Overview of device stats and security status.
- **Premium UI**: Dark mode, glassmorphism, and smooth animations.

## Tech Stack
- **Frontend**: React, Vite, Tailwind CSS (via custom CSS), Framer Motion, Lucide Icons.
- **Backend**: NestJS, Axios, @mhoc/axios-digest-auth (for ISAPI Digest Authentication).

## Getting Started

### Prerequisites
- Node.js (v18+)
- Hikvision Terminal IP: 192.168.137.23
- Credentials: admin / 1234567890ab

### 1. Setup Backend
```bash
cd backend
npm install
# Configure .env (already created for you)
npm run start:dev
```

### 2. Setup Frontend
```bash
cd frontend
npm install
npm run dev
```

The portal will be available at `http://localhost:5173` and the API at `http://localhost:3000`.

## Architecture
The backend acts as a proxy for the Hikvision ISAPI, handling the Digest Authentication challenge which is otherwise difficult to manage from a browser due to CORS and security limitations.

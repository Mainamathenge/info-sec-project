# Package Management Frontend

React frontend for the Hyperledger Fabric-based package management system.

## Features

- 🔐 **Authentication**: Login, register, and MFA support
- 📦 **Package Management**: Browse, upload, download, and validate packages
- 🔔 **Subscriptions**: Subscribe to package updates
- 💬 **Comments**: Comment on packages
- 👤 **User Profile**: Manage account and MFA settings

## Tech Stack

- **React 18** with TypeScript
- **Vite** for fast development
- **TailwindCSS** for styling
- **React Router** for navigation
- **Axios** for API requests
- **Lucide React** for icons

## Getting Started

### Prerequisites

- Node.js 20+
- Backend API running on `http://localhost:3000`

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Environment Variables

Create a `.env` file in the root directory:

```env
VITE_API_URL=http://localhost:3000
```

For production, update this to your deployed backend URL.

## Project Structure

```
src/
├── api/           # API client configuration
├── components/    # Reusable components
├── contexts/      # React contexts (Auth)
├── pages/         # Page components
├── types/         # TypeScript type definitions
├── App.tsx        # Main app component with routing
└── main.tsx       # Entry point
```

## Available Pages

- `/login` - Login page
- `/register` - Registration page
- `/` - Dashboard (protected)
- `/package/:id` - Package details (protected)
- `/upload` - Upload package (owner/admin only)
- `/subscriptions` - User subscriptions (protected)
- `/profile` - User profile and MFA settings (protected)

## API Integration

The frontend connects to the backend API at the URL specified in `VITE_API_URL`. All authenticated requests include a JWT token in the Authorization header.

## License

MIT

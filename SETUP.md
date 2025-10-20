# Jamia Backend Setup Guide

This NestJS backend provides a REST API for the Jamia AcroYoga jam management platform.

## Prerequisites

- Node.js 18+ installed
- pnpm package manager
- Supabase project with database already set up

## Environment Setup

1. **Copy the environment template:**
   ```bash
   cp .env.example .env
   ```

2. **Configure environment variables in `.env`:**

   ```env
   # Server Configuration
   PORT=3001

   # Supabase Configuration
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_KEY=your_service_role_key_here
   SUPABASE_JWT_SECRET=your_jwt_secret_here
   ```

### Where to find Supabase credentials:

- **SUPABASE_URL**: Go to your Supabase project → Settings → API → Project URL
- **SUPABASE_SERVICE_KEY**: Go to your Supabase project → Settings → API → service_role key (⚠️ Keep this secret!)
- **SUPABASE_JWT_SECRET**: Go to your Supabase project → Settings → API → JWT Secret

## Installation

```bash
# Install dependencies
pnpm install
```

## Running the Application

### Development Mode
```bash
pnpm run start:dev
```

The server will start on `http://localhost:3001`

### Production Mode
```bash
# Build the application
pnpm run build

# Run in production
pnpm run start:prod
```

## API Endpoints

### Authentication
All endpoints require a valid Supabase JWT token in the Authorization header:
```
Authorization: Bearer <your-supabase-jwt-token>
```

### Profiles
- `GET /profiles/:id` - Get profile by ID
- `PATCH /profiles/:id` - Update profile

### Jams
- `GET /jams` - Get all published jams
- `GET /jams/my` - Get current user's owned jams
- `GET /jams/participating` - Get jams user is participating in
- `GET /jams/:id` - Get jam details
- `POST /jams` - Create a new jam
- `PATCH /jams/:id` - Update jam
- `POST /jams/:id/publish` - Publish a jam
- `DELETE /jams/:id` - Delete jam

### Participants
- `GET /participants/jams/:jamId` - Get jam participants (owner only)
- `GET /participants/jams/:jamId/my-participation` - Get user's participation status
- `POST /participants/jams/:jamId` - Join a jam
- `PATCH /participants/:id/cancel` - Cancel participation
- `DELETE /participants/:id` - Remove participant (owner only)

## Project Structure

```
src/
├── auth/
│   ├── supabase-auth.guard.ts  # JWT validation guard
│   └── user.decorator.ts       # User decorator for extracting auth user
├── config/
│   └── supabase.config.ts      # Supabase client configuration
├── profiles/
│   ├── dto/
│   ├── profiles.controller.ts
│   ├── profiles.service.ts
│   └── profiles.module.ts
├── jams/
│   ├── dto/
│   ├── jams.controller.ts
│   ├── jams.service.ts
│   └── jams.module.ts
├── participants/
│   ├── dto/
│   ├── participants.controller.ts
│   ├── participants.service.ts
│   └── participants.module.ts
├── audit/
│   ├── audit.service.ts
│   └── audit.module.ts
├── app.module.ts
└── main.ts
```

## Features

- ✅ Supabase authentication integration
- ✅ JWT token validation
- ✅ Complete CRUD operations for jams
- ✅ Participant management with capacity limits
- ✅ Automatic waiting list promotion
- ✅ Audit logging for all actions
- ✅ Proper authorization checks
- ✅ Input validation with class-validator
- ✅ CORS enabled for frontend

## Authorization Rules

- Users can only update their own profile
- Users can create jams (become owner)
- Jam owners can update, publish, and delete their jams
- Jam owners can view and manage participants
- Users can join published jams
- Users can cancel their own participation
- Auto-promotion from waiting list when enabled

## Troubleshooting

### "Missing authorization header" error
Make sure the frontend is sending the Supabase JWT token in the Authorization header.

### "Invalid or expired token" error
The JWT token might be expired. The frontend should refresh it using Supabase auth.

### CORS errors
Make sure the frontend URL is listed in the CORS configuration in `main.ts`.

### Database connection issues
- Verify SUPABASE_URL and SUPABASE_SERVICE_KEY are correct
- Make sure your Supabase project is active
- Check that the database tables exist (run migrations in frontend project)

## Development

### Linting
```bash
pnpm run lint
```

### Testing
```bash
pnpm run test
```

## Next Steps

- Add email notifications for waiting list promotions
- Implement jam search and filtering
- Add file upload for profile photos
- Implement admin dashboard
- Add real-time updates with websockets


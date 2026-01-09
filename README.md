# EnaZeda Backend Server

Backend API for the EnaZeda safety platform.

## Features

- Phone-based authentication with OTP
- Email/Password authentication
- Google OAuth support
- Real-time incident reporting
- Heatmap data generation
- Walk With Me session management
- Emergency contacts management
- Safe spaces API
- Rate limiting and security

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy `.env.example` to `.env` and configure:
```bash
cp .env.example .env
```

3. Start MongoDB (if using local instance):
```bash
mongod
```

4. Run development server:
```bash
npm run dev
```

5. Build for production:
```bash
npm run build
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/phone/request-otp` - Request OTP for phone login
- `POST /api/auth/phone/verify-otp` - Verify OTP and login
- `POST /api/auth/email/signup` - Email signup
- `POST /api/auth/email/login` - Email login
- `POST /api/auth/google` - Google OAuth

### Users
- `GET /api/users/me` - Get current user profile
- `PATCH /api/users/me` - Update user profile

### Reports
- `POST /api/reports` - Create incident report
- `GET /api/reports/heatmap` - Get heatmap data
- `GET /api/reports/my-reports` - Get user's reports

### Walks
- `POST /api/walks/start` - Start walk session
- `POST /api/walks/:sessionId/location` - Update location
- `POST /api/walks/:sessionId/panic` - Trigger panic button
- `POST /api/walks/:sessionId/end` - End walk session

### Safe Spaces
- `GET /api/safe-spaces/nearby` - Get nearby safe spaces

### Contacts
- `GET /api/contacts` - Get user's contacts
- `POST /api/contacts` - Add contact
- `DELETE /api/contacts/:contactId` - Delete contact

## Environment Variables

See `.env.example` for all required environment variables.

## Database

Uses MongoDB with Mongoose ODM. Models:
- User
- Report
- (More models to be added)

## Security

- Helmet.js for security headers
- CORS configuration
- Rate limiting
- JWT authentication
- Input validation with Zod

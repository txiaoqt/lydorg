# Y-TRACE — Youth Engagement Management System

A modern web application for Local Youth Development Offices in Metro Manila to centralize youth programs, events, verified Pasig-based organization information, and transparency workflows.

## Features

- **Programs Management**: Browse and manage youth development programs
- **Events Calendar**: View and register for community events
- **Pasig Organization Directory**: View detailed profiles of Pasig-based youth organizations with official source references
- **Scholarships Portal**: Access scholarship opportunities and application processes
- **User Authentication**: Secure sign-in and registration system
- **Responsive Design**: Works seamlessly across all devices

## Technologies Used

- **Frontend**: React 18 with TypeScript
- **Styling**: Tailwind CSS with ShadCN UI components
- **Routing**: React Router DOM
- **Build Tool**: Vite
- **State Management**: TanStack Query for data fetching
- **Build Tool**: Vite
- **Development**: SWC for fast compilation

## Getting Started

### Prerequisites

- Node.js (version 18 or higher)
- npm or yarn package manager

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd youth-connect-hub
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:8080`

### Supabase Setup (Dynamic Mode)

1. Create a Supabase project.
2. Run SQL files in order from `supabase/sql/README.md`.
3. Copy `.env.example` to `.env` and set:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Restart the dev server.

If env variables are missing, Supabase-auth actions are disabled and data pages render empty states.
To preload the same values that used to live in local mock files, also run `supabase/sql/09_template_seed_data.sql`.

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run build:vercel` - Build optimized for Vercel deployment
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run test` - Run tests

### Vercel Deployment

This project is optimized for Vercel deployment:

1. **Deploy to Vercel**: Click the button below to deploy directly to Vercel
   [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/youth-connect-hub)

2. **Manual Deployment**:
   ```bash
   # Install Vercel CLI
   npm install -g vercel
   
   # Deploy to Vercel
   vercel
   
   # Deploy to production
   vercel --prod
   ```

3. **Environment Variables**: Configure any required environment variables in the Vercel dashboard under Settings > Environment Variables.

**Vercel Configuration**:
- Uses `vercel.json` for routing and build configuration
- Optimized build settings in `vite.config.ts`
- Automatic React Router support with proper fallback routing

### Split User/Admin Deployment (Recommended)

Deploy the same repository into two Vercel projects with different env:

- User project env:
  - `VITE_DEPLOY_SURFACE=user`
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`

- Admin project env:
  - `VITE_DEPLOY_SURFACE=admin`
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`

Behavior by surface:
- `user`: admin routes/login are blocked.
- `admin`: user routes are blocked, login route is `/admin/signin`.
- `combined`: both user and admin are available in one deployment.

## Project Structure

```
src/
├── components/     # Reusable UI components
├── pages/         # Page components
├── hooks/         # Custom React hooks
├── lib/          # Utility functions
└── App.tsx       # Main application component
```

## Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License.

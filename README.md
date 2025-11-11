# Vertex Time Grid

A modern task management application that combines the Eisenhower Matrix with time estimation to help you prioritize and organize your tasks effectively.

## About the App

Vertex Time Grid is a productivity tool that helps you manage tasks using a three-dimensional approach:

- **Urgency** (Low, Medium, High)
- **Importance** (Low, Medium, High)
- **Time Required** (<15 min, 15-60 min, 60+ min)

Tasks are organized into a 2x2 matrix based on urgency and importance, creating four quadrants:
- **Do First** (Urgent & Important) - High priority tasks requiring immediate attention
- **Schedule** (Not Urgent & Important) - Important tasks to plan for later
- **Delegate** (Urgent & Not Important) - Tasks that need quick action but aren't critical
- **Eliminate** (Not Urgent & Not Important) - Low priority tasks

The app also supports **unweighted tasks** - tasks that haven't been fully categorized yet, allowing you to capture ideas quickly and weight them later.

### Key Features

- ✅ **Task Management**: Create, edit, and delete tasks with detailed metadata
- 📊 **Matrix View**: Visualize tasks in a 2x2 grid based on urgency and importance
- 🎯 **Focus Mode**: Dedicated view for "Do First" tasks (urgent and important)
- 🏷️ **Categories**: Organize tasks with custom categories
- ⏱️ **Time Tracking**: Estimate and display time requirements for each task
- 📈 **Task History**: View completed tasks organized by date in your profile
- 🔄 **Drag & Drop**: Reorganize tasks by dragging them between quadrants
- 🔐 **User Authentication**: Secure user accounts with Supabase Auth
- 💾 **Cloud Sync**: All data is stored securely in Supabase

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS + shadcn/ui components
- **Backend**: Supabase (PostgreSQL database, authentication, real-time)
- **State Management**: TanStack Query (React Query)
- **Routing**: React Router v6
- **Drag & Drop**: @dnd-kit
- **Form Handling**: React Hook Form + Zod validation

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher) - [Install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)
- **npm** or **bun** (comes with Node.js)
- A **Supabase account** - [Sign up for free](https://supabase.com)

## Setup Instructions

### 1. Clone the Repository

```sh
git clone <YOUR_GIT_URL>
cd vertex-time-grid
```

### 2. Install Dependencies

```sh
npm install
# or
bun install
```

### 3. Set Up Supabase

1. **Create a Supabase Project**:
   - Go to [supabase.com](https://supabase.com) and create a new project
   - Wait for the project to finish initializing

2. **Set Up the Database**:
   - In your Supabase dashboard, go to the SQL Editor
   - Copy and paste the contents of `supabase/setup.sql`
   - Run the SQL script to create the necessary tables, policies, and triggers

3. **Get Your Supabase Credentials**:
   - In your Supabase dashboard, go to Settings → API
   - Copy your **Project URL** and **anon/public key**

### 4. Configure Environment Variables

Create a `.env` file in the root directory:

```sh
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
```

Replace the placeholders with your actual Supabase credentials.

### 5. Start the Development Server

```sh
npm run dev
# or
bun dev
```

The app will be available at `http://localhost:8080` (or the port shown in your terminal).

### 6. Build for Production

```sh
npm run build
# or
bun run build
```

The production build will be in the `dist` directory.

## How It Works

### Task Weighting System

Tasks can be in one of two states:

1. **Unweighted Tasks**: Tasks that are missing one or more of the three dimensions (urgency, importance, or time required). These appear in the "Add Task" page and can be weighted later.

2. **Weighted Tasks**: Tasks that have all three dimensions set. These appear in the Matrix view and are organized into quadrants.

### Quadrant Classification

Tasks are automatically placed into quadrants based on their urgency and importance values:

- **Urgent** = Medium (2) or High (3) urgency
- **Important** = Medium (2) or High (3) importance

The four quadrants:
- **Urgent & Important** → "Do First" quadrant
- **Urgent & Not Important** → "Delegate" quadrant
- **Not Urgent & Important** → "Schedule" quadrant
- **Not Urgent & Not Important** → "Eliminate" quadrant

### Task Dimensions

Each task has three dimensions on a 1-3 scale:

- **Urgency**: 1 (Low), 2 (Medium), 3 (High)
- **Importance**: 1 (Low), 2 (Medium), 3 (High)
- **Time Required**: 1 (<15 min), 2 (15-60 min), 3 (60+ min)

### User Flow

1. **Add Tasks**: Create tasks on the "Add Task" page. You can set all dimensions immediately or leave some blank to weight later.

2. **Weight Tasks**: Unweighted tasks appear on the "Add Task" page. Set their urgency, importance, and time to move them to the Matrix.

3. **View Matrix**: The Matrix page shows all weighted tasks organized into quadrants. Drag tasks between quadrants to update their priority.

4. **Focus**: The Focus page shows only "Do First" tasks (urgent and important) for concentrated work sessions.

5. **Complete Tasks**: Mark tasks as complete from any view. Completed tasks are moved to your Profile page.

6. **Track Progress**: View your completed task history in the Profile page, organized by completion date.

### Database Schema

The app uses two main tables:

- **profiles**: User profile information (linked to Supabase Auth)
- **tasks**: Task data with urgency, importance, time_required, category, and completion status

Row Level Security (RLS) policies ensure users can only access their own tasks.

## Project Structure

```
vertex-time-grid/
├── src/
│   ├── components/        # React components
│   │   ├── ui/           # shadcn/ui components
│   │   ├── Layout.tsx    # Main layout wrapper
│   │   ├── MatrixView.tsx # Matrix visualization
│   │   ├── TaskCard.tsx  # Task display component
│   │   └── ...
│   ├── pages/            # Page components
│   │   ├── AddTask.tsx   # Task creation page
│   │   ├── Matrix.tsx    # Matrix view page
│   │   ├── Focus.tsx     # Focus mode page
│   │   ├── Profile.tsx   # User profile & history
│   │   └── Auth.tsx      # Authentication page
│   ├── hooks/            # Custom React hooks
│   ├── integrations/     # External service integrations
│   │   └── supabase/     # Supabase client & types
│   ├── lib/              # Utilities & types
│   └── App.tsx           # Main app component
├── supabase/
│   └── setup.sql         # Database setup script
└── public/               # Static assets
```

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Code Style

The project uses:
- ESLint for code linting
- TypeScript for type safety
- Prettier (via ESLint) for code formatting

## Deployment

The app can be deployed to any static hosting service that supports Vite builds:

- **Vercel**: Connect your GitHub repo and deploy
- **Netlify**: Connect your GitHub repo and deploy
- **Supabase Hosting**: Use Supabase's built-in hosting
- **Any static host**: Build the app and upload the `dist` folder

Make sure to set your environment variables in your hosting platform's settings.

### Deploying to Coolify

[Coolify](https://coolify.io) is a self-hosted platform-as-a-service that makes it easy to deploy applications. Here's how to deploy Vertex Time Grid to Coolify:

#### Prerequisites

- A server with Coolify installed and running
- Your repository pushed to GitHub, GitLab, or another Git provider
- Supabase project set up (see [Setup Instructions](#setup-instructions))

#### Deployment Steps

1. **Create a New Resource in Coolify**:
   - Log into your Coolify dashboard
   - Click "New Resource" → "Static Site"
   - Select your Git provider and repository

2. **Configure Build Settings**:
   - **Build Pack**: Select "Static Site" or "Nixpacks"
   - **Build Command**: `npm run build` (or `bun run build` if using Bun)
   - **Output Directory**: `dist`
   - **Node Version**: Select Node.js 18 or higher

3. **Set Environment Variables**:
   - In the Coolify resource settings, navigate to "Environment Variables"
   - Add the following variables:
     ```
     VITE_SUPABASE_URL=your_supabase_project_url
     VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
     ```
   - Replace the placeholders with your actual Supabase credentials

4. **Configure Domain** (Optional):
   - In the resource settings, go to "Domains"
   - Add your custom domain or use the provided Coolify subdomain
   - SSL certificates are automatically provisioned by Coolify

5. **Deploy**:
   - Click "Deploy" or push to your repository's main branch
   - Coolify will automatically build and deploy your application
   - Monitor the build logs in the Coolify dashboard

#### Post-Deployment

- Your app will be available at the domain you configured
- Environment variables are injected at build time (Vite requires `VITE_` prefix)
- Updates are automatically deployed when you push to your repository

#### Troubleshooting

- **Build fails**: Check the build logs in Coolify. Ensure Node.js version is 18+ and all dependencies are installed correctly
- **Environment variables not working**: Make sure variables are set in Coolify before building. Vite requires variables to be available at build time
- **404 errors on routes**: Configure your web server to serve `index.html` for all routes (Coolify's static site configuration should handle this automatically)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source and available under the MIT License.

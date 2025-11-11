import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { 
  Grid3x3, 
  Target, 
  Clock, 
  Zap, 
  CheckCircle2, 
  ArrowRight,
  BarChart3,
  Layers,
  Sparkles,
  Gift
} from 'lucide-react';

const Landing = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  // Redirect authenticated users to the app
  useEffect(() => {
    if (!loading && user) {
      navigate('/add-task');
    }
  }, [user, loading, navigate]);

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const features = [
    {
      icon: Grid3x3,
      title: '3D Priority Matrix',
      description: 'Organize tasks by urgency, importance, and time required in a visual 2x2 grid that helps you focus on what matters most.',
    },
    {
      icon: Target,
      title: 'Focus Mode',
      description: 'Dedicated view for urgent and important tasks, helping you stay focused on high-priority work without distractions.',
    },
    {
      icon: Clock,
      title: 'Time Estimation',
      description: 'Track how long tasks will take with quick visual indicators, making it easier to plan your day effectively.',
    },
    {
      icon: Zap,
      title: 'Quick Capture',
      description: 'Add tasks quickly and weight them later. Capture ideas instantly without breaking your flow.',
    },
    {
      icon: BarChart3,
      title: 'Task Analytics',
      description: 'View your completed task history organized by date, helping you track your productivity over time.',
    },
    {
      icon: Layers,
      title: 'Custom Categories',
      description: 'Organize tasks with custom categories, making it easy to group related work and find what you need.',
    },
  ];

  const quadrants = [
    {
      title: 'Do First',
      subtitle: 'Urgent & Important',
      description: 'High priority tasks requiring immediate attention',
      color: 'bg-quadrant-urgent-important',
    },
    {
      title: 'Schedule',
      subtitle: 'Not Urgent & Important',
      description: 'Important tasks to plan for later',
      color: 'bg-quadrant-not-urgent-important',
    },
    {
      title: 'Delegate',
      subtitle: 'Urgent & Not Important',
      description: 'Tasks that need quick action but aren\'t critical',
      color: 'bg-quadrant-urgent-not',
    },
    {
      title: 'Eliminate',
      subtitle: 'Not Urgent & Not Important',
      description: 'Low priority tasks to minimize or remove',
      color: 'bg-quadrant-not-urgent-not',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Grid3x3 className="h-4 w-4" />
            </div>
            <span className="text-xl font-bold">Vertex</span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/auth')}>
              Sign In
            </Button>
            <Button onClick={() => navigate('/auth')}>
              Get Started
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 md:py-32">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
            <Sparkles className="h-4 w-4" />
            <span>3D Task Priority Matrix</span>
          </div>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight">
            Organize Your Tasks
            <br />
            <span className="text-primary">Like Never Before</span>
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
            Vertex combines the Eisenhower Matrix with time estimation to help you prioritize,
            organize, and complete tasks more effectively.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={() => navigate('/auth')} className="text-lg px-8">
              Get Started Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              onClick={() => navigate('/auth')}
              className="text-lg px-8"
            >
              Sign In
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-4xl md:text-5xl font-bold">Everything You Need</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Powerful features designed to help you stay organized and productive
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="border-2 hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>{feature.title}</CardTitle>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="container mx-auto px-4 py-20 bg-muted/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-4xl md:text-5xl font-bold">How It Works</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Tasks are organized into four quadrants based on urgency and importance
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {quadrants.map((quadrant, index) => (
              <Card key={index} className="relative overflow-hidden">
                <div className={`absolute top-0 left-0 right-0 h-2 ${quadrant.color}`} />
                <CardHeader>
                  <CardTitle className="text-xl">{quadrant.title}</CardTitle>
                  <CardDescription className="font-medium">
                    {quadrant.subtitle}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {quadrant.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center space-y-4 mb-12">
            <h2 className="text-4xl md:text-5xl font-bold">Pricing</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Simple, transparent, and free for early supporters
            </p>
          </div>
          <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
            <CardHeader className="text-center space-y-4 pb-6">
              <div className="mx-auto h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center">
                <Gift className="h-8 w-8 text-primary" />
              </div>
              <div className="space-y-2">
                <CardTitle className="text-4xl md:text-5xl font-bold">
                  Free
                </CardTitle>
                <CardDescription className="text-lg font-medium">
                  For the first 10,000 users
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pb-8">
              <p className="text-center text-lg text-foreground max-w-2xl mx-auto leading-relaxed">
                It's free for the first 10,000 users, because why not? 
                <br />
                <span className="font-semibold">You support us and we support you.</span>
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                <Button size="lg" onClick={() => navigate('/auth')} className="text-lg px-8">
                  Claim Your Free Access
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto">
          <Card className="border-2 border-primary/20">
            <CardHeader className="text-center space-y-4 pb-8">
              <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-3xl md:text-4xl">
                Ready to Get Started?
              </CardTitle>
              <CardDescription className="text-lg">
                Join Vertex today and transform how you manage your tasks
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row gap-4 justify-center pb-8">
              <Button size="lg" onClick={() => navigate('/auth')} className="text-lg px-8">
                Create Free Account
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                onClick={() => navigate('/auth')}
                className="text-lg px-8"
              >
                Sign In
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Grid3x3 className="h-4 w-4" />
              </div>
              <span className="text-lg font-semibold">Vertex</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Vertex. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;


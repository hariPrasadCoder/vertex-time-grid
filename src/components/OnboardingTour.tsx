import { useEffect, useState } from 'react';
import Joyride, { CallBackProps, STATUS, Step } from 'react-joyride';
import { useLocation, useNavigate } from 'react-router-dom';
import { useOnboarding } from '@/hooks/useOnboarding';

interface OnboardingTourProps {
  run: boolean;
  onComplete: () => void;
}

export const OnboardingTour = ({ run, onComplete }: OnboardingTourProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { completeOnboarding } = useOnboarding();
  const [stepIndex, setStepIndex] = useState(0);

  // Define base tour steps (navigation items)
  const baseSteps: Step[] = [
    {
      target: '[data-onboarding="sidebar"]',
      content: (
        <div>
          <h3 className="font-semibold mb-2">Welcome to Vertex! 🎉</h3>
          <p>
            This is your navigation sidebar. Let's explore the different sections of the app.
          </p>
        </div>
      ),
      placement: 'right',
      disableBeacon: true,
    },
    {
      target: '[data-onboarding="add-task"]',
      content: (
        <div>
          <h3 className="font-semibold mb-2">Add New Task</h3>
          <p>
            Start here! Create tasks and assign urgency, importance, and time estimates. 
            You can also create unweighted tasks and add weights later.
          </p>
        </div>
      ),
      placement: 'right',
    },
    {
      target: '[data-onboarding="matrix"]',
      content: (
        <div>
          <h3 className="font-semibold mb-2">Matrix View</h3>
          <p>
            See all your weighted tasks organized in a priority matrix. Tasks are placed in 
            quadrants based on urgency and importance. Drag tasks to change their priority!
          </p>
        </div>
      ),
      placement: 'right',
    },
    {
      target: '[data-onboarding="focus"]',
      content: (
        <div>
          <h3 className="font-semibold mb-2">Focus Mode</h3>
          <p>
            Focus on your "Do First" tasks - urgent and important items. This view shows 
            only high-priority tasks so you can concentrate on what matters most.
          </p>
        </div>
      ),
      placement: 'right',
    },
    {
      target: '[data-onboarding="kanban"]',
      content: (
        <div>
          <h3 className="font-semibold mb-2">Kanban Board</h3>
          <p>
            Organize tasks by status: To-do, In Progress, On-hold, and Done. Drag tasks 
            between columns to update their status and track your workflow.
          </p>
        </div>
      ),
      placement: 'right',
    },
    {
      target: '[data-onboarding="history"]',
      content: (
        <div>
          <h3 className="font-semibold mb-2">History</h3>
          <p>
            View your completed tasks and track your productivity over time. See what you've 
            accomplished and analyze your task patterns.
          </p>
        </div>
      ),
      placement: 'right',
    },
  ];

  // Get page-specific steps based on current path
  const getPageSpecificSteps = (): Step[] => {
    const path = location.pathname;
    if (path === '/add-task') {
      return [
        {
          target: '[data-onboarding="task-form"]',
          content: (
            <div>
              <h3 className="font-semibold mb-2">Task Form</h3>
              <p>
                Fill in the task details: title, description, urgency (1-3), importance (1-3), 
                and time required. You can also add categories to organize your tasks.
              </p>
            </div>
          ),
          placement: 'top',
        },
        {
          target: '[data-onboarding="unweighted-tasks"]',
          content: (
            <div>
              <h3 className="font-semibold mb-2">Unweighted Tasks</h3>
              <p>
                Tasks without complete priority information appear here. Add urgency, importance, 
                and time estimates to move them to the matrix view.
              </p>
            </div>
          ),
          placement: 'top',
        },
      ];
    }

    if (path === '/matrix') {
      return [
        {
          target: '[data-onboarding="matrix-view"]',
          content: (
            <div>
              <h3 className="font-semibold mb-2">Priority Matrix</h3>
              <p>
                Tasks are organized into four quadrants:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li><strong>Do First:</strong> Urgent & Important</li>
                  <li><strong>Schedule:</strong> Not Urgent & Important</li>
                  <li><strong>Delegate:</strong> Urgent & Not Important</li>
                  <li><strong>Eliminate:</strong> Not Urgent & Not Important</li>
                </ul>
                Drag tasks between quadrants to reprioritize them!
              </p>
            </div>
          ),
          placement: 'top',
        },
      ];
    }

    if (path === '/focus') {
      return [
        {
          target: '[data-onboarding="focus-tasks"]',
          content: (
            <div>
              <h3 className="font-semibold mb-2">Do First Tasks</h3>
              <p>
                These are your urgent and important tasks. You can filter by category, sort by 
                time required, or drag to reorder them. Focus on completing these first!
              </p>
            </div>
          ),
          placement: 'top',
        },
      ];
    }

    if (path === '/kanban') {
      return [
        {
          target: '[data-onboarding="kanban-board"]',
          content: (
            <div>
              <h3 className="font-semibold mb-2">Kanban Columns</h3>
              <p>
                Drag tasks between columns to update their status. This helps you visualize 
                your workflow and see what's in progress, on hold, or completed.
              </p>
            </div>
          ),
          placement: 'top',
        },
      ];
    }

    return [];
  };

  // Combine base steps with page-specific steps
  const getSteps = (): Step[] => {
    const pageSteps = getPageSpecificSteps();
    
    // If we're on a specific page and have page steps, show those after the navigation step
    if (pageSteps.length > 0) {
      // Find which navigation step we should be on
      const currentNavStep = baseSteps.findIndex(step => {
        const target = step.target as string;
        if (location.pathname === '/add-task' && target.includes('add-task')) return true;
        if (location.pathname === '/matrix' && target.includes('matrix')) return true;
        if (location.pathname === '/focus' && target.includes('focus')) return true;
        if (location.pathname === '/kanban' && target.includes('kanban')) return true;
        if (location.pathname === '/history' && target.includes('history')) return true;
        return false;
      });
      
      if (currentNavStep >= 0) {
        // Insert page steps after the current navigation step
        return [
          ...baseSteps.slice(0, currentNavStep + 1),
          ...pageSteps,
          ...baseSteps.slice(currentNavStep + 1),
        ];
      }
    }
    
    return baseSteps;
  };

  const handleJoyrideCallback = async (data: CallBackProps) => {
    const { status, type, index, action } = data;

    // Handle step navigation
    if (type === 'step:after') {
      const steps = getSteps();
      const currentStep = steps[index];
      const nextStep = steps[index + 1];
      
      // Navigate to the appropriate page for navigation steps
      if (currentStep && typeof currentStep.target === 'string') {
        const target = currentStep.target;
        if (target.includes('add-task') && location.pathname !== '/add-task') {
          navigate('/add-task');
        } else if (target.includes('matrix') && location.pathname !== '/matrix') {
          navigate('/matrix');
        } else if (target.includes('focus') && location.pathname !== '/focus') {
          navigate('/focus');
        } else if (target.includes('kanban') && location.pathname !== '/kanban') {
          navigate('/kanban');
        } else if (target.includes('history') && location.pathname !== '/history') {
          navigate('/history');
        }
      }
      
      // Update step index for next step
      setStepIndex(index + 1);
    } else if (type === 'target:notFound') {
      // If target not found, try to continue anyway
      setStepIndex(index + 1);
    }

    // Handle tour completion
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      try {
        await completeOnboarding();
        onComplete();
      } catch (error) {
        console.error('Error completing onboarding:', error);
        onComplete(); // Still call onComplete to close the tour
      }
    }
  };

  if (!run) return null;

  return (
    <Joyride
      steps={getSteps()}
      run={run}
      stepIndex={stepIndex}
      continuous
      showProgress
      showSkipButton
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: 'hsl(var(--primary))',
          zIndex: 10000,
        },
        tooltip: {
          borderRadius: 8,
        },
        buttonNext: {
          backgroundColor: 'hsl(var(--primary))',
          color: 'hsl(var(--primary-foreground))',
          borderRadius: 6,
        },
        buttonBack: {
          color: 'hsl(var(--foreground))',
          marginRight: 10,
        },
        buttonSkip: {
          color: 'hsl(var(--muted-foreground))',
        },
      }}
      locale={{
        back: 'Back',
        close: 'Close',
        last: 'Finish',
        next: 'Next',
        skip: 'Skip tour',
      }}
    />
  );
};


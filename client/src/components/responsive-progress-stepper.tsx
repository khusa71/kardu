import { CheckCircle } from "lucide-react";

interface Step {
  number: number;
  title: string;
  completed: boolean;
  active: boolean;
}

interface ResponsiveProgressStepperProps {
  currentStep: number;
}

export function ResponsiveProgressStepper({ currentStep }: ResponsiveProgressStepperProps) {
  const steps: Step[] = [
    { number: 1, title: "Upload PDF", completed: currentStep > 1, active: currentStep === 1 },
    { number: 2, title: "Configure", completed: currentStep > 2, active: currentStep === 2 },
    { number: 3, title: "Generate", completed: currentStep > 3, active: currentStep === 3 },
    { number: 4, title: "Download", completed: currentStep > 4, active: currentStep === 4 },
  ];

  const getStepClass = (step: Step) => {
    if (step.completed) {
      return "w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-green-500 text-white flex items-center justify-center text-xs lg:text-sm font-semibold";
    }
    if (step.active) {
      return "w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-primary text-white flex items-center justify-center text-xs lg:text-sm font-semibold";
    }
    return "w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 flex items-center justify-center text-xs lg:text-sm font-semibold";
  };

  const getConnectorClass = (index: number) => {
    const isCompleted = steps[index + 1] && (steps[index].completed || steps[index + 1].active);
    return `flex-1 h-0.5 lg:h-1 mx-2 lg:mx-4 ${
      isCompleted 
        ? "bg-green-500" 
        : "bg-gray-200 dark:bg-gray-700"
    } transition-all duration-300`;
  };

  return (
    <div className="mb-8 lg:mb-12">
      {/* Mobile View - Vertical Layout */}
      <div className="block sm:hidden space-y-4">
        {steps.map((step, index) => (
          <div key={step.number} className="flex items-center space-x-3">
            <div className={getStepClass(step)}>
              {step.completed ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                step.number
              )}
            </div>
            <div className="flex-1">
              <span className={`text-sm font-medium ${
                step.active || step.completed 
                  ? 'text-neutral dark:text-white' 
                  : 'text-gray-400 dark:text-gray-500'
              }`}>
                {step.title}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop View - Horizontal Layout */}
      <div className="hidden sm:flex items-center justify-center">
        {steps.map((step, index) => (
          <div key={step.number} className="flex items-center">
            <div className="flex items-center">
              <div className={getStepClass(step)}>
                {step.completed ? (
                  <CheckCircle className="w-4 h-4 lg:w-5 lg:h-5" />
                ) : (
                  step.number
                )}
              </div>
              <span className={`ml-2 text-xs lg:text-sm font-medium ${
                step.active || step.completed 
                  ? 'text-neutral dark:text-white' 
                  : 'text-gray-400 dark:text-gray-500'
              }`}>
                {step.title}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className={getConnectorClass(index)} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
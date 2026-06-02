// Onboarding Flow - Welcome tour and interactive demo

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { analytics } from "@/lib/analytics";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  action?: string;
}

const STEPS: OnboardingStep[] = [
  {
    id: "welcome",
    title: "Welcome to Route Commerce",
    description: "The all-in-one platform for fresh produce wholesale distribution. Let's take a quick tour to get you started.",
    icon: (
      <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    id: "products",
    title: "Manage Your Products",
    description: "Add your fresh produce with pricing, categories, and images. Perfect for showcasing your farm's best offerings.",
    icon: (
      <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
    action: "Add First Product",
  },
  {
    id: "stops",
    title: "Schedule Pickup Stops",
    description: "Create scheduled stops for customers to pick up their orders. Manage locations, times, and capacity.",
    icon: (
      <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    action: "Create First Stop",
  },
  {
    id: "orders",
    title: "Track Orders",
    description: "Monitor customer orders in real-time. Handle pickups and shipments with ease.",
    icon: (
      <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
  },
  {
    id: "communications",
    title: "Harvest Reach",
    description: "Send beautiful email campaigns to your customers. Keep them informed about seasonal offerings and promotions.",
    icon: (
      <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    id: "complete",
    title: "You're All Set!",
    description: "Your dashboard is ready. Start adding products and scheduling stops to grow your wholesale business.",
    icon: (
      <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

interface OnboardingProps {
  brandId: string;
  userId: string;
  onComplete?: () => void;
}

export function OnboardingFlow({ brandId: _brandId, userId: _userId, onComplete }: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Track onboarding start
    analytics.onboardingStep("start", false);
  }, []);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      const step = STEPS[currentStep];
      analytics.onboardingStep(step.id, false);
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    analytics.onboardingStep("skipped", true);
    setIsCompleted(true);
    onComplete?.();
  };

  const handleComplete = () => {
    analytics.onboardingStep("complete", true);
    setIsCompleted(true);
    onComplete?.();
  };

  const handleAction = () => {
    const step = STEPS[currentStep];
    analytics.buttonClicked(step.action || "next", "onboarding");

    if (step.id === "products") {
      router.push("/admin/products/new");
    } else if (step.id === "stops") {
      router.push("/admin/stops/new");
    } else {
      handleNext();
    }
  };

  if (isCompleted) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-2xl p-8 max-w-md text-center"
        >
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Setup Complete!</h2>
          <p className="text-gray-600 mb-6">
            You&apos;re ready to start growing your wholesale business.
          </p>
          <button
            onClick={() => router.push("/admin")}
            className="w-full px-4 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90"
          >
            Go to Dashboard
          </button>
        </motion.div>
      </div>
    );
  }

  const step = STEPS[currentStep];
  const progress = ((currentStep + 1) / STEPS.length) * 100;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      >
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden"
        >
          {/* Progress bar */}
          <div className="h-1 bg-gray-200">
            <motion.div
              className="h-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>

          <div className="p-8">
            {/* Step indicator */}
            <div className="flex items-center justify-center gap-2 mb-8">
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    i <= currentStep ? "bg-primary" : "bg-gray-300"
                  }`}
                />
              ))}
            </div>

            {/* Icon */}
            <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6 text-primary">
              {step.icon}
            </div>

            {/* Content */}
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{step.title}</h2>
              <p className="text-gray-600">{step.description}</p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              {currentStep > 0 ? (
                <button
                  onClick={handlePrevious}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
                >
                  Back
                </button>
              ) : (
                <button
                  onClick={handleSkip}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
                >
                  Skip Tour
                </button>
              )}
              
              {step.action ? (
                <button
                  onClick={handleAction}
                  className="flex-1 px-4 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90"
                >
                  {step.action}
                </button>
              ) : currentStep === STEPS.length - 1 ? (
                <button
                  onClick={handleComplete}
                  className="flex-1 px-4 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90"
                >
                  Get Started
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  className="flex-1 px-4 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90"
                >
                  Next
                </button>
              )}
            </div>
          </div>

          {/* Step counter */}
          <div className="bg-gray-50 px-8 py-4 text-center text-sm text-gray-500">
            Step {currentStep + 1} of {STEPS.length}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Interactive demo component
export function InteractiveDemo({ onClose }: { onClose: () => void }) {
  const [demoStep, setDemoStep] = useState(0);
  
  const demoSteps = [
    { title: "Add Products", description: "Create your product catalog" },
    { title: "Schedule Stops", description: "Set up pickup locations" },
    { title: "Send Campaigns", description: "Email your customers" },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6">
        <h3 className="text-lg font-bold mb-4">Interactive Demo</h3>
        <div className="space-y-4">
          {demoSteps.map((step, i) => (
            <div
              key={i}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                i === demoStep ? "border-primary bg-primary/5" : "border-gray-200"
              }`}
              onClick={() => setDemoStep(i)}
            >
              <div className="font-medium">{step.title}</div>
              <div className="text-sm text-gray-500">{step.description}</div>
            </div>
          ))}
        </div>
        <div className="mt-6 flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2 border rounded-lg">
            Close
          </button>
          <button className="flex-1 px-4 py-2 bg-primary text-white rounded-lg">
            Start Demo
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';

interface TutorialStep {
  id: string;
  title: string;
  content: string;
  target?: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  showSkip?: boolean;
}

interface TutorialProps {
  steps: TutorialStep[];
  tutorialKey: string;
  onComplete?: () => void;
  onSkip?: () => void;
}

export default function Tutorial({ steps, tutorialKey, onComplete, onSkip }: TutorialProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasSeenTutorial, setHasSeenTutorial] = useState(false);

  useEffect(() => {
    const tutorialSeen = localStorage.getItem(`tutorial-${tutorialKey}`);
    if (!tutorialSeen) {
      setTimeout(() => setIsVisible(true), 1000);
    } else {
      setHasSeenTutorial(true);
    }
  }, [tutorialKey]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    setIsVisible(false);
    localStorage.setItem(`tutorial-${tutorialKey}`, 'skipped');
    console.log(`Tutorial ${tutorialKey} pulado`);
    if (onSkip) onSkip();
  };

  const handleComplete = () => {
    setIsVisible(false);
    localStorage.setItem(`tutorial-${tutorialKey}`, 'completed');
    console.log(`Tutorial ${tutorialKey} concluído`);
    if (onComplete) onComplete();
  };

  if (!isVisible || hasSeenTutorial) return null;

  const currentStepData = steps[currentStep];

  return (
    <>
      <div className="tutorial-overlay">
        <div className="tutorial-modal">
          <div className="tutorial-header">
            <h3 className="tutorial-title">{currentStepData.title}</h3>
            <button
              onClick={handleSkip}
              className="tutorial-close"
              aria-label="Fechar tutorial"
            >
              ✕
            </button>
          </div>
          
          <div className="tutorial-content">
            <p>{currentStepData.content}</p>
          </div>

          <div className="tutorial-footer">
            <div className="tutorial-progress">
              <span>{currentStep + 1} de {steps.length}</span>
            </div>
            
            <div className="tutorial-actions">
              {currentStepData.showSkip && (
                <button onClick={handleSkip} className="tutorial-skip">
                  Pular Tutorial
                </button>
              )}
              <button onClick={handleNext} className="tutorial-next">
                {currentStep === steps.length - 1 ? 'Concluir' : 'Próximo'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .tutorial-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          backdrop-filter: blur(8px);
        }

        .tutorial-modal {
          background: var(--color-surface, #1e293b);
          border-radius: 16px;
          padding: 2rem;
          max-width: 500px;
          width: 90%;
          max-height: 80vh;
          overflow-y: auto;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
          border: 1px solid var(--color-border, #334155);
          color: var(--color-text, #f1f5f9);
        }

        .tutorial-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid var(--color-border, #334155);
        }

        .tutorial-title {
          font-size: 1.5rem;
          font-weight: 700;
          margin: 0;
          color: var(--color-text, #f1f5f9);
        }

        .tutorial-close {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: var(--color-text-secondary, #94a3b8);
          padding: 0.5rem;
          border-radius: 50%;
          transition: all 0.2s ease;
        }

        .tutorial-close:hover {
          background: var(--color-border, #334155);
          color: var(--color-text, #f1f5f9);
        }

        .tutorial-content {
          margin-bottom: 2rem;
        }

        .tutorial-content p {
          font-size: 1.1rem;
          line-height: 1.6;
          color: var(--color-text-secondary, #94a3b8);
          margin: 0;
        }

        .tutorial-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .tutorial-progress {
          font-size: 0.875rem;
          color: var(--color-text-secondary, #94a3b8);
          font-weight: 500;
        }

        .tutorial-actions {
          display: flex;
          gap: 0.75rem;
        }

        .tutorial-skip {
          background: none;
          border: 1px solid var(--color-border, #334155);
          padding: 0.5rem 1rem;
          border-radius: 8px;
          cursor: pointer;
          color: var(--color-text-secondary, #94a3b8);
          font-size: 0.875rem;
          transition: all 0.2s ease;
        }

        .tutorial-skip:hover {
          background: var(--color-border, #334155);
          color: var(--color-text, #f1f5f9);
        }

        .tutorial-next {
          background: var(--color-primary, #3b82f6);
          color: white;
          border: none;
          padding: 0.5rem 1.5rem;
          border-radius: 8px;
          cursor: pointer;
          font-size: 0.875rem;
          font-weight: 600;
          transition: all 0.2s ease;
        }

        .tutorial-next:hover {
          background: var(--color-secondary, #2563eb);
          transform: translateY(-1px);
        }
      `}</style>
    </>
  );
}

import React, { useState, useEffect } from 'react';
import { Dialog, Button } from '@rhypdf/ui';
import { useTranslation } from '@rhypdf/i18n';

const ONBOARDING_KEY = 'rhypdf_onboarding_completed';

export interface OnboardingModalProps {
  forceOpen?: boolean;
  onClose?: () => void;
}

export function isOnboardingCompleted(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setOnboardingCompleted(completed = true): void {
  try {
    if (completed) {
      localStorage.setItem(ONBOARDING_KEY, 'true');
    } else {
      localStorage.removeItem(ONBOARDING_KEY);
    }
  } catch {
    // Ignore localStorage errors
  }
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ forceOpen = false, onClose }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState<boolean>(false);
  const [step, setStep] = useState<number>(0);

  useEffect(() => {
    if (forceOpen) {
      setStep(0);
      setOpen(true);
      return;
    }
    if (!isOnboardingCompleted()) {
      setStep(0);
      setOpen(true);
    }
  }, [forceOpen]);

  const slides = [
    {
      title: t('onboarding.step1Title'),
      description: t('onboarding.step1Desc'),
      icon: '⚡'
    },
    {
      title: t('onboarding.step2Title'),
      description: t('onboarding.step2Desc'),
      icon: '✏️'
    },
    {
      title: t('onboarding.step3Title'),
      description: t('onboarding.step3Desc'),
      icon: '🔒'
    }
  ];

  const handleFinish = () => {
    setOnboardingCompleted(true);
    setOpen(false);
    onClose?.();
  };

  const handleSkip = () => {
    setOnboardingCompleted(true);
    setOpen(false);
    onClose?.();
  };

  const handleNext = () => {
    if (step < slides.length - 1) {
      setStep(step + 1);
    } else {
      handleFinish();
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  if (!open) return null;

  const currentSlide = slides[step]!;

  return (
    <Dialog open={open} onClose={handleSkip} title="">
      <div
        data-testid="onboarding-modal"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          padding: '8px 16px 16px'
        }}
      >
        <div
          data-testid="onboarding-icon"
          style={{
            fontSize: 48,
            marginBottom: 16,
            width: 80,
            height: 80,
            borderRadius: '50%',
            backgroundColor: 'var(--bg-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid var(--bg-border)'
          }}
        >
          {currentSlide.icon}
        </div>

        <h3
          data-testid="onboarding-title"
          style={{ fontSize: 20, fontWeight: 700, margin: '0 0 8px' }}
        >
          {currentSlide.title}
        </h3>

        <p
          data-testid="onboarding-desc"
          style={{
            fontSize: 14,
            color: 'var(--bg-muted-foreground)',
            lineHeight: 1.5,
            margin: '0 0 24px',
            maxWidth: 360
          }}
        >
          {currentSlide.description}
        </p>

        {/* Step dots indicator */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {slides.map((_, idx) => (
            <div
              key={idx}
              data-testid={`onboarding-dot-${idx}`}
              onClick={() => setStep(idx)}
              style={{
                width: idx === step ? 24 : 8,
                height: 8,
                borderRadius: 'var(--radius-full)',
                backgroundColor: idx === step ? 'var(--bg-primary)' : 'var(--bg-border)',
                transition: 'all 200ms ease',
                cursor: 'pointer'
              }}
            />
          ))}
        </div>

        {/* Actions */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            borderTop: '1px solid var(--bg-border)',
            paddingTop: 16
          }}
        >
          <Button variant="ghost" size="sm" onClick={handleSkip} data-testid="btn-onboarding-skip">
            {t('onboarding.skip')}
          </Button>

          <div style={{ display: 'flex', gap: 8 }}>
            {step > 0 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleBack}
                data-testid="btn-onboarding-back"
              >
                {t('onboarding.back')}
              </Button>
            )}
            <Button
              variant="primary"
              size="sm"
              onClick={handleNext}
              data-testid="btn-onboarding-next"
            >
              {step === slides.length - 1 ? t('onboarding.finish') : t('onboarding.next')}
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
};

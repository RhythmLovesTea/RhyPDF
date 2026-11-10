import { describe, it, expect, beforeEach, afterEach, beforeAll } from 'vitest';
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { initI18n, i18n, I18nextProvider } from '@rhypdf/i18n';
import {
  OnboardingModal,
  isOnboardingCompleted,
  setOnboardingCompleted
} from '../../src/components/OnboardingModal';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('Task 4.12: Onboarding: 3 short screens, skippable, shown once, privacy promise', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeAll(() => {
    initI18n('en');
  });

  beforeEach(() => {
    localStorage.clear();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    localStorage.clear();
  });

  const renderWithI18n = (ui: React.ReactElement) => {
    act(() => {
      root.render(<I18nextProvider i18n={i18n}>{ui}</I18nextProvider>);
    });
  };

  it('shows onboarding modal on first visit (when not yet completed)', () => {
    expect(isOnboardingCompleted()).toBe(false);

    renderWithI18n(<OnboardingModal />);

    const modal = container.querySelector('[data-testid="onboarding-modal"]');
    expect(modal).not.toBeNull();
    expect(container.querySelector('[data-testid="onboarding-title"]')?.textContent).toContain(
      'Welcome to RhyPDF'
    );
  });

  it('navigates through all 3 screens and shows privacy promise on step 3', () => {
    renderWithI18n(<OnboardingModal />);

    const nextBtn = container.querySelector(
      '[data-testid="btn-onboarding-next"]'
    ) as HTMLButtonElement;
    expect(nextBtn).not.toBeNull();

    // Step 1 -> Step 2
    act(() => {
      nextBtn.click();
    });
    expect(container.querySelector('[data-testid="onboarding-title"]')?.textContent).toContain(
      'Powerful In-Place Editing'
    );

    // Step 2 -> Step 3
    act(() => {
      nextBtn.click();
    });
    expect(container.querySelector('[data-testid="onboarding-title"]')?.textContent).toContain(
      '100% Private by Design'
    );
    expect(container.querySelector('[data-testid="onboarding-desc"]')?.textContent).toContain(
      'Your files never leave your device'
    );
    expect(nextBtn.textContent).toContain('Get Started');

    // Click finish on step 3
    act(() => {
      nextBtn.click();
    });

    expect(isOnboardingCompleted()).toBe(true);
    expect(container.querySelector('[data-testid="onboarding-modal"]')).toBeNull();
  });

  it('skips tour and sets completed flag when Skip Tour is clicked', () => {
    renderWithI18n(<OnboardingModal />);

    const skipBtn = container.querySelector(
      '[data-testid="btn-onboarding-skip"]'
    ) as HTMLButtonElement;
    expect(skipBtn).not.toBeNull();

    act(() => {
      skipBtn.click();
    });

    expect(isOnboardingCompleted()).toBe(true);
    expect(container.querySelector('[data-testid="onboarding-modal"]')).toBeNull();
  });

  it('does not display onboarding when already completed', () => {
    setOnboardingCompleted(true);
    expect(isOnboardingCompleted()).toBe(true);

    renderWithI18n(<OnboardingModal />);

    expect(container.querySelector('[data-testid="onboarding-modal"]')).toBeNull();
  });
});

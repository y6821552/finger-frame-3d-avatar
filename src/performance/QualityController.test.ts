import { describe, expect, it } from 'vitest';

import { QualityController } from './QualityController';

describe('QualityController', () => {
  it('downgrades automatic quality after sustained missed frames', () => {
    const controller = new QualityController({ initial: 'high', downgradeSamples: 3 });

    controller.sample(50);
    controller.sample(50);
    const profile = controller.sample(50);

    expect(profile.id).toBe('medium');
  });

  it('does not oscillate back up in the same automatic session', () => {
    const controller = new QualityController({ initial: 'medium', downgradeSamples: 2 });
    controller.sample(60);
    controller.sample(60);
    for (let index = 0; index < 200; index += 1) controller.sample(8);

    expect(controller.current().id).toBe('low');
  });

  it('honors a manual quality override', () => {
    const controller = new QualityController({ initial: 'high', downgradeSamples: 1 });
    controller.setMode('high');

    expect(controller.sample(100).id).toBe('high');
  });
});

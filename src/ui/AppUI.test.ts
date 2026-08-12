import { describe, expect, it, vi } from 'vitest';

import { AppUI } from './AppUI';

function storage(saved: string | null = null) {
  return {
    getItem: vi.fn(() => saved),
    setItem: vi.fn(),
  };
}

describe('AppUI', () => {
  it('starts collapsed and toggles an accessible controls popover', () => {
    const container = document.createElement('div');
    new AppUI(container, storage());
    const trigger = container.querySelector<HTMLButtonElement>('[data-action="controls"]')!;
    const popover = container.querySelector<HTMLElement>('[data-controls-popover]')!;

    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(popover.hasAttribute('hidden')).toBe(true);
    trigger.click();
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(popover.hasAttribute('hidden')).toBe(false);
  });

  it('collapses after a selection and reopens for errors', () => {
    const container = document.createElement('div');
    const ui = new AppUI(container, storage());
    container.querySelector<HTMLButtonElement>('[data-action="controls"]')!.click();
    container.querySelector<HTMLButtonElement>('[data-age="child"]')!.click();
    expect(container.querySelector('[data-controls-popover]')?.hasAttribute('hidden')).toBe(true);

    ui.setStatus('Camera failed', 'error');
    expect(container.querySelector('[data-controls-popover]')?.hasAttribute('hidden')).toBe(false);
  });

  it('closes on Escape and outside pointer input, then removes document listeners', () => {
    const container = document.createElement('div');
    document.body.append(container);
    const ui = new AppUI(container, storage());
    const trigger = container.querySelector<HTMLButtonElement>('[data-action="controls"]')!;

    trigger.click();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(trigger);

    trigger.click();
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(trigger.getAttribute('aria-expanded')).toBe('false');

    ui.destroy();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    container.remove();
  });

  it('uses Chinese by default for a Chinese browser and switches the complete panel to English', () => {
    const container = document.createElement('div');
    const store = storage();
    const ui = new AppUI(container, store, { browserLanguage: 'zh-CN' });

    expect(document.documentElement.lang).toBe('zh-CN');
    expect(container.querySelector('strong')?.textContent).toBe('选择角色');
    expect(container.querySelector('[data-age="child"]')?.textContent).toBe('儿童');
    expect(container.querySelector('[data-gender="female"]')?.textContent).toBe('女');
    expect(container.querySelector('[data-action="camera"]')?.textContent).toContain('切换摄像头');
    expect(container.querySelector('[data-gesture]')?.textContent).toContain('双手');

    ui.setGestureState(2, true);
    expect(container.querySelector('[data-gesture]')?.textContent).toContain('已触发');

    container.querySelector<HTMLButtonElement>('[data-language="en"]')?.click();

    expect(container.querySelector('strong')?.textContent).toBe('Choose your character');
    expect(container.querySelector('[data-age="child"]')?.textContent).toBe('Child');
    expect(container.querySelector('[data-gender="female"]')?.textContent).toBe('Female');
    expect(store.setItem).toHaveBeenLastCalledWith('finger-frame-language', 'en');
  });

  it('starts with adult female and emits role changes from manual controls', () => {
    const container = document.createElement('div');
    const store = storage();
    const ui = new AppUI(container, store);
    const listener = vi.fn();
    ui.onRoleChange(listener);

    container.querySelector<HTMLButtonElement>('[data-age="child"]')?.click();
    container.querySelector<HTMLButtonElement>('[data-gender="male"]')?.click();

    expect(ui.selectedRole.id).toBe('child-male');
    expect(listener).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'child-male' }));
    expect(store.setItem).toHaveBeenLastCalledWith('finger-frame-role', 'child-male');
  });

  it('restores a saved role and emits quality and camera actions', () => {
    const container = document.createElement('div');
    const ui = new AppUI(container, storage('senior-male'));
    const quality = vi.fn();
    const camera = vi.fn();
    ui.onQualityChange(quality);
    ui.onCameraChange(camera);

    const select = container.querySelector<HTMLSelectElement>('[data-control="quality"]')!;
    select.value = 'low';
    select.dispatchEvent(new Event('change'));
    container.querySelector<HTMLButtonElement>('[data-action="camera"]')?.click();

    expect(ui.selectedRole.id).toBe('senior-male');
    expect(quality).toHaveBeenCalledWith('low');
    expect(camera).toHaveBeenCalledOnce();
  });
});

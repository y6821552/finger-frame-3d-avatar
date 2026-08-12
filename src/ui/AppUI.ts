import {
  AGE_GROUPS,
  GENDERS,
  findRole,
  loadSavedRole,
  type AgeGroup,
  type AvatarRole,
  type Gender,
} from '../avatar/roles';
import type { QualityMode } from '../performance/QualityController';

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;
export type Language = 'zh' | 'en';

export interface AppUIOptions {
  browserLanguage?: string;
}

const COPY = {
  zh: {
    eyebrow: '本地 3D 实时体验', title: '选择角色', starting: '启动中…',
    ageLabel: '年龄段', genderLabel: '性别', quality: '画质', camera: '↻ 切换摄像头',
    cameraAria: '切换摄像头', auto: '自动', high: '高', medium: '中', low: '低',
    ages: { child: '儿童', teen: '青少年', adult: '成年人', senior: '老年人' },
    genders: { male: '男', female: '女' },
  },
  en: {
    eyebrow: 'LOCAL 3D PORTAL', title: 'Choose your character', starting: 'Starting…',
    ageLabel: 'Age group', genderLabel: 'Gender', quality: 'Quality', camera: '↻ Switch camera',
    cameraAria: 'Switch camera', auto: 'Auto', high: 'High', medium: 'Medium', low: 'Low',
    ages: { child: 'Child', teen: 'Teen', adult: 'Adult', senior: 'Senior' },
    genders: { male: 'Male', female: 'Female' },
  },
} as const;

export class AppUI {
  selectedRole: AvatarRole;
  private roleListeners: Array<(role: AvatarRole) => void> = [];
  private qualityListeners: Array<(mode: QualityMode) => void> = [];
  private cameraListeners: Array<() => void> = [];
  private status!: HTMLElement;
  private fps!: HTMLElement;
  private language: Language;
  private qualityMode: QualityMode = 'auto';
  private statusMessage = 'Starting…';
  private statusState: 'loading' | 'ready' | 'warning' | 'error' = 'loading';
  private gestureHands = 0;
  private gestureActive = false;

  constructor(
    private readonly container: HTMLElement,
    private readonly storage: StorageLike,
    options: AppUIOptions = {},
  ) {
    this.selectedRole = loadSavedRole(storage);
    this.language = resolveLanguage(storage.getItem('finger-frame-language'), options.browserLanguage);
    document.documentElement.lang = this.language === 'zh' ? 'zh-CN' : 'en';
    this.render();
  }

  onRoleChange(listener: (role: AvatarRole) => void): () => void {
    this.roleListeners.push(listener);
    return () => { this.roleListeners = this.roleListeners.filter((candidate) => candidate !== listener); };
  }

  onQualityChange(listener: (mode: QualityMode) => void): () => void {
    this.qualityListeners.push(listener);
    return () => { this.qualityListeners = this.qualityListeners.filter((candidate) => candidate !== listener); };
  }

  onCameraChange(listener: () => void): () => void {
    this.cameraListeners.push(listener);
    return () => { this.cameraListeners = this.cameraListeners.filter((candidate) => candidate !== listener); };
  }

  setStatus(message: string, state: 'loading' | 'ready' | 'warning' | 'error' = 'ready'): void {
    this.statusMessage = message;
    this.statusState = state;
    this.status.textContent = translateStatus(message, this.language);
    this.container.dataset.state = state;
  }

  setGestureState(handCount: number, active: boolean): void {
    this.gestureHands = Math.min(2, Math.max(0, handCount));
    this.gestureActive = active;
    this.refreshGesture();
  }

  setFps(value: number): void {
    this.fps.textContent = `${Math.max(0, Math.round(value))} FPS`;
  }

  setQuality(mode: QualityMode): void {
    this.qualityMode = mode;
    requireElement<HTMLSelectElement>(this.container, '[data-control="quality"]').value = mode;
  }

  destroy(): void {
    this.roleListeners = [];
    this.qualityListeners = [];
    this.cameraListeners = [];
    this.container.replaceChildren();
  }

  private render(): void {
    const copy = COPY[this.language];
    this.container.className = 'control-panel';
    this.container.innerHTML = `
      <div class="control-head">
        <div>
          <span class="eyebrow">${copy.eyebrow}</span>
          <strong>${copy.title}</strong>
        </div>
        <div class="head-actions">
          <div class="language-switch" aria-label="Language / 语言">
            <button type="button" data-language="zh">中文</button>
            <button type="button" data-language="en">EN</button>
          </div>
          <div class="live-status"><span class="status-dot"></span><span data-status>${copy.starting}</span></div>
        </div>
      </div>
      <div class="gesture-guide" data-gesture></div>
      <div class="control-row" data-group="age" aria-label="${copy.ageLabel}"></div>
      <div class="control-row" data-group="gender" aria-label="${copy.genderLabel}"></div>
      <div class="control-footer">
        <label class="quality-label">${copy.quality}
          <select data-control="quality">
            <option value="auto">${copy.auto}</option>
            <option value="high">${copy.high}</option>
            <option value="medium">${copy.medium}</option>
            <option value="low">${copy.low}</option>
          </select>
        </label>
        <button class="icon-action" type="button" data-action="camera" aria-label="${copy.cameraAria}">${copy.camera}</button>
        <span class="fps" data-fps>-- FPS</span>
      </div>
    `;
    this.status = requireElement(this.container, '[data-status]');
    this.fps = requireElement(this.container, '[data-fps]');
    this.buildButtons();
    this.installControlListeners();
    this.setStatus(this.statusMessage, this.statusState);
    this.setQuality(this.qualityMode);
    this.refreshGesture();
  }

  private installControlListeners(): void {
    requireElement<HTMLSelectElement>(this.container, '[data-control="quality"]').addEventListener('change', (event) => {
      const mode = (event.currentTarget as HTMLSelectElement).value as QualityMode;
      this.qualityMode = mode;
      this.qualityListeners.forEach((listener) => listener(mode));
    });
    requireElement(this.container, '[data-action="camera"]').addEventListener('click', () => {
      this.cameraListeners.forEach((listener) => listener());
    });
    this.container.querySelectorAll<HTMLButtonElement>('[data-language]').forEach((button) => {
      button.classList.toggle('active', button.dataset.language === this.language);
      button.addEventListener('click', () => {
        const language = button.dataset.language as Language;
        if (language === this.language) return;
        this.language = language;
        this.storage.setItem('finger-frame-language', language);
        document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
        this.render();
      });
    });
  }

  private buildButtons(): void {
    const ageGroup = requireElement(this.container, '[data-group="age"]');
    const genderGroup = requireElement(this.container, '[data-group="gender"]');
    for (const age of AGE_GROUPS) {
      ageGroup.append(this.button(COPY[this.language].ages[age], 'age', age, () => this.choose(age, this.selectedRole.gender)));
    }
    for (const gender of GENDERS) {
      genderGroup.append(this.button(COPY[this.language].genders[gender], 'gender', gender, () => this.choose(this.selectedRole.age, gender)));
    }
    this.refreshButtons();
  }

  private button(label: string, key: 'age' | 'gender', value: string, action: () => void): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'segment';
    button.textContent = label;
    button.dataset[key] = value;
    button.addEventListener('click', action);
    return button;
  }

  private choose(age: AgeGroup, gender: Gender): void {
    const next = findRole(age, gender);
    if (next.id === this.selectedRole.id) return;
    this.selectedRole = next;
    this.storage.setItem('finger-frame-role', next.id);
    this.refreshButtons();
    this.roleListeners.forEach((listener) => listener(next));
  }

  private refreshButtons(): void {
    this.container.querySelectorAll<HTMLElement>('[data-age]').forEach((element) => {
      element.classList.toggle('active', element.dataset.age === this.selectedRole.age);
    });
    this.container.querySelectorAll<HTMLElement>('[data-gender]').forEach((element) => {
      element.classList.toggle('active', element.dataset.gender === this.selectedRole.gender);
    });
  }

  private refreshGesture(): void {
    const target = requireElement(this.container, '[data-gesture]');
    if (this.language === 'zh') {
      target.textContent = this.gestureActive
        ? '✓ 手势已触发 · 角色正在实时跟随'
        : this.gestureHands === 0
          ? '请将双手举入画面，用食指和拇指组成相框'
          : this.gestureHands === 1
            ? '已检测到一只手，请再举起另一只手'
            : '已检测到双手，请张开食指和拇指组成相框';
    } else {
      target.textContent = this.gestureActive
        ? '✓ Gesture active · avatar tracking live'
        : this.gestureHands === 0
          ? 'Raise both hands and form a frame with index fingers and thumbs'
          : this.gestureHands === 1
            ? 'One hand detected — raise the other hand'
            : 'Both hands detected — open index fingers and thumbs into a frame';
    }
    target.dataset.active = String(this.gestureActive);
  }
}

function requireElement<T extends Element = HTMLElement>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`Missing UI element: ${selector}`);
  return element;
}

function resolveLanguage(saved: string | null, browserLanguage?: string): Language {
  if (saved === 'zh' || saved === 'en') return saved;
  if (browserLanguage?.toLowerCase().startsWith('en')) return 'en';
  return 'zh';
}

function translateStatus(message: string, language: Language): string {
  if (language === 'en') return message;
  const exact: Record<string, string> = {
    'Starting…': '启动中…',
    'Starting camera…': '正在启动摄像头…',
    'Loading local tracking models…': '正在加载本地识别模型…',
    'Switching camera…': '正在切换摄像头…',
    'WebGL unavailable · Toon fallback active': 'WebGL 不可用 · 已启用卡通备用渲染',
  };
  if (exact[message]) return exact[message];
  if (message.startsWith('Live ·')) return message.replace('Live ·', '实时 ·').replace(' avatar', ' 角色');
  if (message.startsWith('Tracking paused ·')) return message.replace('Tracking paused ·', '跟踪已暂停 ·');
  return message;
}

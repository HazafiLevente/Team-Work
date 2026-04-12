import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type UiThemeKey =
  | 'clean-cyan'
  | 'purple-premium'
  | 'glass-slate'
  | 'soft-light';

export type UiSettings = {
  darkMode: boolean;
  setupMode: boolean;
  compactLayout: boolean;
  autoOpenProduct: boolean;
  language: string;
  theme: UiThemeKey;
  publicProfile: boolean;
  rememberFilters: boolean;
};

const DEFAULT_SETTINGS: UiSettings = {
  darkMode: true,
  setupMode: false,
  compactLayout: false,
  autoOpenProduct: true,
  language: 'hu',
  theme: 'clean-cyan',
  publicProfile: true,
  rememberFilters: true,
};

@Injectable({ providedIn: 'root' })
export class UiSettingsService {
  private readonly KEY = 'ui-settings';

  private _state = new BehaviorSubject<UiSettings>(this.load());
  readonly state$ = this._state.asObservable();

  get value(): UiSettings {
    return this._state.value;
  }

  update(patch: Partial<UiSettings>) {
    const next = { ...this.value, ...patch };
    this._state.next(next);
    localStorage.setItem(this.KEY, JSON.stringify(next));
  }

  private load(): UiSettings {
    try {
      const raw = localStorage.getItem(this.KEY);
      return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  }
}

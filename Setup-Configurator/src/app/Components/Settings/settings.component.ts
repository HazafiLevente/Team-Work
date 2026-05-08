import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

import { UiSettingsService, UiThemeKey } from '../Services/SettingService/ui-settings.service';

type ThemeOption = {
  key: UiThemeKey;
  title: string;
  sub: string;
  previewClass: string;
  swatches: string[];
};

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css']
})
export class SettingsComponent implements OnDestroy {
  form: FormGroup;
  private sub?: Subscription;

  readonly appearanceOptions = [
    {
      key: 'dark',
      title: 'Sötét tema',
      sub: 'Ez az alapértelmezett esti, kontrasztos, modernebb megjelenés.'
    },
    {
      key: 'light',
      title: 'Világos tema',
      sub: 'Tisztább, nappali nézettel. A színpaletta itt is külön valasztható.'
    }
  ] as const;

  readonly themeOptions: ThemeOption[] = [
    {
      key: 'clean-cyan',
      title: 'Clean Cyan',
      sub: 'Hideg cyan, pontos technológiai érzet.',
      previewClass: 'theme-clean-cyan',
      swatches: ['#7dd3fc', '#38bdf8', '#22d3ee']
    },
    {
      key: 'purple-premium',
      title: 'Purple Premium',
      sub: 'Luxusos lila, erős prémium karakterrel.',
      previewClass: 'theme-purple-premium',
      swatches: ['#c084fc', '#8b5cf6', '#e879f9']
    },
    {
      key: 'glass-slate',
      title: 'Glass Slate',
      sub: 'Zöldes paletta, tiszta üveges hatással.',
      previewClass: 'theme-glass-slate',
      swatches: ['#34d399', '#14b8a6', '#2dd4bf']
    },
    {
      key: 'soft-light',
      title: 'Soft Light',
      sub: 'Kékes-lila, nyugodtabb modernebb tónus.',
      previewClass: 'theme-soft-light',
      swatches: ['#818cf8', '#38bdf8', '#a5b4fc']
    }
  ];

  constructor(
    private fb: FormBuilder,
    private ui: UiSettingsService
  ) {
    this.form = this.fb.group({
      darkMode: [true],
      setupMode: [false],
      compactLayout: [false],
      autoOpenProduct: [true],
      language: ['hu'],
      theme: ['clean-cyan'],
      publicProfile: [true],
      rememberFilters: [true]
    });

    this.form.patchValue(this.ui.value, { emitEvent: false });

    this.sub = this.form.valueChanges.subscribe(v => {
      this.ui.update(v as any);
    });
  }

  get activeThemeTitle(): string {
    return this.selectedTheme?.title ?? 'Ismeretlen';
  }

  get activeAppearanceLabel(): string {
    return this.form.value.darkMode ? 'Sötet' : 'Világos';
  }

  get selectedTheme(): ThemeOption | undefined {
    return this.themeOptions.find(t => t.key === this.form.value.theme);
  }

  isThemeActive(key: UiThemeKey): boolean {
    return this.form.value.theme === key;
  }

  setAppearance(mode: 'dark' | 'light'): void {
    this.form.patchValue({ darkMode: mode === 'dark' });
  }

  selectTheme(key: UiThemeKey): void {
    this.form.patchValue({ theme: key });
  }

  save(): void {
    this.ui.update(this.form.getRawValue() as any);
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}

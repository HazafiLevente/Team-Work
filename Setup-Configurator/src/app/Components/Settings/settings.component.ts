import {
  Component,
  OnDestroy
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

import { UiSettingsService, UiThemeKey } from '../Services/SettingService/ui-settings.service';
import { GoogleTranslateComponent } from '../Shared/GoogleTranslate/google-translate.component';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, GoogleTranslateComponent],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css']
})
export class SettingsComponent implements OnDestroy {
  form!: FormGroup;
  private sub?: Subscription;

  themeOptions: {
    key: UiThemeKey;
    title: string;
    sub: string;
    previewClass: string;
  }[] = [
    {
      key: 'clean-cyan',
      title: 'Clean Cyan',
      sub: 'Letisztult, modern, kékes-cyan',
      previewClass: 'theme-clean-cyan'
    },
    {
      key: 'purple-premium',
      title: 'Purple Premium',
      sub: 'Elegáns lila prémium hangulat',
      previewClass: 'theme-purple-premium'
    },
    {
      key: 'glass-slate',
      title: 'Glass Slate',
      sub: 'Üvegesebb, modernebb app-hatás',
      previewClass: 'theme-glass-slate'
    },
    {
      key: 'soft-light',
      title: 'Soft Light',
      sub: 'Lágyabb, világosabb kontraszt',
      previewClass: 'theme-soft-light'
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
      theme: ['glass-slate'],
      publicProfile: [true],
      rememberFilters: [true],
    });

    this.form.patchValue(this.ui.value, { emitEvent: false });

    this.sub = this.form.valueChanges.subscribe(v => {
      this.ui.update(v as any);
    });
  }

  get activeThemeTitle(): string {
    return this.themeOptions.find(t => t.key === this.form.value.theme)?.title ?? 'Ismeretlen';
  }

  isThemeActive(key: UiThemeKey): boolean {
    return this.form.value.theme === key;
  }

  selectTheme(key: UiThemeKey) {
    this.form.patchValue({ theme: key });
  }

  save() {
    this.ui.update(this.form.getRawValue() as any);
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}

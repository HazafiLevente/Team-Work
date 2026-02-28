import {
  Component,
  OnDestroy,
  AfterViewInit
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

import { UiSettingsService } from '../Services/SettingService/ui-settings.service';
import {GoogleTranslateComponent} from '../Shared/GoogleTranslate/google-translate.component';

declare global {
  interface Window {
    googleTranslateElementInit?: () => void;
    google?: any;
  }
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, GoogleTranslateComponent],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css']
})
export class SettingsComponent implements OnDestroy, AfterViewInit {

  form!: FormGroup;
  private sub?: Subscription;

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
      accent: ['purple'],
      publicProfile: [true],
      rememberFilters: [true],
    });

    this.form.patchValue(this.ui.value, { emitEvent: false });

    this.sub = this.form.valueChanges.subscribe(v => {
      this.ui.update(v as any);
    });
  }

  ngAfterViewInit(): void {
    this.loadGoogleTranslate();
  }

  private loadGoogleTranslate() {

    // Ha már létezik a google objektum → csak init
    if (window.google?.translate?.TranslateElement) {
      this.initTranslate();
      return;
    }

    // Globális callback (a Google script ezt hívja)
    window.googleTranslateElementInit = () => {
      this.initTranslate();
    };

    // Ha már be van töltve a script, ne adjuk hozzá újra
    const existingScript = document.querySelector(
      'script[src*="translate.google.com/translate_a/element.js"]'
    );

    if (existingScript) return;

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src =
      'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    script.async = true;

    document.body.appendChild(script);
  }

  private initTranslate() {
    const host = document.getElementById('google_translate_element');

    if (!host) return;

    // töröljük az előzőt (route váltás miatt)
    host.innerHTML = '';

    new window.google.translate.TranslateElement(
      {
        pageLanguage: 'hu',
        layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE
      },
      'google_translate_element'
    );
  }

  save() {
    this.ui.update(this.form.getRawValue() as any);
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}

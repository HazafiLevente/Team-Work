import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

import { UiSettingsService } from '../Services/SettingService/ui-settings.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css']
})
export class SettingsComponent implements OnDestroy {

  form!: FormGroup;
  private sub?: Subscription;

  constructor(
    private fb: FormBuilder,
    private ui: UiSettingsService
  ) {
    // ✅ ITT hozunk létre mindent
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

    // betöltjük a mentett beállításokat
    this.form.patchValue(this.ui.value, { emitEvent: false });

    // ha változik → mentjük + broadcast
    this.sub = this.form.valueChanges.subscribe(v => {
      this.ui.update(v as any);
    });
  }

  save() {
    this.ui.update(this.form.getRawValue() as any);
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-profile-info-section',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile-info.component.html',
  styleUrl: './profile-info.component.css'
})
export class ProfileInfoSectionComponent implements OnInit {

  form!: FormGroup;
  editingField: string | null = null;

  constructor(private fb: FormBuilder, private http: HttpClient) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      username: [''],
      fullname: [''],
      phone: [''],
      age: [''],
      city: ['']
    });

    this.loadProfile();
  }

  loadProfile() {
    this.http.get<any>('/api/profile', { withCredentials: true })
      .subscribe(data => this.form.patchValue(data));
  }

  enableEdit(field: string) {
    this.editingField = field;

    setTimeout(() => {
      const el = document.querySelector(
        `input[formControlName="${field}"]`
      ) as HTMLInputElement | null;

      el?.focus();
      el?.select();
    });
  }

  cancelEdit() {
    this.editingField = null;
    this.loadProfile();
  }

  saveField() {
    this.http.put('/api/profile', this.form.value, { withCredentials: true })
      .subscribe(() => {
        this.editingField = null;
      });
  }
}

import { Component, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import {CommonModule} from '@angular/common';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './profile.component.html'
})
export class ProfileComponent implements OnInit {

  form!: any;
  passwordForm!: any;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient
  ) {}

  ngOnInit() {

    this.form = this.fb.group({
      username: [''],
      fullname: [''],
      phone: [''],
      age: [''],
      city: ['']
    });

    this.passwordForm = this.fb.group({
      oldPassword: [''],
      newPassword: [''],
      confirm: ['']
    });

    this.http.get<any>('/api/profile', { withCredentials: true })
      .subscribe(data => this.form.patchValue(data));
  }

  saveProfile() {
    if (this.form.invalid) return;

    this.http.put(
      '/api/profile',
      this.form.value,
      { withCredentials: true }
    ).subscribe({
      next: () => {
        alert('✅ Profil mentve');
      },
      error: err => {
        console.error(err);
        alert('❌ Hiba a profil mentésekor');
      }
    });
  }

  changePassword() {
    const { oldPassword, newPassword, confirm } = this.passwordForm.value;

    if (!oldPassword || !newPassword) {
      alert('❗ Tölts ki minden mezőt');
      return;
    }

    if (newPassword !== confirm) {
      alert('❌ A jelszavak nem egyeznek');
      return;
    }

    this.http.put(
      '/api/profile/password',
      { oldPassword, newPassword },
      { withCredentials: true }
    ).subscribe({
      next: () => {
        alert('🔒 Jelszó megváltoztatva');
        this.passwordForm.reset();
      },
      error: err => {
        console.error(err);
        alert('❌ Hibás régi jelszó');
      }
    });
  }

}


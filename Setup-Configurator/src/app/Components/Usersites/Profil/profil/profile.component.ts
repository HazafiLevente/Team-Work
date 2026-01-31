import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css'
})
export class ProfileComponent implements OnInit {

  activeTab: 'profile' | 'favorite' | 'setup' = 'profile';

  form!: FormGroup;
  passwordForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
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

    this.http
      .get<any>('/api/profile', { withCredentials: true })
      .subscribe(data => this.form.patchValue(data));
  }

  setTab(tab: 'profile' | 'favorite' | 'setup') {
    this.activeTab = tab;
  }

  saveProfile() {
    console.log('SAVE CLICK', this.form.value);

    this.http.put('/api/profile', this.form.value, { withCredentials: true })
      .subscribe({
        next: (res) => {
          console.log('SAVE OK', res);
          alert('✅ Profil mentve');
        },
        error: (err) => {
          console.error('SAVE ERROR', err);
          alert(`❌ Mentés hiba: ${err.status} (nézd a console-t)`);
        }
      });
  }

  changePassword() {
    const { oldPassword, newPassword, confirm } = this.passwordForm.value;
    console.log('PWD CLICK', { oldPassword, newPassword, confirm });

    if (!oldPassword || !newPassword || !confirm) {
      alert('❌ Tölts ki minden mezőt');
      return;
    }

    if (newPassword !== confirm) {
      alert('❌ A jelszavak nem egyeznek');
      return;
    }

    this.http.put('/api/profile/password', { oldPassword, newPassword }, { withCredentials: true })
      .subscribe({
        next: (res) => {
          console.log('PWD OK', res);
          alert('🔒 Jelszó megváltoztatva');
          this.passwordForm.reset();
        },
        error: (err) => {
          console.error('PWD ERROR', err);
          alert(`❌ Jelszó csere hiba: ${err.status} (nézd a console-t)`);
        }
      });
  }
}

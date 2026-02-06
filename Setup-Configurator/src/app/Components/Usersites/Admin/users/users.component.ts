import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.css']
})
export class UsersComponent implements OnInit {

  usersList: any[] = [];
  loading = true;

  editing: { [key: string]: boolean } = {};

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadUsers();
  }

  /* ======================
     LOAD USERS
  ====================== */
  loadUsers() {
    console.log('🔄 Loading users...');
    this.http.get<any>('/api/admin/users', {
      withCredentials: true
    }).subscribe({
      next: res => {
        this.usersList = res.users || [];
        this.loading = false;
      },
      error: err => {
        console.error('❌ Users load error', err);
        this.loading = false;
      }
    });
  }

  /* ======================
     INLINE EDIT HELPERS
  ====================== */
  edit(user: any, field: string) {
    this.editing[`${user.id}_${field}`] = true;
  }

  stopEdit(user: any, field: string) {
    this.editing[`${user.id}_${field}`] = false;
  }

  isEditing(user: any, field: string): boolean {
    return !!this.editing[`${user.id}_${field}`];
  }

  /* ======================
     SAVE USER
  ====================== */
  saveUser(user: any) {
    this.http.patch(
      `/api/admin/users/${user.id}`,
      {
        username: user.username,
        city: user.city,
        age: user.age,
        phone: user.phone,
        role: user.role
      },
      { withCredentials: true }
    ).subscribe({
      next: () => console.log('💾 User saved:', user.id),
      error: err => console.error('❌ Save error', err)
    });
  }
}

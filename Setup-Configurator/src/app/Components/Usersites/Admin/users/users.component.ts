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

  constructor(private http: HttpClient) { }

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    console.log('🔄 Loading users...');
    this.http.get<any>('/api/admin/users', {
      withCredentials: true
    }).subscribe({
      next: res => {
        console.log('✅ Users response:', res);
        this.usersList = res.users;
        console.log('👥 Users list:', this.usersList);
        this.loading = false;
      },
      error: err => {
        console.error('❌ Users load error', err);
        this.loading = false;
      }
    });
  }

  saveUser(user: any) {
    this.http.patch(
      `/api/admin/users/${user.id}`,
      {
        username: user.username,
        phone: user.phone,
        city: user.city,
        age: user.age,
        role: user.role
      },
      { withCredentials: true }
    ).subscribe(() => {
      console.log('User saved:', user.id);
    });
  }
}

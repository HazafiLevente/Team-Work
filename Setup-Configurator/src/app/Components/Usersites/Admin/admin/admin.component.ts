import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

@Component({
  standalone: true,
  selector: 'app-admin',
  imports: [CommonModule],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css'
})
export class AdminComponent implements OnInit {

  users = 0;
  tables = 0;
  productTables = 0;
  products = 0;

  loading = true;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.http.get<any>('/api/admin/stats', {
      withCredentials: true
    }).subscribe({
      next: res => {
        this.users = res.users;
        this.tables = res.tables;
        this.productTables = res.productTables;
        this.products = res.products;
        this.loading = false;
      },
      error: err => {
        console.error("Admin stats error", err);
        this.loading = false;
      }
    });
  }
}

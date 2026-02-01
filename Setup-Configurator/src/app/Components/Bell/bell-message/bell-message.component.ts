import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-bell-message',
  imports: [CommonModule],
  templateUrl: './bell-message.component.html',
  styleUrl: './bell-message.component.css'
})
export class BellMessageComponent implements OnInit {

  message: any;

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    const type = this.route.snapshot.paramMap.get('type');

    this.http
      .get(`/api/bell/${type}/${id}`, { withCredentials: true })
      .subscribe(data => this.message = data);
  }


  timeAgo(date: string): string {
    const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);

    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
    return `${Math.floor(diff / 604800)}w`;
  }
}

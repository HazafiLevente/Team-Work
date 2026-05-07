import {HttpClient} from '@angular/common/http';
import {Component} from '@angular/core';

@Component({
  selector: 'app-data',
  standalone: true,
  template: ``,
  imports: []
})
export class DataService {
  constructor(private http: HttpClient) {}






  loadUsers () {
    this.http.get('/api/admin/users');
  }
}

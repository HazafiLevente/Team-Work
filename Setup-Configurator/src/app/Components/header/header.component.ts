import { Component } from '@angular/core';
import {HttpClient} from '@angular/common/http';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent {
  constructor(private http:HttpClient) {}
  public test() {
    this.http.get('http://localhost:3000/test').subscribe(res => console.log(res));
  }
}

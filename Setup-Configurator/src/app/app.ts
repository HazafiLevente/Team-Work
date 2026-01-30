import { Component } from '@angular/core';
import { AuthService } from './Components/Services/Auth/auth.service';
import {HeaderComponent} from './Components/header/header.component';
import {RouterOutlet} from '@angular/router';


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    HeaderComponent,
    RouterOutlet

  ],
  templateUrl: './app.html'
})
export class App {
  constructor(private auth: AuthService) {}

  ngOnInit() {
    this.auth.check(); // ⬅️ EZ NÉLKÜL SEMMI NEM MŰKÖDIK
  }
}


import { Component } from "@angular/core";
import {Router, RouterLink} from "@angular/router";
import { AuthService } from "../../Services/Auth/auth.service";
import {FormsModule} from '@angular/forms';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})


export class RegisterComponent {
  fullname = "";
  username = "";
  email = "";
  password = "";

  constructor(
    private auth: AuthService,
    private router: Router
  ) {}

  submit() {
    this.auth.register({
      fullname: this.fullname,
      username: this.username,
      email: this.email,
      password: this.password
    }).subscribe({
      next: () => {
        this.auth.check();   // ⬅️ FONTOS
        this.router.navigateByUrl('/home');
      }
    });
  }

}

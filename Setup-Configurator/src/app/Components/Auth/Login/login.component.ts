import { Component } from "@angular/core";
import {Router, RouterLink} from "@angular/router";
import { AuthService } from "../../Services/Auth/auth.service";
import {FormsModule} from '@angular/forms';


@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})


export class LoginComponent {
  email = "";
  password = "";

  constructor(
    private auth: AuthService,
    private router: Router
  ) {}

  rememberMe = false;

  submit() {
    this.auth.login({
      email: this.email,
      password: this.password,
      rememberMe: this.rememberMe
    }).subscribe({
      next: () => {
        this.auth.check();          // ⬅️ marad
        setTimeout(() => {
          this.auth.check();        // ⬅️ extra biztonság
        }, 50);
        this.router.navigateByUrl('/home');
      }
    });
  }


}

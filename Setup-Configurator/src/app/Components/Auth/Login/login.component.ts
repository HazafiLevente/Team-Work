import { Component } from "@angular/core";
import { Router, RouterLink } from "@angular/router";
import { FormsModule } from '@angular/forms';
import { AuthService } from "../../Services/Auth/auth.service";
import { filter, take } from "rxjs/operators";
import { CommonModule } from '@angular/common';


@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})

export class LoginComponent {
  email = "";
  password = "";
  rememberMe = false;
  errorMessage = "";

  constructor(
    private auth: AuthService,
    private router: Router
  ) {}

  submit() {
    this.errorMessage = "";

    this.auth.login({
      email: this.email,
      password: this.password,
      rememberMe: this.rememberMe
    })
      .pipe(take(1))
      .subscribe({
        next: (user) => {
          if (!user) {
            this.errorMessage = "Hibás email vagy jelszó!";
            return;
          }
          this.router.navigateByUrl('/home');
        },
        error: (err) => {
          if (err.status === 401) {
            this.errorMessage = "Hibás email vagy jelszó!";
          } else {
            this.errorMessage = "Szerver hiba. Próbáld újra.";
          }
        }
      });
  }

}


import { Component } from "@angular/core";
import { Router, RouterLink } from "@angular/router";
import { FormsModule } from '@angular/forms';
import { AuthService } from "../../Services/Auth/auth.service";
import { filter, take } from "rxjs/operators";

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
  rememberMe = false;

  constructor(
    private auth: AuthService,
    private router: Router
  ) {}

  submit() {
    this.auth.login({
      email: this.email,
      password: this.password,
      rememberMe: this.rememberMe
    }).pipe(
      // ✅ biztosan csak akkor navigálunk, ha az új user tényleg megjött
      filter(u => !!u),
      take(1)
    ).subscribe({
      next: () => this.router.navigateByUrl('/home')
    });
  }
}

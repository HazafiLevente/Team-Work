import { Component } from "@angular/core";
import { CommonModule } from '@angular/common';
import { Router } from "@angular/router";
import { AuthService } from "../../Services/Auth/auth.service";

import { RegisterFormComponent } from "./register-form/register-form.component";
import { RegisterCodeComponent } from "./register-code/register-code.component";

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, RegisterFormComponent, RegisterCodeComponent],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {
  fullname = "";
  username = "";
  email = "";
  password = "";

  step: 'form' | 'code' = 'form';
  code = "";

  loading = false;
  errorMessage = "";
  successMessage = "";

  constructor(private auth: AuthService, private router: Router) {}

  submit() {
    this.errorMessage = "";
    this.successMessage = "";
    this.loading = true;

    this.auth.requestRegisterCode({
      fullname: this.fullname,
      username: this.username,
      email: this.email,
      password: this.password
    }).subscribe({
      next: (resp: any) => {
        this.loading = false;
        this.step = 'code';

        this.successMessage = resp?.mailSent === false
          ? "A kód generálva. (Email küldés hiba történt.)"
          : "Kód elküldve emailben.";
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = "Nem sikerült elküldeni a kódot.";
      }
    });
  }

  resendCode() {
    this.submit();
  }

  verify() {
    this.errorMessage = "";
    this.successMessage = "";
    this.loading = true;

    this.auth.verifyRegisterCode({
      fullname: this.fullname,
      username: this.username,
      email: this.email,
      password: this.password,
      code: this.code
    }).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigateByUrl('/home');
      },
      error: () => {
        this.loading = false;
        this.errorMessage = "Hibás vagy lejárt kód.";
      }
    });
  }

  backToForm() {
    this.step = 'form';
    this.code = "";
    this.errorMessage = "";
    this.successMessage = "";
  }
}

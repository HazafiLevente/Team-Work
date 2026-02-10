import { Component } from "@angular/core";
import { CommonModule } from '@angular/common';
import {Router, RouterLink} from "@angular/router";
import { AuthService } from "../../Services/Auth/auth.service";
import {FormsModule} from '@angular/forms';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
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

  step: 'form' | 'code' = 'form';
  code = "";

  submit() {
    this.auth.requestRegisterCode({
      fullname: this.fullname,
      username: this.username,
      email: this.email,
      password: this.password
    }).subscribe(() => {
      this.step = 'code';
    });
  }

  verify() {
    this.auth.verifyRegisterCode({
      fullname: this.fullname,
      username: this.username,
      email: this.email,
      password: this.password,
      code: this.code
    }).subscribe(() => {
      this.router.navigateByUrl('/home');
    });
  }



}

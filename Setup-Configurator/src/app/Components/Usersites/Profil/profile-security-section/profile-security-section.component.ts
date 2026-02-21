import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EmailVerifyComponent } from '../../../Auth/Login/email-verify/email-verify.component';
import { NewPasswordComponent } from '../../../Auth/Login/new-password/new-password.component';
import { Router, RouterLink } from "@angular/router";

@Component({
  selector: 'app-profile-security-section',
  standalone: true,
  imports: [CommonModule, EmailVerifyComponent, NewPasswordComponent,RouterLink],
  templateUrl: './profile-security-section.component.html',
  styleUrl: './profile-security-section.component.css'
})
export class ProfileSecuritySectionComponent {
  mode: 'emailVerify' | 'newPassword' = 'emailVerify';
  resetEmail = '';

  handleCodeSent(email: string) {
    this.resetEmail = email;
    this.mode = 'newPassword';
  }

  backToVerify() {
    this.mode = 'emailVerify';
  }
  afterResetFromProfile() {
    this.mode = 'emailVerify';
    // ha mindenképp navigálni akarsz:
    //this.router.navigateByUrl('/user/profile');
  }
}

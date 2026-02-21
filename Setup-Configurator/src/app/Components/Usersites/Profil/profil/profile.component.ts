import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProfileRankSectionComponent } from '../profile-rank-section/profile-rank-section.component';
import { ProfileInfoSectionComponent } from '../profile-info/profile-info.component';
import { ProfileSecuritySectionComponent } from '../profile-security-section/profile-security-section.component';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    ProfileRankSectionComponent,
    ProfileInfoSectionComponent,
    ProfileSecuritySectionComponent
  ],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css'
})
export class ProfileComponent {}

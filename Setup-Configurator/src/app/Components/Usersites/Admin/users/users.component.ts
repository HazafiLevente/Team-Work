import { Component, OnInit, Input, Output, EventEmitter, OnChanges, SimpleChanges, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService, AuthUser } from '../../../Services/Auth/auth.service';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.css']
})
export class UsersComponent implements OnInit, OnChanges {

  @Input() autoExpandUserId: number | null = null;
  @Output() onExpanded = new EventEmitter<number | null>();

  usersList: any[] = [];
  loading = true;

  expandedUserId: any = null;
  userSetups: { [key: string]: any[] } = {};
  loadingSetups: { [key: string]: boolean } = {};

  selectedSetup: any = null;
  setupItems: any[] = [];
  loadingItems = false;
  itemsViewOpen = false;

  editing: { [key: string]: boolean } = {};

  currentUserRole: string = 'user';

  contextMenuVisible = false;
  contextMenuPos = { x: 0, y: 0 };
  contextUser: any = null;

  constructor(private http: HttpClient, private auth: AuthService) { }

  @HostListener('document:click')
  @HostListener('document:contextmenu')
  closeContextMenu() {
    this.contextMenuVisible = false;
  }

  ngOnInit() {
    this.loadUsers();
    this.auth.user$.subscribe((u: AuthUser | null) => {
      if (u) this.currentUserRole = u.role;
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['autoExpandUserId'] && this.autoExpandUserId && this.usersList.length > 0) {
      this.checkAutoExpand();
    }
  }

  checkAutoExpand() {
    const user = this.usersList.find(u => u.id === this.autoExpandUserId);
    if (user) {
      this.expandedUserId = user.id;
      this.loadUserSetups(user.id);
      this.onExpanded.emit(user.id);


      setTimeout(() => {
        const el = document.getElementById('user-card-' + user.id);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }



  loadUsers() {
    console.log('🔄 Loading users...');
    this.http.get<any>('/api/admin/users', {
      withCredentials: true
    }).subscribe({
      next: res => {
        this.usersList = res.users || [];
        this.loading = false;
        if (this.autoExpandUserId) this.checkAutoExpand();
      },
      error: err => {
        console.error('❌ Users load error', err);
        this.loading = false;
      }
    });
  }

  onUserContextMenu(event: MouseEvent, user: any) {
    event.preventDefault();
    event.stopPropagation();
    this.contextUser = user;
    this.contextMenuPos = { x: event.clientX, y: event.clientY };
    this.contextMenuVisible = true;
  }

  get canBan(): boolean {
    return this.currentUserRole === 'admin+' || this.currentUserRole === 'owner';
  }



  edit(user: any, field: string) {
    this.editing[`${user.id}_${field}`] = true;
  }

  stopEdit(user: any, field: string) {
    this.editing[`${user.id}_${field}`] = false;
  }

  isEditing(user: any, field: string): boolean {
    return !!this.editing[`${user.id}_${field}`];
  }



  toggleUser(user: any) {
    const userId = user.id;
    if (this.expandedUserId === userId) {
      this.expandedUserId = null;
    } else {
      this.expandedUserId = userId;
      if (!this.userSetups[userId]) {
        this.loadUserSetups(userId);
      }
    }
  }

  loadUserSetups(userId: any) {
    this.loadingSetups[userId] = true;
    this.http.get<any>(`/api/admin/users/${userId}/setups`, { withCredentials: true })
      .subscribe({
        next: res => {
          this.userSetups[userId] = res.setups || [];
          this.loadingSetups[userId] = false;
        },
        error: err => {
          console.error('❌ User setups load error', err);
          this.loadingSetups[userId] = false;
        }
      });
  }



  onSetupDblClick(setup: any) {
    this.selectedSetup = setup;
    this.itemsViewOpen = true;
    this.loadSetupItems(setup.id);
  }

  loadSetupItems(setupId: any) {
    this.loadingItems = true;
    this.http.get<any[]>(`/api/setup/${setupId}/children`, { withCredentials: true })
      .subscribe({
        next: (items) => {
          this.setupItems = Array.isArray(items) ? items : [];
          this.loadingItems = false;
        },
        error: (err) => {
          console.error('❌ setup items hiba:', err);
          this.setupItems = [];
          this.loadingItems = false;
        }
      });
  }

  closeItemsView() {
    this.itemsViewOpen = false;
    this.selectedSetup = null;
    this.setupItems = [];
  }

  getSetupPrice(setup: any): number {
    return setup.total_price || 0;
  }



  saveUser(user: any) {
    this.http.patch(
      `/api/admin/users/${user.id}`,
      {
        username: user.username,
        city: user.city,
        age: user.age,
        phone: user.phone,
        role: user.role
      },
      { withCredentials: true }
    ).subscribe({
      next: () => {
        console.log('💾 User saved:', user.id);

      },
      error: err => console.error('❌ Save error', err)
    });
  }

  banUser(user: any) {
    if (!this.canBan) return;
    if (!confirm(`Biztosan ki akarod tiltani ${user.username} felhasználót?`)) return;
    this.http.post(`/api/admin/users/${user.id}/ban`, {}, { withCredentials: true })
      .subscribe({
        next: () => {
          user.banned = true;
          console.log('🚫 User banned:', user.id);
        },
        error: err => alert(err.error?.error || 'Hiba a kitiltás során')
      });
  }

  unbanUser(user: any) {
    this.http.post(`/api/admin/users/${user.id}/unban`, {}, { withCredentials: true })
      .subscribe({
        next: () => {
          user.banned = false;
          console.log('✅ User unbanned:', user.id);
        },
        error: err => alert(err.error?.error || 'Hiba a feloldás során')
      });
  }
}

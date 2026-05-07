import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { SetupRoomlistComponent } from '../../Setup/setup-roomlist/setup-roomlist.component';

type SetupList = {
  id: number;
  title: string;
  name: string;
  setupIds: number[];
  isSecret: boolean;
};

@Component({
  selector: 'app-plan',
  standalone: true,
  imports: [CommonModule, HttpClientModule, SetupRoomlistComponent],
  templateUrl: './plan.component.html',
  styleUrls: ['./plan.component.css']
})
export class PlanComponent {
  @Input() fixedLayout: 'desktop' | 'mobile' | null = null;
  lists: SetupList[] = [];
  selectedListId: number | null = null;
  loadingLists = false;

  constructor(private http: HttpClient) {
    this.loadLists();
  }

  loadLists(): void {
    this.loadingLists = true;
    this.http.get<any>('/api/setup/lists', { withCredentials: true }).subscribe({
      next: (res) => {
        this.lists = Array.isArray(res?.lists)
          ? res.lists.map((list: any) => ({
            id: Number(list.id),
            title: String(list.title ?? list.name ?? 'Plan'),
            name: String(list.name ?? ''),
            isSecret: this.toBoolean(list.isSecret ?? list.is_secret ?? list.private ?? list.isPrivate),
            setupIds: Array.isArray(list.setupIds) ? list.setupIds.map((id: any) => Number(id)) : []
          })).filter((list: SetupList) => Number.isFinite(list.id))
          : [];

        const planList = this.lists.find((list) => String(list.name).toLowerCase() === 'plan')
          || this.lists.find((list) => list.title.toLowerCase() === 'plan')
          || this.lists.find((list) => String(list.name).toLowerCase() === 'favorite')
          || this.lists[0];
        this.selectedListId = planList?.id ?? null;
        this.loadingLists = false;
      },
      error: (err) => {
        console.error('Plan listak betoltesi hiba:', err);
        this.lists = [];
        this.selectedListId = null;
        this.loadingLists = false;
      }
    });
  }

  selectList(event: Event): void {
    const value = Number((event.target as HTMLSelectElement).value);
    this.selectedListId = Number.isFinite(value) && value > 0 ? value : null;
  }

  selectedList(): SetupList | null {
    return this.lists.find((list) => list.id === this.selectedListId) || null;
  }

  private toBoolean(value: any): boolean {
    return value === true || value === 'true' || value === 1 || value === '1';
  }
}

import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-setup-pairing-modal',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './setup-pairing-modal.component.html',
    styleUrls: ['./setup-pairing-modal.component.css']
})
export class SetupPairingModalComponent {
    @Input() pairingStage: 'NONE' | 'PICK_SOURCE' | 'PICK_TARGET_SETUP' | 'PICK_TARGET_ITEM' = 'NONE';
    @Input() pairingItemList: any[] = [];
    @Input() connectSourceSetup: any = null;
    @Input() connectTargetSetup: any = null;

    @Output() cancel = new EventEmitter<void>();
    @Output() selectSource = new EventEmitter<any>();
    @Output() finalize = new EventEmitter<any>();

    public getDeviceType(item: any): string {
        const cat = String(item.category || '').toLowerCase();
        if (cat.includes('pc')) return 'pc';
        if (cat.includes('switch')) return 'switch';
        if (cat.includes('router')) return 'router';
        if (cat.includes('modem')) return 'modem';
        if (cat.includes('home_theater')) return 'ht';
        if (cat.includes('setup')) return 'setup';
        return 'other';
    }
}

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

    public get connectableItems(): any[] {
        return (this.pairingItemList || []).filter((item) => this.isConnectable(item));
    }

    public isConnectable(item: any): boolean {
        const type = String(
            item?.setup_type ??
            item?.type ??
            item?.device_type ??
            item?.category ??
            ''
        ).toLowerCase();

        return type.includes('pc') || type.includes('home_theater') || type === 'ht';
    }
}

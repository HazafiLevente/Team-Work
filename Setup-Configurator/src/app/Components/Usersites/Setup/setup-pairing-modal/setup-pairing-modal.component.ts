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
        const type = [
            item?.setup_type,
            item?.type,
            item?.device_type,
            item?.category,
            item?.source_table,
            item?.table_name,
            item?.table,
            item?.slot,
            item?.display_name,
            item?.setup_name,
            item?.name,
            item?.model
        ].map((value) => String(value || '').toLowerCase().replace(/[\s-]+/g, '_').trim()).filter(Boolean).join(' ');

        return (
            type.includes('pc') ||
            type.includes('home_theater') ||
            type === 'ht' ||
            type.includes('network_card') ||
            type.includes('network_adapter') ||
            type.includes('ethernet_adapter') ||
            type.includes('wifi_adapter') ||
            type.includes('wi_fi_adapter') ||
            type.includes('router') ||
            type.includes('switch') ||
            type.includes('modem')
        );
    }
}

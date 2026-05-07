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
    @Input() connectSourceItem: any = null;
    @Input() allowPcHtLinks = false;
    @Input() pairingConnections: any[] = [];

    @Output() cancel = new EventEmitter<void>();
    @Output() selectSource = new EventEmitter<any>();
    @Output() finalize = new EventEmitter<any>();
    @Output() allowPcHtLinksChange = new EventEmitter<boolean>();

    public get connectableItems(): any[] {
        const list = Array.isArray(this.pairingItemList) ? this.pairingItemList : [];

        if (this.pairingStage === 'PICK_SOURCE') {
            // Source can be anything, but hide already "plugged" PC/HT unless checkbox is enabled.
            return list
                .filter((item) => this.hasId(item))
                .filter((item) => {
                    const isPcHt = this.isPcOrHtType(item);
                    if (!isPcHt) return true;
                    if (this.allowPcHtLinks) return true;
                    return !this.hasNetworkEndpointConnection(item);
                });
        }

        if (this.pairingStage === 'PICK_TARGET_ITEM') {
            return list.filter((item) => this.hasId(item)).filter((item) => this.isAllowedTarget(item));
        }

        return [];
    }

    public itemClasses(item: any): Record<string, boolean> {
        const isNetwork = this.isNetworkType(item);
        const isPcHt = this.isPcOrHtType(item);
        const plugged = isPcHt ? this.hasNetworkEndpointConnection(item) : false;

        return {
            'is-network': isNetwork,
            'is-plugged': plugged && this.allowPcHtLinks,
        };
    }

    public connectionCount(item: any): number {
        const id = this.getItemId(item);
        if (!id) return 0;
        const conns = Array.isArray(this.pairingConnections) ? this.pairingConnections : [];

        return conns.reduce((sum, c) => {
            const fromId = Number(c?.from_device_id ?? c?.fromDeviceId ?? 0);
            const toId = Number(c?.to_device_id ?? c?.toDeviceId ?? 0);
            return sum + ((fromId === id || toId === id) ? 1 : 0);
        }, 0);
    }

    private hasId(item: any): boolean {
        const id = item?.id ?? item?.ID ?? item?.item_id;
        return id !== null && id !== undefined && String(id) !== '';
    }

    private normType(itemOrValue: any): string {
        if (typeof itemOrValue === 'string') {
            return String(itemOrValue || '').toLowerCase().replace(/[\s-]+/g, '_').trim();
        }

        const type = [
            itemOrValue?.setup_type,
            itemOrValue?.type,
            itemOrValue?.device_type,
            itemOrValue?.category,
            itemOrValue?.source_table,
            itemOrValue?.table_name,
            itemOrValue?.table,
            itemOrValue?.slot,
            itemOrValue?.display_name,
            itemOrValue?.setup_name,
            itemOrValue?.name,
            itemOrValue?.model
        ].map((value) => String(value || '').toLowerCase().replace(/[\s-]+/g, '_').trim()).filter(Boolean).join(' ');

        return type;
    }

    private isNetworkType(item: any): boolean {
        const t = this.normType(item);
        return t.includes('router') || t.includes('switch') || t.includes('modem');
    }

    private isPcOrHtType(item: any): boolean {
        const t = this.normType(item);
        return t.includes('pc') || t.includes('home_theater') || t === 'ht' || t.includes('hazimozi');
    }

    private isAllowedTarget(targetItem: any): boolean {
        const source = this.connectSourceItem;
        if (!source) return true;

        const sourceIsNetwork = this.isNetworkType(source);
        const targetIsNetwork = this.isNetworkType(targetItem);
        const sourceIsPcHt = this.isPcOrHtType(source);
        const targetIsPcHt = this.isPcOrHtType(targetItem);

        // Default: network can connect to anything (so any pair where either side is network is allowed).
        if (sourceIsNetwork || targetIsNetwork) {
            // If the target is a PC/HT and it is already connected to a network endpoint,
            // hide it unless the checkbox is enabled.
            if (!this.allowPcHtLinks && targetIsPcHt && this.hasNetworkEndpointConnection(targetItem)) {
                return false;
            }
            return true;
        }

        // Checkbox: allow PC↔PC, PC↔HT, HT↔HT
        if (this.allowPcHtLinks && sourceIsPcHt && targetIsPcHt) return true;

        // Otherwise: not allowed.
        return false;
    }

    private getItemId(item: any): number | null {
        const raw = item?.id ?? item?.ID ?? item?.item_id ?? null;
        const n = raw == null ? null : Number(raw);
        return n != null && !Number.isNaN(n) ? n : null;
    }

    private isNetworkEndpointType(type: any): boolean {
        const t = String(type || '').toLowerCase().replace(/[\s-]+/g, '_').trim();
        return t === 'router' || t === 'switch' || t === 'modem';
    }

    private hasNetworkEndpointConnection(item: any): boolean {
        const id = this.getItemId(item);
        if (!id) return false;

        const conns = Array.isArray(this.pairingConnections) ? this.pairingConnections : [];
        return conns.some((c) => {
            const fromId = Number(c?.from_device_id ?? c?.fromDeviceId ?? 0);
            const toId = Number(c?.to_device_id ?? c?.toDeviceId ?? 0);
            if (fromId !== id && toId !== id) return false;

            const otherType = fromId === id
                ? String(c?.to_device_type ?? c?.toDeviceType ?? '')
                : String(c?.from_device_type ?? c?.fromDeviceType ?? '');

            return this.isNetworkEndpointType(otherType);
        });
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

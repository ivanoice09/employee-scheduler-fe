import { Service, signal } from '@angular/core';

/**
 * This helper ensures only one time picker is open at a time.
 */
@Service()
export class TimePickerCoordinator {
    private readonly openPickerId = signal<string | null>(null);

    isOpen(id: string): boolean {
        return this.openPickerId() === id;
    }

    open(id: string): void {
        this.openPickerId.set(id);
    }

    close(id: string): void {
        if (this.openPickerId() === id) {
            this.openPickerId.set(null);
        }
    }

    closeAll(): void {
        this.openPickerId.set(null);
    }
}

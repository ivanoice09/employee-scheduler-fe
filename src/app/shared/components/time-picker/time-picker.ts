import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  forwardRef,
  inject,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import { TimePickerCoordinator } from '../../helpers/time-picker-coordinator';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export type TimeFieldType = 'hour' | 'minute';

@Component({
  selector: 'app-time-picker',
  imports: [],
  templateUrl: './time-picker.html',
  styleUrl: './time-picker.css',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TimePicker),
      multi: true,
    },
  ],
  host: {
    '(focusin)': 'focusin.emit($event)',
    '(focusout)': 'focusout.emit($event)',
  },
})
export class TimePicker implements ControlValueAccessor {
  private readonly coordinator = inject(TimePickerCoordinator);

  readonly type = input.required<TimeFieldType>();
  readonly pickerId = input.required<string>();

  readonly isOpen = signal(false);
  readonly value = model<string>('');

  readonly isDisabled = signal(false);

  readonly options = computed(() => (this.type() === 'hour' ? this.hours : this.minutes));

  readonly hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));

  readonly minutes = ['00', '15', '30', '45'];

  private onChange: (value: string | null) => void = () => {};
  private onTouched: () => void = () => {};

  readonly popupOnTop = input(false);

  output = output<FocusEvent>();

  focusin = output<FocusEvent>();
  focusout = output<FocusEvent>();

  constructor() {
    effect(() => {
      this.isOpen.set(this.coordinator.isOpen(this.pickerId()));
    });
  }

  writeValue(value: string | null): void {
    this.value.set(value ?? '');
  }

  registerOnChange(fn: (value: string | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled.set(isDisabled);
  }

  toggle(): void {
    if (this.isDisabled()) {
      return;
    }

    if (this.isOpen()) {
      this.close();
      return;
    }

    this.onTouched();
    this.coordinator.open(this.pickerId());
  }

  select(option: string): void {
    if (this.isDisabled()) {
      return;
    }

    this.value.set(option);
    this.onChange(option);
    this.close();
  }

  onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.value.set(input.value);
    this.onChange(input.value);
  }

  close(): void {
    this.coordinator.close(this.pickerId());
  }

  onContainerClick(event: MouseEvent): void {
    event.stopPropagation();
  }

  normalizeOnBlur(event: Event): void {
    const input = event.target as HTMLInputElement;
    const raw = input.value.trim();

    if (!raw || !/^\d{1,2}$/.test(raw)) {
      this.value.set('');
      this.onChange(null);
      return;
    }

    const number = Number(raw);
    const max = this.type() === 'hour' ? 23 : 59;

    if (number < 0 || number > max) {
      this.value.set('');
      this.onChange(null);
      return;
    }

    const normalized = number.toString().padStart(2, '0');

    this.value.set(normalized);
    this.onChange(normalized);
  }

  onOutsideClick(): void {
    if (this.isOpen()) {
      this.close();
    }
  }

  onEscape(): void {
    this.close();
  }
}

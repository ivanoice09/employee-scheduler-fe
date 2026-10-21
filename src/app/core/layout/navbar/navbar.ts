import { Component, HostListener, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
  host: {
    '[class.scrolled]': 'isScrolled',
  }
})
export class Navbar {
  isScrolled = false;

  @HostListener('window:scroll')
  onWindowScroll(): void {
    this.isScrolled = window.scrollY > 0;
  }

  // =========================================
  //        BURGER BUTTON SETTINGS
  // =========================================

  menuOpen = signal(false);

  toggleMenu() {
    this.menuOpen.update(open => !open);
  }

  closeMenu() {
    this.menuOpen.set(false);
  }
}

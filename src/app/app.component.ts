import { Component } from '@angular/core';
import { NavigationEnd, Event, Router } from '@angular/router';

interface ITab {
  name: string;
  link: string;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})

export class AppComponent {
  tabs: ITab[] = [
    { name: 'Logout', link: '/login' }
  ];

  activeTab = this.tabs[0].link;
  showMenubar = false; // Add this flag

  constructor(private router: Router) {
    this.router.events.subscribe((event: Event) => {
      if (event instanceof NavigationEnd) {
        this.activeTab = event.url;
        this.showMenubar = event.url === '/map'; // Update menubar visibility
        console.log(event);
      }
    });
  }

  mapLoadedEvent(status: boolean) {
    console.log('The map loaded: ' + status);
  }
}

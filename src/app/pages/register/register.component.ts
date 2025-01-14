import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent {
  email: string = '';
  password: string = '';

  // Change private to public
  constructor(public router: Router) {}

  register() {
    console.log(`Registering with ${this.email} and ${this.password}`);
    // Logic to handle registration
    this.router.navigate(['/login']); // Navigate to login after registration
  }
}

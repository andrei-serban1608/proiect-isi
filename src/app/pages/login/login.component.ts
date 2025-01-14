import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent {
  email: string = '';
  password: string = '';

  constructor(private router: Router) {}

  login() {
    // Simulating a successful login (Replace with actual logic)
    if (this.email === 'test@test.com' && this.password === 'password') {
      localStorage.setItem('user', JSON.stringify({ email: this.email })); // Store user in localStorage
      this.router.navigate(['/map']); // Redirect to map
    } else {
      alert('Invalid credentials'); // Handle invalid credentials
    }
  }

  navigateToRegister() {
    this.router.navigate(['/register']);
  }
}
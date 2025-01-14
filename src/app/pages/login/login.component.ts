import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AngularFireDatabase } from '@angular/fire/compat/database';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent {
  email: string = '';
  password: string = '';

  constructor(private router: Router, private db: AngularFireDatabase) {}

  login() {
    this.db
      .list('users', (ref) =>
        ref.orderByChild('email').equalTo(this.email)
      )
      .valueChanges()
      .subscribe((users: any[]) => {
        if (users.length > 0 && users[0].password === this.password) {
          localStorage.setItem('user', JSON.stringify({ email: this.email })); // Store user in localStorage
          this.router.navigate(['/map']); // Redirect to map
        } else {
          alert('Invalid email or password'); // Show error
        }
      });
  }

  navigateToRegister() {
    this.router.navigate(['/register']);
  }
}
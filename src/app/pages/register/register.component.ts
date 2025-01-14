import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AngularFireDatabase } from '@angular/fire/compat/database';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
})
export class RegisterComponent {
  email: string = '';
  password: string = '';

  constructor(public router: Router, private db: AngularFireDatabase) {}

  register() {
    const userRef = this.db.list('users');
    userRef
      .valueChanges()
      .subscribe((users: any[]) => {
        const userExists = users.some((user) => user.email === this.email);

        if (userExists) {
          alert('User already exists');
        } else {
          userRef.push({ email: this.email, password: this.password });
          alert('Registration successful');
          this.router.navigate(['/login']); // Navigate to login
        }
      });
  }
}
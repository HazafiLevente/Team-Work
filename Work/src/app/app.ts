import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import {FormsModule, ReactiveFormsModule} from "@angular/forms";

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ReactiveFormsModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  name = '';
}


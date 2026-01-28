import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import {HeaderComponent} from './Components/header/header.component';
import {SearchbarComponent} from './Components/Home/searchbar/searchbar.component';
import {ProductlistComponent} from './Components/Home/ProductParts/productlist/productlist.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HeaderComponent, SearchbarComponent, ProductlistComponent,],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('Setup-Configurator');
}

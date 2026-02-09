import {
  AfterViewInit,
  Component,
  ElementRef,
  Inject,
  ViewChild
} from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';

declare global {
  interface Window {
    googleTranslateElementInit?: () => void;
    google?: any;
  }
}

@Component({
  selector: 'app-google-translate',
  standalone: true,
  imports: [CommonModule],
  template: `<div #host id="google_translate_element"></div>`,
  styleUrls: ['./google-translate.component.css']
})
export class GoogleTranslateComponent implements AfterViewInit {

  @ViewChild('host', { static: true })
  host!: ElementRef<HTMLDivElement>;

  private static scriptLoaded = false;

  constructor(@Inject(DOCUMENT) private document: Document) {}

  ngAfterViewInit(): void {
    // SSR / prerender safe
    if (typeof window === 'undefined') return;

    // callback ugyanaz, mint az eredeti JS-ben
    window.googleTranslateElementInit = () => {
      if (!window.google?.translate) return;

      // 🔥 ne duplikáljon hot reloadnál
      this.host.nativeElement.innerHTML = '';

      new window.google.translate.TranslateElement(
        {
          pageLanguage: 'hu',
          layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE
        },
        'google_translate_element'
      );
    };

    // Script csak egyszer töltődjön be
    if (!GoogleTranslateComponent.scriptLoaded) {
      const script = this.document.createElement('script');
      script.type = 'text/javascript';
      script.src =
        'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
      script.async = true;
      script.defer = true;

      this.document.body.appendChild(script);
      GoogleTranslateComponent.scriptLoaded = true;
    } else {
      // ha már megvan a script, azonnal init
      window.googleTranslateElementInit();
    }
  }
}

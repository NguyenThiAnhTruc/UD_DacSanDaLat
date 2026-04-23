import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-splash',
  templateUrl: './splash.page.html',
  styleUrls: ['./splash.page.scss'],
  standalone: false
})
export class SplashPage implements OnInit {
  private router = inject(Router);


  ngOnInit() {
    // Tự động chuyển sang trang login sau 3 giây
    setTimeout(() => {
      this.router.navigate(['/login'], { replaceUrl: true });
    }, 3000);
  }

}

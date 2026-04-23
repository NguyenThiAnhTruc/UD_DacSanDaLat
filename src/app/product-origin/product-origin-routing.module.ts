import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ProductOriginPage } from './product-origin.page';

const routes: Routes = [
  {
    path: '',
    component: ProductOriginPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ProductOriginPageRoutingModule {}

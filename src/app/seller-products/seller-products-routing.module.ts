import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SellerProductsPage } from './seller-products.page';

const routes: Routes = [
  {
    path: '',
    component: SellerProductsPage,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SellerProductsPageRoutingModule {}

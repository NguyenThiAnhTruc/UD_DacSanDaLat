import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SellerOrdersPage } from './seller-orders.page';

const routes: Routes = [
  {
    path: '',
    component: SellerOrdersPage,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SellerOrdersPageRoutingModule {}

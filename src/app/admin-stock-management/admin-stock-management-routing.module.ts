import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AdminStockManagementPage } from './admin-stock-management.page';

const routes: Routes = [
  {
    path: '',
    component: AdminStockManagementPage,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AdminStockManagementPageRoutingModule {}

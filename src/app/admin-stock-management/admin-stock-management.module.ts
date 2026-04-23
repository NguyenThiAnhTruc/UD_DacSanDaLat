import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { AdminStockManagementPageRoutingModule } from './admin-stock-management-routing.module';
import { AdminStockManagementPage } from './admin-stock-management.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AdminStockManagementPageRoutingModule,
  ],
  declarations: [AdminStockManagementPage],
})
export class AdminStockManagementPageModule {}

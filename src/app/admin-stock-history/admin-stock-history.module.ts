import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { AdminStockHistoryPageRoutingModule } from './admin-stock-history-routing.module';
import { AdminStockHistoryPage } from './admin-stock-history.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AdminStockHistoryPageRoutingModule,
  ],
  declarations: [AdminStockHistoryPage],
})
export class AdminStockHistoryPageModule {}

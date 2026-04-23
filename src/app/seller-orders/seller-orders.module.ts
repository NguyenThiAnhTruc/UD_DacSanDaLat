import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { SellerOrdersPageRoutingModule } from './seller-orders-routing.module';
import { SellerOrdersPage } from './seller-orders.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    SellerOrdersPageRoutingModule,
  ],
  declarations: [SellerOrdersPage],
})
export class SellerOrdersPageModule {}

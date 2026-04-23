import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ProductOriginPageRoutingModule } from './product-origin-routing.module';

import { ProductOriginPage } from './product-origin.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ProductOriginPageRoutingModule
  ],
  declarations: [ProductOriginPage]
})
export class ProductOriginPageModule {}

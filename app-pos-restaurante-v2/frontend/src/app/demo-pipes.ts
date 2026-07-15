import { Pipe, PipeTransform } from '@angular/core';
import { Order, Reservation, RestaurantTable } from './models';

@Pipe({name: 'filterToday', standalone: true})
export class FilterTodayPipe implements PipeTransform { transform(items: Reservation[], today: string): Reservation[] { return items.filter(r => r.date === today); } }

@Pipe({name: 'statusCount', standalone: true})
export class StatusCountPipe implements PipeTransform { transform(items: RestaurantTable[], status: string): number { return items.filter(t => t.status === status).length; } }

@Pipe({name: 'guestSum', standalone: true})
export class GuestSumPipe implements PipeTransform { transform(items: Reservation[]): number { return items.reduce((s, r) => s + r.guests, 0); } }

@Pipe({name: 'areaCount', standalone: true})
export class AreaCountPipe implements PipeTransform { transform(items: RestaurantTable[], area: string): number { return items.filter(t => t.area === area).length; } }

@Pipe({name: 'areaTables', standalone: true})
export class AreaTablesPipe implements PipeTransform { transform(items: RestaurantTable[], area: string): RestaurantTable[] { return items.filter(t => t.area === area); } }

@Pipe({name: 'orderStatus', standalone: true})
export class OrderStatusPipe implements PipeTransform { transform(items: Order[], status: string): Order[] { return items.filter(o => o.status === status); } }

@Pipe({name: 'unpaidTotal', standalone: true})
export class UnpaidTotalPipe implements PipeTransform {
  transform(items: Order[]): number { return items.filter(o => !o.paid).reduce((sum, o) => sum + o.items.reduce((s, i) => s + i.price * i.quantity, 0), 0); }
}

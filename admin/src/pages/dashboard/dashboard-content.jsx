import { Bestsellers } from './components/bestsellers';
import { Inventory } from './components/inventory';
import { InventorySummary } from './components/inventory-summary';
import { Orders } from './components/orders';
import { SalesActivity } from './components/sales-activity';
import { BookingCalendar } from './components/booking-calendar';
import { BookingsTable } from '@/pages/bookings';

export function DashboardContent() {
  return (
    <div className="flex flex-col gap-5 lg:gap-7.5">
      <div className="grid lg:grid-cols-3 gap-5 lg:gap-7.5">
        <Orders />
        <Inventory />
        <Bestsellers />
      </div>

      <div className="grid lg:grid-cols-3 gap-5 lg:gap-7.5">
        <div className="lg:col-span-2">
          <SalesActivity />
        </div>

        <div className="lg:col-span-1">
          <InventorySummary />
        </div>
      </div>

      <BookingCalendar />

      <div className="grid lg:grid-cols-1">
        <div className="lg:col-span-1">
          <BookingsTable />
        </div>
      </div>
    </div>
  );
}

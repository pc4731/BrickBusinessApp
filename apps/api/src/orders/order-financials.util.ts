import { computeOrderFinancials, lineTotalPaise, type OrderFinancials } from '@brick/utils';
import type { OrgSettings, OwnTruckCostModel } from '@brick/types';

interface OrderLike {
  orderType: 'DIRECT' | 'STOCK';
  qtyOrdered: number;
  qtyDelivered: number | null;
  purchasePricePerBrickPaise: number | null;
  sellingPricePerBrickPaise: number;
  truckType: 'OWN' | 'HIRED';
  truckChargesPaise: number;
  isGst: boolean;
  gstRate: number;
  stockItems?: Array<{ qtyTaken: number; purchasePricePerBrickPaise: number }>;
}

/** Own-truck cost (paise) for this order under the org's configured model. */
export function ownTruckCostPaise(model: OwnTruckCostModel, qtyBricks: number): number {
  switch (model.type) {
    case 'PER_TRIP':
      return model.amountPaise;
    case 'PER_BRICK':
      return lineTotalPaise(qtyBricks, model.paisePerBrick);
    case 'NONE':
      return 0;
  }
}

/**
 * Authoritative financial summary for an order. Uses delivered quantity once a
 * delivery is recorded, else the ordered quantity. Stock-order COGS is summed
 * from the chosen batches; direct-order COGS uses the order's purchase rate.
 */
export function computeOrderSummary(
  order: OrderLike,
  settings: OrgSettings,
  interState: boolean,
): OrderFinancials {
  const qtyBricks = order.qtyDelivered ?? order.qtyOrdered;

  const stockCogsPaise =
    order.orderType === 'STOCK'
      ? (order.stockItems ?? []).reduce(
          (sum, i) => sum + lineTotalPaise(i.qtyTaken, i.purchasePricePerBrickPaise),
          0,
        )
      : undefined;

  return computeOrderFinancials({
    qtyBricks,
    purchasePricePerBrickPaise: order.purchasePricePerBrickPaise,
    sellingPricePerBrickPaise: order.sellingPricePerBrickPaise,
    truckType: order.truckType,
    hiredTruckChargesPaise: order.truckChargesPaise,
    ownTruckCostPaise:
      order.truckType === 'OWN' ? ownTruckCostPaise(settings.ownTruckCostModel, qtyBricks) : 0,
    stockCogsPaise,
    gst: { enabled: order.isGst, rateBasisPoints: order.gstRate, interState },
  });
}

/**
 * Reservation statuses that count as "active" when computing available stock.
 * Confirmed with the team 2026-07-21 (Reservation.status values: ACTIVE,
 * COMPLETED, CANCELLED) — only ACTIVE discounts from available stock.
 */
export const ACTIVE_RESERVATION_STATUSES = ['ACTIVE'];

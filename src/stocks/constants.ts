/**
 * Reservation statuses that count as "active" when computing available stock.
 * Centralized here so the pending team decision on Reservation.status values
 * (see docs/Plan de Implementacion - Alex.md, costura #2) only needs one edit.
 */
export const ACTIVE_RESERVATION_STATUSES = ['PENDING', 'ACTIVA'];

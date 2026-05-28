/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'admin' | 'guard';

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  email?: string;
}

export interface Bus {
  id: string; // Bus ID used inside QR
  driverName: string; // اسم السائق
  licensePlate: string; // رقم اللوحة
  phone: string; // رقم الهاتف
  model: string; // موديل الحافلة
  status: 'inside' | 'outside'; // حالة الحافلة حالياً
}

export interface ScanLog {
  id: string;
  busId: string;
  driverName: string;
  licensePlate: string;
  action: 'entry' | 'exit'; // دخول / خروج
  timestamp: string; // تاريخ ووقت الحركة
  guardId: string;
  guardName: string; // اسم الحارس الذي قام بالمسح
}

export interface DashboardStats {
  busesInsideCount: number;
  totalMovementsToday: number;
  entriesToday: number;
  exitsToday: number;
}

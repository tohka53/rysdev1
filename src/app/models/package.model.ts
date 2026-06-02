export interface Package {
  id: number;
  name: string;
  description: string;
  price: number;
  discount: number;
  finalPrice: number;
  therapies: string[];
  sessionsCount: number;
  validityDays: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PackagePurchase {
  id: number;
  userId: number;
  packageId: number;
  paymentMethod: 'transfer' | 'card';
  amount: number;
  receiptImage: string; // Base64 string
  status: 'pending' | 'validated' | 'rejected';
  purchaseDate: Date;
  validatedBy?: number;
  validatedAt?: Date;
  rejectionReason?: string;
  // Datos del usuario para facilitar la consulta
  userName: string;
  userEmail: string;
  // Datos del paquete
  packageName: string;
}

export interface UserPackage {
  id: number;
  userId: number;
  packageId: number;
  purchaseId: number;
  sessionsRemaining: number;
  totalSessions: number;
  validUntil: Date;
  isActive: boolean;
  assignedAt: Date;
  lastSessionDate?: Date;
  // Información adicional
  packageName: string;
  therapies: string[];
}
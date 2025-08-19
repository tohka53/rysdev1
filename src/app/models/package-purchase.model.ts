export interface PackagePurchase {
  id: number;
  userId: number;
  packageId: number;
  paymentMethod: 'transfer' | 'deposit' | 'credit_card' | 'debit_card';
  amount: number;
  receiptImage: string; // Base64 string
  status: 'pending' | 'approved' | 'rejected';
  purchaseDate: Date;
  validatedBy?: number; // Admin ID
  validatedAt?: Date;
  assignmentDate?: Date;
  remainingSessions?: number;
  expiresAt?: Date;
  package?: Package;
  user?: any;
}
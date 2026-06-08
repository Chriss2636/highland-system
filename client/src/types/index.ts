export interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  type: 'buyer' | 'seller';
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  createdAt: string;
}

export type ClientFormData = Omit<Client, 'id' | 'createdAt'>;
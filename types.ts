
export interface Component {
  code: string;
  name: string;
  ratio: number;
  unit: string;
}

export interface Product {
  code: string;
  name: string;
  unit: string;
  components: Component[];
}

export interface SelectedProduct {
  code: string;
  name: string;
  quantity: number;
  unit: string;
  type: 'production' | 'packaging';
}

export interface CalculationResult {
  code: string;
  name: string;
  unit: string;
  totalQuantity: number;
  packageWeight?: number;
  totalKg?: number;
  usedIn: {
    productName: string;
    quantity: number;
    amount: number;
    unit: string;
  }[];
}

export enum AppTab {
  PRODUCTION = 'production',
  PACKAGING = 'packaging',
  SEARCH = 'search',
  WEIGHTS = 'weights',
  PRODUCTS = 'products'
}

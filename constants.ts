import { Currency } from './types';

export const INITIAL_BALANCES = {
  [Currency.EGP]: 0,
  [Currency.USD]: 0,
  [Currency.EUR]: 0,
  [Currency.BANK_DEBT]: 0,
  [Currency.SH_ACCOUNT]: 0,
};

export const MOCK_DATA = `01/10/2023,Alpha Corp,INV-001,Receivable,5000,USD,transfer,01/10/2023
05/10/2023,Beta Supply,INV-002,Payable,20000,EGP,cheque,05/10/2023
10/10/2023,Gamma Ltd,INV-003,Receivable,1200,EUR,cash,10/10/2023
15/10/2023,Office Rent,INV-004,Payable,1500,USD,transfer,15/10/2023`;
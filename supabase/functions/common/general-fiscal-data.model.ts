export type GeneralFiscalData = {
  pib: string;
  venueName: string;
  address: string;
  city: string;
  municipality: string;
  buyerId: string;
  Requested: string;
  type: string;
  totalText: string;
  total: number;
  counterByTransactionType: number;
  totalCounter: number;
  receiptCounterExtension: string;
  tequestedSignedCounter: string;
  signedBy: string;
  pfrTime: string;
};

export const fiscalFieldNameMap: { [key: string]: string } = {
  ПИБ: "pib",
  "Име продајног места": "venueName",
  Адреса: "address",
  Град: "city",
  Општина: "municipality",
  "ИД купца": "buyerId",
  Затражио: "requested",
  Врста: "type",
  "Укупан износ": "totalText",
  "Бројач по врсти трансакције": "counterByTransactionType",
  "Бројач укупног броја": "totalCounter",
  "Екстензија бројача рачуна": "receiptCounterExtension",
  "Затражио - Потписао - Бројач": "requestedSignedCounter",
  Потписао: "signedBy",
  "ПФР време (временска зона сервера)": "pfrTime",
};

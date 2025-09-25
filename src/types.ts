export interface AwesomeAPIResponse {
  USDBRL: {
    code: string;
    codein: string;
    name: string;
    high: string;
    low: string;
    varBid: string;
    pctChange: string;
    bid: string;
    ask: string;
    timestamp: string;
    create_date: string;
  };
}

export interface AppConfig {
  threshold: number;
  lastNotification?: string;
  created: string;
  lastCheck?: string;
}

export interface CurrencyRate {
  ask: number;
  bid: number;
  high: number;
  low: number;
  timestamp: number;
  name: string;
}

export interface NotificationOptions {
  title: string;
  message: string;
  sound?: string;
}

export interface MonitorStatus {
  currentRate: number;
  threshold: number;
  aboveTarget: boolean;
  lastCheck: string;
  nextCheck: string;
}

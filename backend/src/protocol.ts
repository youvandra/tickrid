export type DeviceHello = {
  type: "hello";
  device_id: string;
  fw?: string;
  pairs?: string[];
  rotation_interval?: number;
};

export type DevicePing = {
  type: "ping";
  ts?: number;
};

export type DeviceToServer = DeviceHello | DevicePing;

export type ServerConfig = {
  type: "config";
  device_id: string;
  pairs: string[];
  rotation_interval: number;
};

export type ServerPrice = {
  type: "price";
  pair: string;
  price: number;
  change: number;
  ts: number;
  interval_sec?: number;
  history?: number[];
};

export type ServerError = {
  type: "error";
  message: string;
};

export type ServerToDevice = ServerConfig | ServerPrice | ServerError;

export type ConfigPushMessage = {
  device_id: string;
  pairs: string[];
  rotation_interval: number;
};

export type PricePubSubMessage = {
  pair: string;
  price: number;
  change: number;
  ts: number;
  interval_sec?: number;
  history?: number[];
};

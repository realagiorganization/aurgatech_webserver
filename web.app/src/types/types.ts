export interface User {
  id: string;
  email: string;
  name: string;
  uid: string;
  token: string;
  createdAt: string;
  loginAt: Date;
  type: 'main' | 'sub';
  status: 'active' | 'disabled' | 'deleted' | 'pending' | 'accepted';
  parentId?: string; // For sub-accounts, references the main account
}

export interface Device {
  id: number;
  did: string;
  name: string;
  type: string;
  status: 'online' | 'offline';
  macAddress: string;
  ipAddress: string;
  isUSB: boolean;
  isHID: boolean;
  cloudType: number;
  flags: number;
  lastSeen: string;
  assignedTo?: string; // User ID of the sub-account this device is assigned to
  firmwareVersion?: number;
  hasFirmwareUpdate?: boolean; // Indicates if a firmware update is available
  isSubDevice?: boolean;
}

export interface SubAccount extends User {
  devices: string[]; // Array of device IDs assigned to this sub-account
}

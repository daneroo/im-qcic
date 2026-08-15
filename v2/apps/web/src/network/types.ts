export interface HttpProbe {
  url: string;
  status: number | null;
  ms: number | null;
}

export interface Heartbeat {
  hosts: number;
  delaySeconds: number;
  lastText: string;
  lastHost: string;
}

export interface NetworkFixture {
  probes: HttpProbe[];
  heartbeat: Heartbeat;
}

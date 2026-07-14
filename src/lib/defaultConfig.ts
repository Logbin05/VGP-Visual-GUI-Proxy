import type { ProxyConfig } from "../types/vgp";
export function defaultProxyConfig(): ProxyConfig {
  return {
    server: {
      host: "0.0.0.0",
      port: 1080,
      protocol: "socks5",
      bind_interface: null,
    },
    security: {
      authentication: {
        enabled: false,
        method: "noauth",
        users: [],
        users_file: null,
        token: null,
      },
    },
    timeouts: {
      connect_sec: 10,
      read_sec: 30,
      write_sec: 30,
      idle_sec: 300,
      handshake_sec: null,
    },
    limits: {
      max_connections: 2048,
      max_connections_per_ip: null,
      rate_limit_rps: null,
      bandwidth_limit_mbps: null,
      max_request_size: null,
    },
    tls: null,
    network: {
      tcp_nodelay: true,
      keep_alive: true,
      keep_alive_interval_sec: null,
      reuse_port: false,
      send_buffer_size: null,
      recv_buffer_size: null,
    },
    dns: null,
    logging: {
      level: "info",
      format: "text",
      output: "stdout",
      file_path: null,
      access_log: null,
    },
    metrics: {
      enabled: false,
      host: "127.0.0.1",
      port: 9090,
      path: null,
    },
    socks5: { udp_associate: false, bind_enabled: false },
    http: null,
    shadowsocks: null,
    transparent: null,
    reverse: null,
  };
}

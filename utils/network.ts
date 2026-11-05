import os from 'os';

export interface NetworkAddressInfo {
    interfaceName: string;
    address: string;
    family: string;
}

/**
 * Retrieves non-internal IPv4 network interfaces on the host machine.
 */
export function getLocalIpAddresses(): NetworkAddressInfo[] {
    const interfaces = os.networkInterfaces();
    const addresses: NetworkAddressInfo[] = [];

    for (const interfaceName of Object.keys(interfaces)) {
        const adapterList = interfaces[interfaceName];
        if (!adapterList) continue;

        for (const adapter of adapterList) {
        // Filter out internal/loopback addresses and focus on IPv4
        // Note: In Node.js 18+, adapter.family returns 'IPv4' or 'IPv6'
        // In older versions, it returns 4 or 6.
        const isIPv4 = adapter.family === 'IPv4' || (adapter.family as unknown as number) === 4;

        if (isIPv4 && !adapter.internal) {
            addresses.push({
            interfaceName,
            address: adapter.address,
            family: 'IPv4',
            });
        }
        }
    }

    return addresses;
}

/**
 * Returns the primary network IP address (prefers Wi-Fi or Ethernet over virtual adapters).
 */
export function getPrimaryLocalIp(): string | null {
    const addresses = getLocalIpAddresses();

    if (addresses.length === 0) {
        return null;
    }

    // Prioritize active physical network interface names
    const preferredInterfaces = ['eth', 'en', 'wlan', 'wi-fi', 'ethernet'];
    
    const primary = addresses.find((item) =>
        preferredInterfaces.some((name) => item.interfaceName.toLowerCase().includes(name))
    );

    return primary ? primary.address : addresses[0].address;
}
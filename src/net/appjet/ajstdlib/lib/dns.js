/**
 * @fileOverview Library for DNS operations such as looking up IP addresses and hostnames.
 * These are similar to the PHP functions gethostbyname() and gethostbyaddr().
 */

/**
 * Converts a hostname string (such as "appjet.com") to an IP address,
 * returned as a string (such as "74.86.117.106").  This function is the inverse
 * of gethostbyaddr().
 *
 * @param {string} hostname The DNS name to resolve (example: "www.appjet.com").
 * @return {string} the IP address corresponding to the given hostname, or undefined.
 *
 */
function gethostbyname(hostname) {
  return appjet._native.dns_gethostbyname(hostname);
}

/**
 * Converts an IP address string (such as "74.86.117.106") to a hostname
 * (such as "appjet.com").  This function is the inverse of gethostbyname().
 *
 * @param {string} ipaddr The IP address to resolve (example: "74.86.117.106").
 * @return {string} the hostname corresponding to the given ip address, or undefined.
 *
 */
function gethostbyaddr(ipaddr) {
  return appjet._native.dns_gethostbyaddr(ipaddr);
}


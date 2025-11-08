/**
 * Cleanup Utilities
 * Handles message lifetime calculation and cleanup logic
 */

const BASE_LIFETIME = 600; // 600 seconds (10 minutes)

/**
 * Calculate message lifetime based on recent message activity
 * Formula: base_lifetime / (1 + messages_sent_last_5min / 10)
 * 
 * @param {string} username - Username of the sender
 * @param {Map} messageCounts - Map tracking message counts per user
 * @returns {number} Calculated lifetime in seconds
 */
function calculateLifetime(username, messageCounts) {
  const now = Date.now();
  const fiveMinutesAgo = now - (5 * 60 * 1000); // 5 minutes in milliseconds

  // Get or initialize message counts for this user
  if (!messageCounts.has(username)) {
    messageCounts.set(username, []);
  }

  const userMessages = messageCounts.get(username);

  // Filter messages from last 5 minutes
  const recentMessages = userMessages.filter(
    entry => entry.timestamp >= fiveMinutesAgo
  );

  // Count messages sent in last 5 minutes
  const messagesSentLast5Min = recentMessages.length;

  // Add current message timestamp
  recentMessages.push({ timestamp: now });

  // Update stored message counts (only keep last 5 minutes worth)
  messageCounts.set(username, recentMessages);

  // Calculate lifetime using the formula
  const lifetime = BASE_LIFETIME / (1 + messagesSentLast5Min / 10);

  // Ensure minimum lifetime of 1 second
  return Math.max(1, Math.floor(lifetime));
}

/**
 * Start periodic cleanup of old message count entries
 * This prevents the messageCounts map from growing indefinitely
 */
function startCleanup(messageCounts, intervalMs = 60000) {
  setInterval(() => {
    const now = Date.now();
    const fiveMinutesAgo = now - (5 * 60 * 1000);

    // Clean up old entries from messageCounts
    messageCounts.forEach((entries, username) => {
      const filtered = entries.filter(entry => entry.timestamp >= fiveMinutesAgo);
      if (filtered.length === 0) {
        messageCounts.delete(username);
      } else {
        messageCounts.set(username, filtered);
      }
    });
  }, intervalMs);
}

module.exports = {
  calculateLifetime,
  startCleanup,
  BASE_LIFETIME
};


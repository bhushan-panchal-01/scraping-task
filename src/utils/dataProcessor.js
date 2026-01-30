const logger = require('./logger');

/**
 * Calculate average views from an array of posts
 * @param {Array} posts - Array of posts with views property
 * @returns {number|null} Average views, or null if no valid data
 */
function calculateAverageViews(posts) {
  if (!posts || posts.length === 0) {
    return null;
  }

  const validPosts = posts.filter(post => {
    const views = Number(post.views);
    return !isNaN(views) && views >= 0;
  });

  if (validPosts.length === 0) {
    return null;
  }

  const totalViews = validPosts.reduce((sum, post) => sum + Number(post.views), 0);
  const average = Math.round(totalViews / validPosts.length);

  return average;
}

/**
 * Filter to get the last N posts by date
 * @param {Array} posts - Array of posts with postedDate
 * @param {number} count - Number of posts to return
 * @returns {Array} Most recent N posts
 */
function filterLast10Posts(posts, count = 10) {
  if (!posts || posts.length === 0) {
    return [];
  }

  // Sort by posted date (most recent first)
  const sortedPosts = [...posts].sort((a, b) => {
    const dateA = new Date(a.postedDate);
    const dateB = new Date(b.postedDate);
    return dateB - dateA;
  });

  return sortedPosts.slice(0, count);
}

/**
 * Deduplicate posts - identify which are new and which need updating
 * @param {Array} existingPosts - Posts already in data file (CSV/Excel)
 * @param {Array} newPosts - Newly scraped posts
 * @returns {Object} {toAppend: [], toUpdate: []}
 */
function deduplicatePosts(existingPosts, newPosts) {
  const toAppend = [];
  const toUpdate = [];

  if (!newPosts || newPosts.length === 0) {
    return { toAppend, toUpdate };
  }

  const existingPostLinks = new Set(
    existingPosts.map(post => post.postLink?.toString().trim())
  );

  newPosts.forEach(post => {
    const postLink = post.postLink?.toString().trim();
    if (!postLink) {
      logger.warn('Post without postLink encountered, skipping');
      return;
    }

    if (existingPostLinks.has(postLink)) {
      toUpdate.push(post);
    } else {
      toAppend.push(post);
    }
  });

  logger.info(`Deduplication: ${toAppend.length} new posts, ${toUpdate.length} to update`);
  return { toAppend, toUpdate };
}

/**
 * Normalize post data - ensure all required fields exist
 * @param {Object} post - Raw post data
 * @param {string} username - Influencer username
 * @param {string} platform - Platform name (instagram, tiktok)
 * @returns {Object} Normalized post
 */
function normalizePost(post, username, platform) {
  return {
    username: username,
    platform: platform || post.platform || '',
    postLink: post.postLink || post.url || '',
    postedDate: post.postedDate || post.date || new Date().toISOString(),
    comments: post.comments !== undefined ? Number(post.comments) : (post.share !== undefined ? Number(post.share) : 0), // Use comments (share was used as proxy for comments)
    likes: post.likes !== undefined ? Number(post.likes) : 0,
  };
}

module.exports = {
  calculateAverageViews,
  filterLast10Posts,
  deduplicatePosts,
  normalizePost,
};

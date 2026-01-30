/**
 * Abstract base class for file writers
 */
class BaseWriter {
  /**
   * Update average views for influencers
   * @param {Array} updates - Array of {username, platform, averageViews, rowNumber}
   * @returns {Promise<void>}
   */
  async updateAverageViews(updates) {
    throw new Error('updateAverageViews must be implemented by subclass');
  }

  /**
   * Append new posts to data source
   * @param {Array} posts - Array of post objects
   * @returns {Promise<void>}
   */
  async appendPosts(posts) {
    throw new Error('appendPosts must be implemented by subclass');
  }

  /**
   * Update existing posts in data source
   * @param {Array} posts - Array of post objects with updated data
   * @returns {Promise<void>}
   */
  async updateExistingPosts(posts) {
    throw new Error('updateExistingPosts must be implemented by subclass');
  }
}

module.exports = BaseWriter;

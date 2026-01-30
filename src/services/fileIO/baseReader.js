/**
 * Abstract base class for file readers
 */
class BaseReader {
  /**
   * Read influencers from data source
   * @returns {Promise<Array>} Array of influencer objects with {username, platform, averageViews}
   */
  async readInfluencers() {
    throw new Error('readInfluencers must be implemented by subclass');
  }

  /**
   * Read existing posts from data source
   * @returns {Promise<Array>} Array of post objects
   */
  async readExistingPosts() {
    throw new Error('readExistingPosts must be implemented by subclass');
  }
}

module.exports = BaseReader;

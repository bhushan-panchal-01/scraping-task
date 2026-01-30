const BaseScraper = require('./baseScraper');
const ScraperStrategyFactory = require('./strategies/scraperStrategyFactory');
const config = require('../../config/config');

class InstagramScraper extends BaseScraper {
  constructor() {
    // Create appropriate strategy based on configuration
    const method = config.scraping.instagram.method;
    const strategy = ScraperStrategyFactory.create('instagram', method);

    super('Instagram', strategy);
  }
}

module.exports = InstagramScraper;

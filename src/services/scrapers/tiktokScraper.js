const BaseScraper = require('./baseScraper');
const ScraperStrategyFactory = require('./strategies/scraperStrategyFactory');
const config = require('../../config/config');

class TikTokScraper extends BaseScraper {
  constructor() {
    // Create appropriate strategy based on configuration
    const method = config.scraping.tiktok.method;
    const strategy = ScraperStrategyFactory.create('tiktok', method);

    super('TikTok', strategy);
  }
}

module.exports = TikTokScraper;
